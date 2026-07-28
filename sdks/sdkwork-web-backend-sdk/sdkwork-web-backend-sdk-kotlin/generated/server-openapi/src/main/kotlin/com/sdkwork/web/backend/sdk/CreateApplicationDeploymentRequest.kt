package com.sdkwork.web.backend.sdk

data class CreateApplicationDeploymentRequest(
    val deployType: Int? = null,
    val environment: String? = null,
    val versionTag: String? = null,
    val commitHash: String? = null,
    val sourceRef: String? = null,
    val artifactDriveUri: String? = null,
    val artifactSize: String? = null,
    val artifactHash: String? = null
)
