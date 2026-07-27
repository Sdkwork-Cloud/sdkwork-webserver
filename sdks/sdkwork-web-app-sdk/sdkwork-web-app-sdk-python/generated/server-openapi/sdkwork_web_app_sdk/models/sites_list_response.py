from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .page_info import PageInfo
    from .site_response import SiteResponse


@dataclass
class SitesListResponse:
    code: int
    data: Any
    trace_id: str
