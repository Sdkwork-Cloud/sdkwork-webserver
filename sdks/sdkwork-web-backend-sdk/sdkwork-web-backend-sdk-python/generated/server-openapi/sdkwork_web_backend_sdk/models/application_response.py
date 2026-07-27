from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ApplicationResponse:
    id: str
    name: str
    slug: str
    application_type: str
    site_type: int
    status: int
    created_at: str
    updated_at: str
    description: Optional[str] = None
    runtime_config: Optional[Dict[str, Any]] = None
