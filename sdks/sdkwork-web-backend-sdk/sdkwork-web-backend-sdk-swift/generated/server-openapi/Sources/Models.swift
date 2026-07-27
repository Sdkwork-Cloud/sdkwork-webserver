import Foundation

public struct ProblemDetail: Codable {
    public let type: String?
    public let title: String?
    public let status: Int?
    public let detail: String?
    public let instance: String?
    public let code: Int?
    public let traceId: String?
    public let errors: [FieldError]?


    public init(type: String? = nil, title: String? = nil, status: Int? = nil, detail: String? = nil, instance: String? = nil, code: Int? = nil, traceId: String? = nil, errors: [FieldError]? = nil) {
        self.type = type
        self.title = title
        self.status = status
        self.detail = detail
        self.instance = instance
        self.code = code
        self.traceId = traceId
        self.errors = errors
    }
}

public struct CreateNginxConfigRequest: Codable {
    public let configType: Int?
    public let configName: String?
    public let configContent: String?
    public let siteId: String?
    public let domainId: String?


    public init(configType: Int? = nil, configName: String? = nil, configContent: String? = nil, siteId: String? = nil, domainId: String? = nil) {
        self.configType = configType
        self.configName = configName
        self.configContent = configContent
        self.siteId = siteId
        self.domainId = domainId
    }
}

public struct UpdateNginxConfigRequest: Codable {
    public let configContent: String?
    public let configName: String?


    public init(configContent: String? = nil, configName: String? = nil) {
        self.configContent = configContent
        self.configName = configName
    }
}

public struct CreateApplicationRequest: Codable {
    public let name: String?
    public let slug: String?
    public let description: String?
    public let applicationType: String?
    public let siteType: Int?
    public let runtimeConfig: [String: Any]?


    public init(name: String? = nil, slug: String? = nil, description: String? = nil, applicationType: String? = nil, siteType: Int? = nil, runtimeConfig: [String: Any]? = nil) {
        self.name = name
        self.slug = slug
        self.description = description
        self.applicationType = applicationType
        self.siteType = siteType
        self.runtimeConfig = runtimeConfig
    }
}

public struct ApplicationResponse: Codable {
    public let id: String?
    public let name: String?
    public let slug: String?
    public let description: String?
    public let applicationType: String?
    public let siteType: Int?
    public let status: Int?
    public let runtimeConfig: [String: Any]?
    public let createdAt: String?
    public let updatedAt: String?


    public init(id: String? = nil, name: String? = nil, slug: String? = nil, description: String? = nil, applicationType: String? = nil, siteType: Int? = nil, status: Int? = nil, runtimeConfig: [String: Any]? = nil, createdAt: String? = nil, updatedAt: String? = nil) {
        self.id = id
        self.name = name
        self.slug = slug
        self.description = description
        self.applicationType = applicationType
        self.siteType = siteType
        self.status = status
        self.runtimeConfig = runtimeConfig
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct CreateApplicationDomainRequest: Codable {
    public let hostname: String?
    public let isPrimary: Bool?
    public let sslEnabled: Bool?
    public let sslProvider: String?


    public init(hostname: String? = nil, isPrimary: Bool? = nil, sslEnabled: Bool? = nil, sslProvider: String? = nil) {
        self.hostname = hostname
        self.isPrimary = isPrimary
        self.sslEnabled = sslEnabled
        self.sslProvider = sslProvider
    }
}

public struct ApplicationDomainResponse: Codable {
    public let id: String?
    public let hostname: String?
    public let isPrimary: Bool?
    public let isVerified: Bool?
    public let sslEnabled: Bool?
    public let sslProvider: String?
    public let status: Int?
    public let createdAt: String?


    public init(id: String? = nil, hostname: String? = nil, isPrimary: Bool? = nil, isVerified: Bool? = nil, sslEnabled: Bool? = nil, sslProvider: String? = nil, status: Int? = nil, createdAt: String? = nil) {
        self.id = id
        self.hostname = hostname
        self.isPrimary = isPrimary
        self.isVerified = isVerified
        self.sslEnabled = sslEnabled
        self.sslProvider = sslProvider
        self.status = status
        self.createdAt = createdAt
    }
}

public struct ApplicationDomainVerifyResponse: Codable {
    public let verified: Bool?
    public let verifyToken: String?


    public init(verified: Bool? = nil, verifyToken: String? = nil) {
        self.verified = verified
        self.verifyToken = verifyToken
    }
}

public struct CreateApplicationDeploymentRequest: Codable {
    public let deployType: Int?
    public let environment: String?
    public let idempotencyKey: String?


    public init(deployType: Int? = nil, environment: String? = nil, idempotencyKey: String? = nil) {
        self.deployType = deployType
        self.environment = environment
        self.idempotencyKey = idempotencyKey
    }
}

public struct ApplicationDeploymentResponse: Codable {
    public let id: String?
    public let siteId: String?
    public let status: Int?
    public let deployType: Int?
    public let createdAt: String?


    public init(id: String? = nil, siteId: String? = nil, status: Int? = nil, deployType: Int? = nil, createdAt: String? = nil) {
        self.id = id
        self.siteId = siteId
        self.status = status
        self.deployType = deployType
        self.createdAt = createdAt
    }
}

public struct CreateCertificateRequest: Codable {
    public let domainId: String?
    public let certType: Int?
    public let autoRenew: Bool?


    public init(domainId: String? = nil, certType: Int? = nil, autoRenew: Bool? = nil) {
        self.domainId = domainId
        self.certType = certType
        self.autoRenew = autoRenew
    }
}

public struct UpdateCertificateRequest: Codable {
    public let autoRenew: Bool?


    public init(autoRenew: Bool? = nil) {
        self.autoRenew = autoRenew
    }
}

public struct CertificateResponse: Codable {
    public let id: String?
    public let certName: String?
    public let domain: String?
    public let certType: Int?
    public let issuer: String?
    public let fingerprint: String?
    public let notBefore: String?
    public let notAfter: String?
    public let autoRenew: Bool?
    public let renewalStatus: Int?
    public let status: Int?
    public let createdAt: String?


    public init(id: String? = nil, certName: String? = nil, domain: String? = nil, certType: Int? = nil, issuer: String? = nil, fingerprint: String? = nil, notBefore: String? = nil, notAfter: String? = nil, autoRenew: Bool? = nil, renewalStatus: Int? = nil, status: Int? = nil, createdAt: String? = nil) {
        self.id = id
        self.certName = certName
        self.domain = domain
        self.certType = certType
        self.issuer = issuer
        self.fingerprint = fingerprint
        self.notBefore = notBefore
        self.notAfter = notAfter
        self.autoRenew = autoRenew
        self.renewalStatus = renewalStatus
        self.status = status
        self.createdAt = createdAt
    }
}

public struct CertificateDistributionResponse: Codable {
    public let serverId: String?
    public let serverName: String?
    public let host: String?
    public let desiredSyncVersion: String?
    public let appliedSyncVersion: String?
    public let status: String?
    public let lastHeartbeatAt: String?


    public init(serverId: String? = nil, serverName: String? = nil, host: String? = nil, desiredSyncVersion: String? = nil, appliedSyncVersion: String? = nil, status: String? = nil, lastHeartbeatAt: String? = nil) {
        self.serverId = serverId
        self.serverName = serverName
        self.host = host
        self.desiredSyncVersion = desiredSyncVersion
        self.appliedSyncVersion = appliedSyncVersion
        self.status = status
        self.lastHeartbeatAt = lastHeartbeatAt
    }
}

public struct NginxConfigResponse: Codable {
    public let id: String?
    public let configType: Int?
    public let configName: String?
    public let configContent: String?
    public let configHash: String?
    public let isActive: Bool?
    public let versionNo: Int?
    public let deployedAt: String?
    public let status: Int?
    public let createdAt: String?
    public let updatedAt: String?


    public init(id: String? = nil, configType: Int? = nil, configName: String? = nil, configContent: String? = nil, configHash: String? = nil, isActive: Bool? = nil, versionNo: Int? = nil, deployedAt: String? = nil, status: Int? = nil, createdAt: String? = nil, updatedAt: String? = nil) {
        self.id = id
        self.configType = configType
        self.configName = configName
        self.configContent = configContent
        self.configHash = configHash
        self.isActive = isActive
        self.versionNo = versionNo
        self.deployedAt = deployedAt
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct NginxConfigPage: Codable {
    public let items: [NginxConfigResponse]?
    public let total: String?


    public init(items: [NginxConfigResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct NginxValidateResponse: Codable {
    public let valid: Bool?
    public let errors: [[String: Any]]?


    public init(valid: Bool? = nil, errors: [[String: Any]]? = nil) {
        self.valid = valid
        self.errors = errors
    }
}

public struct NginxDeployResponse: Codable {
    public let success: Bool?
    public let configId: String?
    public let deployedAt: String?
    public let reloadResult: [String: Any]?


    public init(success: Bool? = nil, configId: String? = nil, deployedAt: String? = nil, reloadResult: [String: Any]? = nil) {
        self.success = success
        self.configId = configId
        self.deployedAt = deployedAt
        self.reloadResult = reloadResult
    }
}

public struct NginxReloadResponse: Codable {
    public let success: Bool?
    public let message: String?
    public let timestamp: String?


    public init(success: Bool? = nil, message: String? = nil, timestamp: String? = nil) {
        self.success = success
        self.message = message
        self.timestamp = timestamp
    }
}

public struct NginxStatusResponse: Codable {
    public let running: Bool?
    public let version: String?
    public let pid: Int?
    public let activeConnections: Int?
    public let configPath: String?
    public let uptime: String?


    public init(running: Bool? = nil, version: String? = nil, pid: Int? = nil, activeConnections: Int? = nil, configPath: String? = nil, uptime: String? = nil) {
        self.running = running
        self.version = version
        self.pid = pid
        self.activeConnections = activeConnections
        self.configPath = configPath
        self.uptime = uptime
    }
}

public struct CreateServerRequest: Codable {
    public let name: String?
    public let host: String?
    public let tenantScopeHash: String?
    public let sshPort: Int?


    public init(name: String? = nil, host: String? = nil, tenantScopeHash: String? = nil, sshPort: Int? = nil) {
        self.name = name
        self.host = host
        self.tenantScopeHash = tenantScopeHash
        self.sshPort = sshPort
    }
}

public struct ServerResponse: Codable {
    public let id: String?
    public let name: String?
    public let host: String?
    public let tenantScopeHash: String?
    public let sshPort: Int?
    public let status: Int?
    public let lastHeartbeatAt: String?
    public let createdAt: String?


    public init(id: String? = nil, name: String? = nil, host: String? = nil, tenantScopeHash: String? = nil, sshPort: Int? = nil, status: Int? = nil, lastHeartbeatAt: String? = nil, createdAt: String? = nil) {
        self.id = id
        self.name = name
        self.host = host
        self.tenantScopeHash = tenantScopeHash
        self.sshPort = sshPort
        self.status = status
        self.lastHeartbeatAt = lastHeartbeatAt
        self.createdAt = createdAt
    }
}

public struct CreateServerResponse: Codable {
    public let id: String?
    public let name: String?
    public let host: String?
    public let tenantScopeHash: String?
    public let sshPort: Int?
    public let status: Int?
    public let lastHeartbeatAt: String?
    public let createdAt: String?
    public let agentToken: String?


    public init(id: String? = nil, name: String? = nil, host: String? = nil, tenantScopeHash: String? = nil, sshPort: Int? = nil, status: Int? = nil, lastHeartbeatAt: String? = nil, createdAt: String? = nil, agentToken: String? = nil) {
        self.id = id
        self.name = name
        self.host = host
        self.tenantScopeHash = tenantScopeHash
        self.sshPort = sshPort
        self.status = status
        self.lastHeartbeatAt = lastHeartbeatAt
        self.createdAt = createdAt
        self.agentToken = agentToken
    }
}

public struct AgentHeartbeatRequest: Codable {
    public let agentVersion: String?
    public let nginxEnabled: Bool?
    public let activeConfigs: String?
    public let lastSyncVersion: String?


    public init(agentVersion: String? = nil, nginxEnabled: Bool? = nil, activeConfigs: String? = nil, lastSyncVersion: String? = nil) {
        self.agentVersion = agentVersion
        self.nginxEnabled = nginxEnabled
        self.activeConfigs = activeConfigs
        self.lastSyncVersion = lastSyncVersion
    }
}

public struct AgentHeartbeatResponse: Codable {
    public let serverId: String?
    public let status: Int?
    public let acknowledgedAt: String?


    public init(serverId: String? = nil, status: Int? = nil, acknowledgedAt: String? = nil) {
        self.serverId = serverId
        self.status = status
        self.acknowledgedAt = acknowledgedAt
    }
}

public struct AgentSyncResponse: Codable {
    public let serverId: String?
    public let syncVersion: String?
    public let unchanged: Bool?
    public let nginxConfigs: [AgentNginxConfigBundle]?
    public let certificates: [AgentCertificateBundle]?


    public init(serverId: String? = nil, syncVersion: String? = nil, unchanged: Bool? = nil, nginxConfigs: [AgentNginxConfigBundle]? = nil, certificates: [AgentCertificateBundle]? = nil) {
        self.serverId = serverId
        self.syncVersion = syncVersion
        self.unchanged = unchanged
        self.nginxConfigs = nginxConfigs
        self.certificates = certificates
    }
}

public struct AgentNginxConfigBundle: Codable {
    public let configId: String?
    public let domain: String?
    public let configContent: String?
    public let fingerprint: String?
    public let version: String?


    public init(configId: String? = nil, domain: String? = nil, configContent: String? = nil, fingerprint: String? = nil, version: String? = nil) {
        self.configId = configId
        self.domain = domain
        self.configContent = configContent
        self.fingerprint = fingerprint
        self.version = version
    }
}

public struct AgentCertificateBundle: Codable {
    public let certificateId: String?
    public let certName: String?
    public let fingerprint: String?
    public let fullchainPem: String?
    public let privkeyPem: String?


    public init(certificateId: String? = nil, certName: String? = nil, fingerprint: String? = nil, fullchainPem: String? = nil, privkeyPem: String? = nil) {
        self.certificateId = certificateId
        self.certName = certName
        self.fingerprint = fingerprint
        self.fullchainPem = fullchainPem
        self.privkeyPem = privkeyPem
    }
}

public struct ServerPage: Codable {
    public let items: [ServerResponse]?
    public let total: String?


    public init(items: [ServerResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct AuditLogResponse: Codable {
    public let id: String?
    public let operatorId: String?
    public let operatorType: String?
    public let action: String?
    public let targetType: String?
    public let targetId: String?
    public let targetUuid: String?
    public let ipAddress: String?
    public let changes: [String: Any]?
    public let createdAt: String?


    public init(id: String? = nil, operatorId: String? = nil, operatorType: String? = nil, action: String? = nil, targetType: String? = nil, targetId: String? = nil, targetUuid: String? = nil, ipAddress: String? = nil, changes: [String: Any]? = nil, createdAt: String? = nil) {
        self.id = id
        self.operatorId = operatorId
        self.operatorType = operatorType
        self.action = action
        self.targetType = targetType
        self.targetId = targetId
        self.targetUuid = targetUuid
        self.ipAddress = ipAddress
        self.changes = changes
        self.createdAt = createdAt
    }
}

public struct AuditLogPage: Codable {
    public let items: [AuditLogResponse]?
    public let total: String?


    public init(items: [AuditLogResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct SdkWorkApiResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkResourceData: Codable {
    public let item: [String: Any]?


    public init(item: [String: Any]? = nil) {
        self.item = item
    }
}

public struct SdkWorkPageData: Codable {
    public let items: [[String: Any]]?
    public let pageInfo: PageInfo?


    public init(items: [[String: Any]]? = nil, pageInfo: PageInfo? = nil) {
        self.items = items
        self.pageInfo = pageInfo
    }
}

public struct SdkWorkCommandData: Codable {
    public let accepted: Bool?
    public let resourceId: String?
    public let status: String?


    public init(accepted: Bool? = nil, resourceId: String? = nil, status: String? = nil) {
        self.accepted = accepted
        self.resourceId = resourceId
        self.status = status
    }
}

public struct PageInfo: Codable {
    public let mode: String?
    public let page: Int?
    public let pageSize: Int?
    public let totalItems: String?
    public let totalPages: Int?
    public let nextCursor: String?
    public let hasMore: Bool?


    public init(mode: String? = nil, page: Int? = nil, pageSize: Int? = nil, totalItems: String? = nil, totalPages: Int? = nil, nextCursor: String? = nil, hasMore: Bool? = nil) {
        self.mode = mode
        self.page = page
        self.pageSize = pageSize
        self.totalItems = totalItems
        self.totalPages = totalPages
        self.nextCursor = nextCursor
        self.hasMore = hasMore
    }
}

public struct FieldError: Codable {
    public let field: String?
    public let message: String?
    public let code: Int?


    public init(field: String? = nil, message: String? = nil, code: Int? = nil) {
        self.field = field
        self.message = message
        self.code = code
    }
}

public struct SdkWorkResourceResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SdkWorkCommandResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsDomainsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsDomainsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsDomainsVerifyResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsDeploymentsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ApplicationsDeploymentsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct CertificatesListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct CertificatesCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct CertificatesUpdateResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct CertificatesRenewResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct CertificatesDistributionListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsRetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsUpdateResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsValidateResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ConfigsDeployResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ReloadResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct StatusRetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ServersListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct ServersCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct HeartbeatResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct RetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct AuditLogsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}
