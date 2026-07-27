from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .site_response import SiteResponse


@dataclass
class SitesUpdateResponse:
    code: int
    data: Any
    trace_id: str
