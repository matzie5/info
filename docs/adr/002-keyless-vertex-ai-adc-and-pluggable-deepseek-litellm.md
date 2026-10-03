# ADR 002: Keyless Vertex AI via Application Default Credentials (ADC) and Pluggable DeepSeek Integration via ADK LiteLlm

* **Status**: Accepted
* **Date**: 2026-10-03
* **Deciders**: Lead Architect, Cloud Security Lead, AI Systems Engineer
* **Technical Story**: Eliminate static credentials across all environments, enforce European data residency, and support pluggable adversarial LLMs for cyber-defense training

---

## 1. Context and Problem Statement

Legacy iterations of generative AI platforms frequently rely on long-lived static API tokens (e.g., `GEMINI_API_KEY` stored in `.env` files or container environment variables). In high-assurance environments, this introduces critical vulnerabilities:
1. **Credential Exposure Risk**: Long-lived keys in CI/CD pipelines, container layers, and runtime memory are susceptible to exfiltration and unauthorized replication.
2. **Compliance & Data Residency Violations**: Direct Gemini Developer API calls often egress data to unpredictable regional endpoints, breaching EU General Data Protection Regulation (GDPR) and institutional data sovereignty mandates.
3. **Adversarial Realism Deficit**: In cyber-defense and cognitive resilience training (specifically Module 2: *Generative Social Engineering & Scam Resilience Lab*), defensive operators need exposure to diverse adversarial models (such as DeepSeek-V3 and DeepSeek-R1 reasoning models) that reflect real-world threat actors' tooling, while defensive scoring and adjudication must remain rigorously governed on enterprise-grade infrastructure.

---

## 2. Considered Architectural Options

### Option A: Static Environment API Keys (`GEMINI_API_KEY` & `DEEPSEEK_API_KEY`)
* **Mechanism**: Deploy containers with static keys baked into environment variables.
* **Flaws**: 
  - Violates zero-trust security architecture.
  - Keys cannot be rotated dynamically without redeploying Cloud Run revisions.
  - Lack of fine-grained IAM auditing on individual API invocations.

### Option B: Sole Reliance on Governed Google Vertex AI (No External Models)
* **Mechanism**: Enforce keyless Vertex AI for all platform features, disallowing any non-Google models.
* **Benefits**: Excellent security posture, simple IAM management, strict European data residency (`europe-west1`).
* **Shortcoming**: Fails the pedagogical requirement of Module 2. Operators cannot benchmark defensive readiness against emerging Chinese open-weight models (e.g., DeepSeek) actively deployed in global phishing campaigns.

### Option C: Keyless Vertex AI ADC for Platform Core + Secret Manager Governed `LiteLlm` for Module 2 (Selected)
* **Mechanism**:
  - **Platform Core & Defensive Models**: Authenticate through **Vertex AI Application Default Credentials (ADC)** (`GOOGLE_GENAI_USE_VERTEXAI="TRUE"`, `vertexai=True`), bound to Cloud Run's Service Account (`infosphere-engine-sa`) with least-privilege `roles/aiplatform.user`. Zero API keys exist in source code or production containers.
  - **Pluggable External Threat Actor (Module 2)**: Dynamic routing via Google ADK's `LiteLlm` model wrapper (`deepseek/deepseek-chat`, `deepseek/deepseek-reasoner`). The `DEEPSEEK_API_KEY` is provisioned in Google Cloud Secret Manager (`infosphere-deepseek-api-key`) and injected at runtime via Cloud Run Secret Manager bindings with IAM `roles/secretmanager.secretAccessor`.
  - **Defensive Judge Invariant**: The judicial scoring agent (`ResilienceCoachAgent`) **always** runs on governed Vertex AI (`gemini-2.5-pro` or `gemini-2.5-flash` with temperature `0.0`), preventing adversarial model drift or prompt injection attacks from compromising scoring integrity.

---

## 3. Decision Outcome

**Chosen Option**: **Option C (Keyless Vertex AI ADC + Governed LiteLlm DeepSeek Integration)**.

### Technical Implementation:
1. **Complete Removal of `GEMINI_API_KEY`**: All code pathways using `genai.configure(api_key=...)` or `os.environ["GEMINI_API_KEY"]` have been eliminated.
2. **Keyless Initialization**:
   ```python
   # backend/app/config.py
   os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "TRUE"
   os.environ["GOOGLE_CLOUD_PROJECT"] = settings.PROJECT_ID
   os.environ["GOOGLE_CLOUD_LOCATION"] = settings.REGION  # europe-west1
   
   # backend/app/platform/adk_runtime.py
   self._vertex_client = genai.Client(
       vertexai=True,
       project=settings.PROJECT_ID,
       location=settings.REGION,
   )
   ```
3. **Pluggable Model Resolution in ADK Runtime**:
   ```python
   def resolve_adk_model(self, model_identifier: str) -> Any:
       if model_identifier.startswith("deepseek/"):
           if not settings.DEEPSEEK_API_KEY:
               logger.warning("DEEPSEEK_API_KEY unset; falling back to Vertex AI %s", settings.FAST_MODEL)
               return settings.FAST_MODEL
           from google.adk.models.lite_llm import LiteLlm
           return LiteLlm(
               model=model_identifier,
               api_key=settings.DEEPSEEK_API_KEY,
               api_base=settings.DEEPSEEK_API_BASE,
           )
       return model_identifier
   ```
4. **Terraform Secret Manager Infrastructure**:
   - `google_secret_manager_secret.deepseek_api_key` replicated in `europe-west1`.
   - `google_secret_manager_secret_iam_member.deepseek_secret_access` grants `roles/secretmanager.secretAccessor` exclusively to `infosphere-engine-sa`.
   - Cloud Run v2 service references the secret dynamically via `value_source.secret_key_ref`.

---

## 4. Architecture & Security Flow

```mermaid
flowchart TD
    subgraph CloudRun["Cloud Run Gen2 (Service Account: infosphere-engine-sa)"]
        AR["ADKRuntimeService"]
        M2["Module 2 Scam Lab"]
        M15["Modules 1, 3, 4, 5"]
        Coach["ResilienceCoachAgent (Judge)"]
        ScamOp["ScamOperativeAgent (Attacker)"]
    end

    subgraph GCP_Security["Google Cloud Platform Security Boundary (europe-west1)"]
        ADC["Google Cloud ADC (Metadata Server)"]
        SM["Secret Manager (infosphere-deepseek-api-key)"]
        KMS["Cloud KMS CMEK (infosphere-storage-key)"]
        IAM["IAM Audit Config (DATA_READ / DATA_WRITE)"]
        Vertex["Vertex AI Platform (gemini-2.5-flash / text-embedding-004)"]
    end

    subgraph External["External Threat Actor Simulation"]
        DeepSeek["DeepSeek API Endpoint (api.deepseek.com/v1)"]
    end

    M15 -->|ADC Token| Vertex
    Coach -->|ADC Token (temp=0.0)| Vertex
    AR -->|Fetch Token| ADC
    AR -->|roles/aiplatform.user| Vertex
    M2 --> Coach
    M2 --> ScamOp
    
    ScamOp -->|Route: Vertex| Vertex
    ScamOp -->|Route: DeepSeek| AR
    AR -->|Read Secret| SM
    AR -->|LiteLlm + Secret Key| DeepSeek
```

---

## 5. Consequences & Trade-offs

### Positive Consequences
* **Zero Credential Exposure**: No API tokens exist in Git repositories, Docker images, or developer machines.
* **Audit Trail & Non-Repudiation**: Every Vertex AI call is recorded in Cloud Logging and IAM audit logs (`allServices` with `DATA_READ` / `DATA_WRITE`).
* **European Data Residency**: All Gemini inference and dense embeddings (`text-embedding-004`) are constrained within `europe-west1`.
* **Adversarial Realism**: Security trainees face attack vectors generated by state-of-the-art alternative LLMs without compromising platform security.
* **Deterministic Offline Fallbacks**: The platform gracefully degrades to deterministic local responses when disconnected from GCP or when external APIs experience outages.

### Negative Consequences & Mitigations
* **External API Dependency**: DeepSeek availability depends on external network connectivity and third-party uptime.
  - *Mitigation*: The `ADKRuntimeService` includes an automated fallback to `settings.FAST_MODEL` (`gemini-2.5-flash`) whenever `DEEPSEEK_API_KEY` is missing, invalid, or encountering API errors.
* **Latency Variance**: Calling an external endpoint through `LiteLlm` can introduce additional latency compared to Google backbone Vertex AI connections.
  - *Mitigation*: 3-state `APICircuitBreaker` prevents external latency spikes from stalling the application server threads.

---

## 6. Verification and Compliance
* Automated verification via `backend/tests/integration/test_platform_modules.py::test_m2_scam_lab_supports_deepseek_and_adk_tools`.
* Spec-vs-code validation confirmed via:
  `grep -rn "GOOGLE_GENAI_USE_VERTEXAI" backend/ terraform/` and `grep -rn "roles/aiplatform.user" terraform/`.
