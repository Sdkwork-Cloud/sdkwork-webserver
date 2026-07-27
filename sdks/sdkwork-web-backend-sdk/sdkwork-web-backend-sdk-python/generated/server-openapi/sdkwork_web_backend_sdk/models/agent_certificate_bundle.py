from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AgentCertificateBundle:
    certificate_id: str
    cert_name: str
    fingerprint: str
    fullchain_pem: str
    privkey_pem: str
