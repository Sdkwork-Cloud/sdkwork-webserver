package com.sdkwork.web.backend.sdk

data class ImportApplicationGitSourceVersionRequest(
    val versionTag: String? = null,
    val repositoryUrl: String? = null,
    val gitRef: String? = null
)
