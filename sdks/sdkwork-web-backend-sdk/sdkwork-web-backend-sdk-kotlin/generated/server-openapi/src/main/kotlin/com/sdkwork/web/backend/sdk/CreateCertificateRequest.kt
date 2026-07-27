package com.sdkwork.web.backend.sdk

data class CreateCertificateRequest(
    val domainId: String? = null,
    val certType: Int? = null,
    val autoRenew: Boolean? = null
)
