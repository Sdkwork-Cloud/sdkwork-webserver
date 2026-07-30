from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CertificateResponse:
    id: str
    cert_name: str
    status: int
    created_at: str
    domain: Optional[str] = None
    domain_id: Optional[str] = None
    cert_type: Optional[int] = None
    issuer: Optional[str] = None
    fingerprint: Optional[str] = None
    not_before: Optional[str] = None
    not_after: Optional[str] = None
    auto_renew: Optional[bool] = None
    renewal_status: Optional[int] = None
