package com.sdkwork.web.backend.sdk

data class ApplicationDomainResponse(
    val id: String? = null,
    val hostname: String? = null,
    val applicationId: String? = null,
    val applicationName: String? = null,
    val certificateCount: String? = null,
    val isPrimary: Boolean? = null,
    val isVerified: Boolean? = null,
    val sslEnabled: Boolean? = null,
    val sslProvider: String? = null,
    val status: Int? = null,
    val createdAt: String? = null
)
