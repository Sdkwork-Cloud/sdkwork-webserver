package com.sdkwork.web.backend.sdk

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.web.backend.sdk.http.HttpClient
import com.sdkwork.web.backend.sdk.api.ApplicationApi
import com.sdkwork.web.backend.sdk.api.ApplicationDomainApi
import com.sdkwork.web.backend.sdk.api.DomainApi
import com.sdkwork.web.backend.sdk.api.ApplicationSourceVersionApi
import com.sdkwork.web.backend.sdk.api.ApplicationDeploymentApi
import com.sdkwork.web.backend.sdk.api.CertificateApi
import com.sdkwork.web.backend.sdk.api.CertificateDistributionApi
import com.sdkwork.web.backend.sdk.api.NginxApi
import com.sdkwork.web.backend.sdk.api.ServerApi
import com.sdkwork.web.backend.sdk.api.AgentApi
import com.sdkwork.web.backend.sdk.api.AuditApi

open class SdkworkBackendClient {
    private val httpClient: HttpClient

    lateinit var application: ApplicationApi
    lateinit var applicationDomain: ApplicationDomainApi
    lateinit var domain: DomainApi
    lateinit var applicationSourceVersion: ApplicationSourceVersionApi
    lateinit var applicationDeployment: ApplicationDeploymentApi
    lateinit var certificate: CertificateApi
    lateinit var certificateDistribution: CertificateDistributionApi
    lateinit var nginx: NginxApi
    lateinit var server: ServerApi
    lateinit var agent: AgentApi
    lateinit var audit: AuditApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        application = ApplicationApi(httpClient)
        applicationDomain = ApplicationDomainApi(httpClient)
        domain = DomainApi(httpClient)
        applicationSourceVersion = ApplicationSourceVersionApi(httpClient)
        applicationDeployment = ApplicationDeploymentApi(httpClient)
        certificate = CertificateApi(httpClient)
        certificateDistribution = CertificateDistributionApi(httpClient)
        nginx = NginxApi(httpClient)
        server = ServerApi(httpClient)
        agent = AgentApi(httpClient)
        audit = AuditApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        application = ApplicationApi(httpClient)
        applicationDomain = ApplicationDomainApi(httpClient)
        domain = DomainApi(httpClient)
        applicationSourceVersion = ApplicationSourceVersionApi(httpClient)
        applicationDeployment = ApplicationDeploymentApi(httpClient)
        certificate = CertificateApi(httpClient)
        certificateDistribution = CertificateDistributionApi(httpClient)
        nginx = NginxApi(httpClient)
        server = ServerApi(httpClient)
        agent = AgentApi(httpClient)
        audit = AuditApi(httpClient)
    }
    fun setAuthToken(token: String): SdkworkBackendClient {
        httpClient.setAuthToken(token)
        return this
    }

    fun setAccessToken(token: String): SdkworkBackendClient {
        httpClient.setAccessToken(token)
        return this
    }

    fun setHeader(key: String, value: String): SdkworkBackendClient {
        httpClient.setHeader(key, value)
        return this
    }
}
