# backend/app/platform/rag_engine.py
import logging
import math
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CorpusChunk:
    chunk_id: str
    module_domain: str  # m1_disinfo | m2_scam | m3_deepfake | m4_osint | m5_echo
    source_id: str
    authority: str
    language: str
    title: str
    content: str
    tokens: List[str] = field(default_factory=list)
    dense_vector: Optional[np.ndarray] = None


DEFAULT_PLATFORM_CORPORA: List[Dict[str, str]] = [
    {
        "chunk_id": "M1-PSE-001",
        "module_domain": "m1_disinfo",
        "source_id": "PSE-GRID-2026-001",
        "authority": "Polskie Sieci Elektroenergetyczne (PSE)",
        "language": "en",
        "title": "Baltic-Sync HVDC Grid Telemetry & Reserve Margins",
        "content": "PSE confirms synchronous grid frequency is stable at 50.00 Hz with a 19.4% spinning reserve margin. Claims of rolling blackouts or cyber-induced transformer fires are fabricated.",
    },
    {
        "chunk_id": "M1-CERT-002",
        "module_domain": "m1_disinfo",
        "source_id": "CERT-PL-2026-114",
        "authority": "NASK / CERT Polska",
        "language": "en",
        "title": "Coordinated Inauthentic Behavior (CIB) Botnet Advisory",
        "content": "NASK identifies spoofed news domains and coordinated bot amplification targeting energy and municipal water utilities. Verify all emergency alerts via gov.pl.",
    },
    {
        "chunk_id": "M2-CERT-BEC-001",
        "module_domain": "m2_scam",
        "source_id": "ENISA-BEC-2026-01",
        "authority": "ENISA & CERT Polska Social Engineering Taxonomy",
        "language": "en",
        "title": "CEO Fraud, Urgent Wire Transfer & Lookalike Domain Indicators",
        "content": "Business Email Compromise (BEC) attacks combine artificial urgency, confidentiality demands, and lookalike typosquatted domains with DMARC=fail/softfail headers. Mandatory defense: out-of-band callback verification on a pre-registered directory number.",
    },
    {
        "chunk_id": "M2-NASK-MFA-002",
        "module_domain": "m2_scam",
        "source_id": "NASK-PHISH-2026-09",
        "authority": "CSIRT KNF / NASK",
        "language": "en",
        "title": "AiTM Reverse-Proxy Phishing & MFA Fatigue Defense",
        "content": "Adversary-in-the-Middle (AiTM) kits harvest session cookies in real time. Never approve unexpected push prompts or enter OTP codes on links delivered via SMS/chat; enforce FIDO2/WebAuthn origin-bound passkeys.",
    },
    {
        "chunk_id": "M3-C2PA-001",
        "module_domain": "m3_deepfake",
        "source_id": "C2PA-SPEC-2.1",
        "authority": "Coalition for Content Provenance and Authenticity (C2PA) & Google SynthID",
        "language": "en",
        "title": "Cryptographic Provenance Manifests & SynthID Watermark Verification",
        "content": "Authentic press media carries a signed C2PA manifest chain binding camera capture hardware to publisher signatures. Stripped EXIF/C2PA manifests combined with inconsistent specular corneal reflections, ear/hair boundary warping, or missing phonetic breath pauses indicate diffusion or voice-clone synthesis.",
    },
    {
        "chunk_id": "M4-ENISA-OSINT-001",
        "module_domain": "m4_osint",
        "source_id": "ENISA-OSINT-2026-04",
        "authority": "ENISA Personal Data Exposure & Spear-Phishing Mitigation Guide",
        "language": "en",
        "title": "Reconnaissance Attack Chains from Public Metadata & Social Graph Leaks",
        "content": "Attackers chain GPS EXIF coordinates from public photos, job-role announcements, and leaked corporate badge photos to craft high-conversion spear-phishing pretexts. Strip EXIF metadata at upload and redact phone/PESEL/IBAN identifiers via automated DLP.",
    },
    {
        "chunk_id": "M5-DSA-ALGO-001",
        "module_domain": "m5_echo",
        "source_id": "EU-DSA-ART-27-38",
        "authority": "European Commission Digital Services Act (DSA) Articles 27 & 38",
        "language": "en",
        "title": "Recommender System Transparency & Non-Profiling Feed Options",
        "content": "Under EU DSA Articles 27 and 38, platforms must disclose the main parameters of recommender systems and provide an accessible feed option not based on behavioral profiling. Engagement-maximizing weights on outrage amplify polarization and collapse ideological Shannon entropy.",
    },
]


class MultiCorpusRAGEngine:
    """
    Platform-wide Hybrid RAG Engine:
    - Lexical BM25 + Dense Cosine Similarity (Vertex AI `text-embedding-004` via keyless ADC
      with deterministic n-gram random-projection fallback in local/test mode).
    - Reciprocal Rank Fusion (RRF, k=60) scoped by `module_domain`.
    - Deterministic citation verification ensuring LLM outputs only cite retrieved `source_id`s.
    """

    def __init__(self):
        self.chunks: List[CorpusChunk] = []
        self.doc_freqs: Dict[str, int] = {}
        self.avg_doc_len: float = 1.0
        self._vertex_client = None
        self._init_vertex_embeddings()
        self._index_default_corpora()

    def _init_vertex_embeddings(self):
        if settings.GOOGLE_GENAI_USE_VERTEXAI and settings.PROJECT_ID and settings.ENVIRONMENT != "local":
            try:
                from google import genai
                self._vertex_client = genai.Client(
                    vertexai=True,
                    project=settings.PROJECT_ID,
                    location=settings.REGION,
                )
            except Exception as e:
                logger.warning("Vertex AI embedding client offline (%s); using NumPy dense fallback", e)

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return re.findall(r"[a-ząćęłńóśźż0-9_]+", text.lower())

    def compute_embedding(self, text: str, dim: int = 128) -> np.ndarray:
        if self._vertex_client and settings.ENVIRONMENT in ("staging", "prod"):
            try:
                resp = self._vertex_client.models.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    contents=text,
                )
                vec = np.array(resp.embeddings[0].values, dtype=np.float32)
                norm = np.linalg.norm(vec)
                return vec / norm if norm > 0 else vec
            except Exception as e:
                logger.debug("Vertex embedding fallback to local projection: %s", e)

        vec = np.zeros(dim, dtype=np.float32)
        for tok in self._tokenize(text):
            h = hash(tok)
            vec[abs(h) % dim] += 1.0 if (h & 1) == 0 else -1.0
            for i in range(max(0, len(tok) - 2)):
                th = hash(tok[i : i + 3])
                vec[abs(th) % dim] += 0.5 if (th & 1) == 0 else -0.5
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def _index_default_corpora(self):
        total_len = 0
        for item in DEFAULT_PLATFORM_CORPORA:
            full_text = f"{item['title']} {item['content']} {item['authority']}"
            tokens = self._tokenize(full_text)
            total_len += len(tokens)
            for ut in set(tokens):
                self.doc_freqs[ut] = self.doc_freqs.get(ut, 0) + 1
            self.chunks.append(
                CorpusChunk(
                    chunk_id=item["chunk_id"],
                    module_domain=item["module_domain"],
                    source_id=item["source_id"],
                    authority=item["authority"],
                    language=item["language"],
                    title=item["title"],
                    content=item["content"],
                    tokens=tokens,
                    dense_vector=self.compute_embedding(full_text),
                )
            )
        self.avg_doc_len = max(1.0, total_len / max(1, len(self.chunks)))

    def retrieve(
        self,
        query: str,
        module_domain: Optional[str] = None,
        top_k: int = 2,
    ) -> List[CorpusChunk]:
        candidates = [
            c for c in self.chunks if (not module_domain or c.module_domain == module_domain)
        ] or self.chunks
        q_tokens = self._tokenize(query)
        q_vec = self.compute_embedding(query)

        N = max(1, len(self.chunks))
        bm25_scores: List[Tuple[int, float]] = []
        dense_scores: List[Tuple[int, float]] = []

        for idx, c in enumerate(candidates):
            score = 0.0
            dl = max(1, len(c.tokens))
            for qt in q_tokens:
                tf = c.tokens.count(qt)
                if tf > 0:
                    df = self.doc_freqs.get(qt, 0)
                    idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
                    score += idf * ((tf * 2.5) / (tf + 1.5 * (1.0 - 0.75 + 0.75 * (dl / self.avg_doc_len))))
            bm25_scores.append((idx, score))

            c_vec = c.dense_vector
            if c_vec is not None and len(c_vec) == len(q_vec):
                sim = float(np.dot(q_vec, c_vec))
            else:
                sim = float(np.dot(q_vec, self.compute_embedding(c.content)))
            dense_scores.append((idx, sim))

        bm25_ranked = sorted(bm25_scores, key=lambda x: x[1], reverse=True)
        dense_ranked = sorted(dense_scores, key=lambda x: x[1], reverse=True)
        bm25_rank = {i: r + 1 for r, (i, _) in enumerate(bm25_ranked)}
        dense_rank = {i: r + 1 for r, (i, _) in enumerate(dense_ranked)}

        rrf_scores = [
            (idx, 1.0 / (60 + bm25_rank[idx]) + 1.0 / (60 + dense_rank[idx]))
            for idx in range(len(candidates))
        ]
        rrf_scores.sort(key=lambda x: x[1], reverse=True)
        return [candidates[idx] for idx, _ in rrf_scores[:top_k]]

    @staticmethod
    def verify_citations(text: str, retrieved: List[CorpusChunk]) -> Tuple[bool, List[str]]:
        allowed = {c.source_id for c in retrieved}
        cited = re.findall(r"\[([A-Z0-9\-]+)\]", text)
        if not cited:
            return False, []
        valid = [cid for cid in cited if cid in allowed]
        return len(valid) == len(cited) and len(valid) > 0, valid


rag_engine = MultiCorpusRAGEngine()
