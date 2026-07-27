package com.sdkwork.web.backend.sdk

data class CreateApplicationDeploymentRequest(
    val deployType: Int? = null,
    val environment: String? = null,
    val idempotencyKey: String? = null
)
