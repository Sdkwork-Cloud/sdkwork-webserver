package com.sdkwork.web.backend.sdk

data class ApplicationSourceVersionConfigSnapshot(
    val appConfigPath: String? = null,
    val deploymentConfigPath: String? = null,
    val appConfigDetected: Boolean? = null,
    val deploymentConfigDetected: Boolean? = null
)
