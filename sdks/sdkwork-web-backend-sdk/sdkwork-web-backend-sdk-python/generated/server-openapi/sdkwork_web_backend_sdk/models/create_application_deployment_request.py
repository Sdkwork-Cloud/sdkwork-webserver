from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateApplicationDeploymentRequest:
    deploy_type: Optional[int] = None
    environment: Optional[str] = None
    idempotency_key: Optional[str] = None
