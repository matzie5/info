# backend/app/platform/dlp_guardrail.py
import re
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class DLPInspectionResult:
    is_allowed: bool
    sanitized_text: str
    triggered_rule: Optional[str] = None
    pii_redactions: int = 0
    findings_by_type: Dict[str, int] = field(default_factory=dict)


class DLPGuardrailService:
    INJECTION_PATTERNS = [
        (
            "PROMPT_INJECTION_OVERRIDE",
            re.compile(
                r"(ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)|"
                r"system\s*prompt|you\s+are\s+now\s+DAN|jailbreak|"
                r"reveal\s+your\s+instructions|disregard\s+all\s+rules)",
                re.IGNORECASE,
            ),
        ),
        (
            "DANGEROUS_EXPLOIT_REQUEST",
            re.compile(
                r"(drop\s+table|union\s+select|<script\b|javascript:|rm\s+-rf\s+/|"
                r"synthesize\s+ricin|build\s+a\s+pipe\s+bomb)",
                re.IGNORECASE,
            ),
        ),
    ]

    PII_PATTERNS = [
        ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
        ("PHONE", re.compile(r"\b(?:\+?48[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}\b"), "[REDACTED_PHONE]"),
        ("PESEL_SSN", re.compile(r"\b\d{11}\b|\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_NATIONAL_ID]"),
        ("IBAN", re.compile(r"\bPL\d{2}\s?(?:\d{4}\s?){6}\b"), "[REDACTED_IBAN]"),
        ("GPS_EXIF", re.compile(r"\b\d{1,2}\.\d{4,6}°?\s*[NS],\s*\d{1,3}\.\d{4,6}°?\s*[EW]\b"), "[REDACTED_GPS_COORDS]"),
    ]

    def inspect_and_sanitize(self, raw_text: Optional[str], max_len: int = 2000) -> DLPInspectionResult:
        if not raw_text:
            return DLPInspectionResult(is_allowed=True, sanitized_text="")

        cleaned = raw_text.strip()[:max_len]
        for rule_name, pattern in self.INJECTION_PATTERNS:
            if pattern.search(cleaned):
                return DLPInspectionResult(
                    is_allowed=False,
                    sanitized_text="[BLOCKED_BY_SAFETY_GUARDRAIL]",
                    triggered_rule=rule_name,
                )

        redactions = 0
        findings: Dict[str, int] = {}
        for pii_type, pattern, replacement in self.PII_PATTERNS:
            cleaned, count = pattern.subn(replacement, cleaned)
            if count > 0:
                redactions += count
                findings[pii_type] = count

        return DLPInspectionResult(
            is_allowed=True,
            sanitized_text=cleaned,
            pii_redactions=redactions,
            findings_by_type=findings,
        )


dlp_guardrail = DLPGuardrailService()
