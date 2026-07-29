package com.sdkwork.web.app.sdk

data class ImportGitSourceVersionRequest(
    val versionTag: String? = null,
    val repositoryUrl: String? = null,
    val gitRef: String? = null
)
