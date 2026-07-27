from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ApplicationDomainVerifyResponse:
    verified: bool
    verify_token: Optional[str] = None
