from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CreateDeploymentRequest:
    deploy_type: int
    artifact_drive_uri: str
    artifact_size: str
    artifact_hash: str
    version_tag: Optional[str] = None
    commit_hash: Optional[str] = None
    source_ref: Optional[str] = None
    environment: Optional[str] = None
