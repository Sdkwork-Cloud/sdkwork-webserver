from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateDeploymentRequest:
    deploy_type: int
    version_tag: Optional[str] = None
    commit_hash: Optional[str] = None
    source_ref: Optional[str] = None
    artifact_drive_uri: Optional[str] = None
    artifact_size: Optional[str] = None
    artifact_hash: Optional[str] = None
    environment: Optional[str] = None
    idempotency_key: Optional[str] = None
