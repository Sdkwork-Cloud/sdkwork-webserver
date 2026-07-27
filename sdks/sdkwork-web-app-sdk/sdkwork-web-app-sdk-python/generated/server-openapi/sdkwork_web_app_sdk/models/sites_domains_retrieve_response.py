from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .domain_response import DomainResponse


@dataclass
class SitesDomainsRetrieveResponse:
    code: int
    data: Any
    trace_id: str
