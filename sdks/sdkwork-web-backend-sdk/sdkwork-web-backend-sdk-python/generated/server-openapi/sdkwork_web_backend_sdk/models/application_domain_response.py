from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ApplicationDomainResponse:
    id: str
    hostname: str
    is_primary: bool
    is_verified: bool
    ssl_enabled: bool
    status: int
    created_at: str
    ssl_provider: Optional[str] = None
