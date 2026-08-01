package com.sdkwork.web.app.sdk

data class IssueCertificateRequest(
    val domainIds: List<String>? = null,
    val certType: Int? = null,
    val keyAlgorithm: String? = null,
    val autoRenew: Boolean? = null
)
