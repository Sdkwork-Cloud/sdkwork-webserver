from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ApplicationDeploymentResponse:
    id: str
    site_id: str
    status: int
    deploy_type: int
    created_at: str
