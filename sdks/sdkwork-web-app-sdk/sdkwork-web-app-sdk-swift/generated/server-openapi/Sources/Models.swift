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

public struct CreateSiteRequest: Codable {
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

public struct UpdateSiteRequest: Codable {
    public let name: String?
    public let description: String?
    public let runtimeConfig: [String: Any]?


    public init(name: String? = nil, description: String? = nil, runtimeConfig: [String: Any]? = nil) {
        self.name = name
        self.description = description
        self.runtimeConfig = runtimeConfig
    }
}

public struct SiteResponse: Codable {
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

public struct SitePage: Codable {
    public let items: [SiteResponse]?
    public let total: String?
    public let page: Int?
    public let pageSize: Int?


    public init(items: [SiteResponse]? = nil, total: String? = nil, page: Int? = nil, pageSize: Int? = nil) {
        self.items = items
        self.total = total
        self.page = page
        self.pageSize = pageSize
    }
}

public struct CreateDomainRequest: Codable {
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

public struct DomainResponse: Codable {
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

public struct DomainPage: Codable {
    public let items: [DomainResponse]?
    public let total: String?


    public init(items: [DomainResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct DomainVerifyResponse: Codable {
    public let verified: Bool?
    public let method: String?
    public let token: String?


    public init(verified: Bool? = nil, method: String? = nil, token: String? = nil) {
        self.verified = verified
        self.method = method
        self.token = token
    }
}

public struct CreateDeploymentRequest: Codable {
    public let deployType: Int?
    public let versionTag: String?
    public let commitHash: String?
    public let sourceRef: String?
    public let artifactDriveUri: String?
    public let artifactSize: String?
    public let artifactHash: String?
    public let environment: String?


    public init(deployType: Int? = nil, versionTag: String? = nil, commitHash: String? = nil, sourceRef: String? = nil, artifactDriveUri: String? = nil, artifactSize: String? = nil, artifactHash: String? = nil, environment: String? = nil) {
        self.deployType = deployType
        self.versionTag = versionTag
        self.commitHash = commitHash
        self.sourceRef = sourceRef
        self.artifactDriveUri = artifactDriveUri
        self.artifactSize = artifactSize
        self.artifactHash = artifactHash
        self.environment = environment
    }
}

public struct DeploymentResponse: Codable {
    public let id: String?
    public let siteId: String?
    public let deployType: Int?
    public let versionTag: String?
    public let commitHash: String?
    public let sourceRef: String?
    public let rollbackFromDeploymentId: String?
    public let environment: String?
    public let artifactDriveUri: String?
    public let artifactSize: String?
    public let artifactHash: String?
    public let status: Int?
    public let startedAt: String?
    public let completedAt: String?
    public let durationMs: String?
    public let createdAt: String?


    public init(id: String? = nil, siteId: String? = nil, deployType: Int? = nil, versionTag: String? = nil, commitHash: String? = nil, sourceRef: String? = nil, rollbackFromDeploymentId: String? = nil, environment: String? = nil, artifactDriveUri: String? = nil, artifactSize: String? = nil, artifactHash: String? = nil, status: Int? = nil, startedAt: String? = nil, completedAt: String? = nil, durationMs: String? = nil, createdAt: String? = nil) {
        self.id = id
        self.siteId = siteId
        self.deployType = deployType
        self.versionTag = versionTag
        self.commitHash = commitHash
        self.sourceRef = sourceRef
        self.rollbackFromDeploymentId = rollbackFromDeploymentId
        self.environment = environment
        self.artifactDriveUri = artifactDriveUri
        self.artifactSize = artifactSize
        self.artifactHash = artifactHash
        self.status = status
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.durationMs = durationMs
        self.createdAt = createdAt
    }
}

public struct DeploymentPage: Codable {
    public let items: [DeploymentResponse]?
    public let total: String?


    public init(items: [DeploymentResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct CreateEnvVariableRequest: Codable {
    public let key: String?
    public let value: String?
    public let environment: String?
    public let isSecret: Bool?


    public init(key: String? = nil, value: String? = nil, environment: String? = nil, isSecret: Bool? = nil) {
        self.key = key
        self.value = value
        self.environment = environment
        self.isSecret = isSecret
    }
}

public struct EnvVariableResponse: Codable {
    public let id: String?
    public let key: String?
    public let environment: String?
    public let isSecret: Bool?
    public let createdAt: String?


    public init(id: String? = nil, key: String? = nil, environment: String? = nil, isSecret: Bool? = nil, createdAt: String? = nil) {
        self.id = id
        self.key = key
        self.environment = environment
        self.isSecret = isSecret
        self.createdAt = createdAt
    }
}

public struct EnvVariablePage: Codable {
    public let items: [EnvVariableResponse]?
    public let total: String?


    public init(items: [EnvVariableResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
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

public struct CertificatePage: Codable {
    public let items: [CertificateResponse]?
    public let total: String?


    public init(items: [CertificateResponse]? = nil, total: String? = nil) {
        self.items = items
        self.total = total
    }
}

public struct CreateHealthCheckRequest: Codable {
    public let checkType: Int?
    public let checkUrl: String?
    public let checkInterval: Int?
    public let timeoutMs: Int?
    public let retryCount: Int?


    public init(checkType: Int? = nil, checkUrl: String? = nil, checkInterval: Int? = nil, timeoutMs: Int? = nil, retryCount: Int? = nil) {
        self.checkType = checkType
        self.checkUrl = checkUrl
        self.checkInterval = checkInterval
        self.timeoutMs = timeoutMs
        self.retryCount = retryCount
    }
}

public struct HealthCheckResponse: Codable {
    public let id: String?
    public let checkType: Int?
    public let checkUrl: String?
    public let checkInterval: Int?
    public let status: Int?
    public let createdAt: String?


    public init(id: String? = nil, checkType: Int? = nil, checkUrl: String? = nil, checkInterval: Int? = nil, status: Int? = nil, createdAt: String? = nil) {
        self.id = id
        self.checkType = checkType
        self.checkUrl = checkUrl
        self.checkInterval = checkInterval
        self.status = status
        self.createdAt = createdAt
    }
}

public struct HealthCheckPage: Codable {
    public let items: [HealthCheckResponse]?
    public let total: String?


    public init(items: [HealthCheckResponse]? = nil, total: String? = nil) {
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

public struct SitesListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesRetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesUpdateResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesActivateResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesPauseResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDomainsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDomainsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDomainsRetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDomainsVerifyResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDeploymentsListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDeploymentsCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDeploymentsRetrieveResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesDeploymentsRollbackResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesEnvVariablesListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesEnvVariablesCreateResponse201: Codable {
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

public struct SitesHealthChecksListResponse: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}

public struct SitesHealthChecksCreateResponse201: Codable {
    public let code: Int?
    public let data: Any?
    public let traceId: String?


    public init(code: Int? = nil, data: Any? = nil, traceId: String? = nil) {
        self.code = code
        self.data = data
        self.traceId = traceId
    }
}
