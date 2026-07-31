package com.sdkwork.web.backend.sdk

data class CreateCertificateRequest(
    val domainIds: List<String>? = null,
    val certType: Int? = null,
    val keyAlgorithm: String? = null,
    val autoRenew: Boolean? = null
)
