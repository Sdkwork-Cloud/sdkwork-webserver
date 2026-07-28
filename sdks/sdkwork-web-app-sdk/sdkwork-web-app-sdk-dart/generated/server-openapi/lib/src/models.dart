Map<String, dynamic>? _sdkworkAsMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<dynamic>? _sdkworkAsList(dynamic value) {
  return value is List ? value : null;
}

class ProblemDetail {
  final String? type;
  final String? title;
  final int? status;
  final String? detail;
  final String? instance;
  final int? code;
  final String? traceId;
  final List<FieldError>? errors;

  ProblemDetail({
    this.type,
    this.title,
    this.status,
    this.detail,
    this.instance,
    this.code,
    this.traceId,
    this.errors
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      type: json['type']?.toString(),
      title: json['title']?.toString(),
      status: json['status'] is int ? json['status'] : null,
      detail: json['detail']?.toString(),
      instance: json['instance']?.toString(),
      code: json['code'] is int ? json['code'] : null,
      traceId: json['traceId']?.toString(),
      errors: (() {
        final list = _sdkworkAsList(json['errors']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : FieldError.fromJson(map);
      })())
            .whereType<FieldError>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'title': title,
      'status': status,
      'detail': detail,
      'instance': instance,
      'code': code,
      'traceId': traceId,
      'errors': errors?.map((item) => item.toJson()).toList(),
    };
  }
}

class CreateSiteRequest {
  final String? name;
  final String? slug;
  final String? description;
  final String? applicationType;
  final int? siteType;
  final Map<String, dynamic>? runtimeConfig;

  CreateSiteRequest({
    this.name,
    this.slug,
    this.description,
    this.applicationType,
    this.siteType,
    this.runtimeConfig
  });

  factory CreateSiteRequest.fromJson(Map<String, dynamic> json) {
    return CreateSiteRequest(
      name: json['name']?.toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      applicationType: json['applicationType']?.toString(),
      siteType: json['siteType'] is int ? json['siteType'] : null,
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'slug': slug,
      'description': description,
      'applicationType': applicationType,
      'siteType': siteType,
      'runtimeConfig': runtimeConfig,
    };
  }
}

class UpdateSiteRequest {
  final String? name;
  final String? description;
  final Map<String, dynamic>? runtimeConfig;

  UpdateSiteRequest({
    this.name,
    this.description,
    this.runtimeConfig
  });

  factory UpdateSiteRequest.fromJson(Map<String, dynamic> json) {
    return UpdateSiteRequest(
      name: json['name']?.toString(),
      description: json['description']?.toString(),
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'runtimeConfig': runtimeConfig,
    };
  }
}

class SiteResponse {
  final String? id;
  final String? name;
  final String? slug;
  final String? description;
  final String? applicationType;
  final int? siteType;
  final int? status;
  final Map<String, dynamic>? runtimeConfig;
  final String? createdAt;
  final String? updatedAt;

  SiteResponse({
    this.id,
    this.name,
    this.slug,
    this.description,
    this.applicationType,
    this.siteType,
    this.status,
    this.runtimeConfig,
    this.createdAt,
    this.updatedAt
  });

  factory SiteResponse.fromJson(Map<String, dynamic> json) {
    return SiteResponse(
      id: json['id']?.toString(),
      name: json['name']?.toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      applicationType: json['applicationType']?.toString(),
      siteType: json['siteType'] is int ? json['siteType'] : null,
      status: json['status'] is int ? json['status'] : null,
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig']),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'applicationType': applicationType,
      'siteType': siteType,
      'status': status,
      'runtimeConfig': runtimeConfig,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class SitePage {
  final List<SiteResponse>? items;
  final String? total;
  final int? page;
  final int? pageSize;

  SitePage({
    this.items,
    this.total,
    this.page,
    this.pageSize
  });

  factory SitePage.fromJson(Map<String, dynamic> json) {
    return SitePage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : SiteResponse.fromJson(map);
      })())
            .whereType<SiteResponse>()
            .toList();
      })(),
      total: json['total']?.toString(),
      page: json['page'] is int ? json['page'] : null,
      pageSize: json['pageSize'] is int ? json['pageSize'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
      'page': page,
      'pageSize': pageSize,
    };
  }
}

class CreateDomainRequest {
  final String? hostname;
  final bool? isPrimary;
  final bool? sslEnabled;
  final String? sslProvider;

  CreateDomainRequest({
    this.hostname,
    this.isPrimary,
    this.sslEnabled,
    this.sslProvider
  });

  factory CreateDomainRequest.fromJson(Map<String, dynamic> json) {
    return CreateDomainRequest(
      hostname: json['hostname']?.toString(),
      isPrimary: json['isPrimary'] is bool ? json['isPrimary'] : null,
      sslEnabled: json['sslEnabled'] is bool ? json['sslEnabled'] : null,
      sslProvider: json['sslProvider']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'hostname': hostname,
      'isPrimary': isPrimary,
      'sslEnabled': sslEnabled,
      'sslProvider': sslProvider,
    };
  }
}

class DomainResponse {
  final String? id;
  final String? hostname;
  final bool? isPrimary;
  final bool? isVerified;
  final bool? sslEnabled;
  final String? sslProvider;
  final int? status;
  final String? createdAt;

  DomainResponse({
    this.id,
    this.hostname,
    this.isPrimary,
    this.isVerified,
    this.sslEnabled,
    this.sslProvider,
    this.status,
    this.createdAt
  });

  factory DomainResponse.fromJson(Map<String, dynamic> json) {
    return DomainResponse(
      id: json['id']?.toString(),
      hostname: json['hostname']?.toString(),
      isPrimary: json['isPrimary'] is bool ? json['isPrimary'] : null,
      isVerified: json['isVerified'] is bool ? json['isVerified'] : null,
      sslEnabled: json['sslEnabled'] is bool ? json['sslEnabled'] : null,
      sslProvider: json['sslProvider']?.toString(),
      status: json['status'] is int ? json['status'] : null,
      createdAt: json['createdAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'hostname': hostname,
      'isPrimary': isPrimary,
      'isVerified': isVerified,
      'sslEnabled': sslEnabled,
      'sslProvider': sslProvider,
      'status': status,
      'createdAt': createdAt,
    };
  }
}

class DomainPage {
  final List<DomainResponse>? items;
  final String? total;

  DomainPage({
    this.items,
    this.total
  });

  factory DomainPage.fromJson(Map<String, dynamic> json) {
    return DomainPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DomainResponse.fromJson(map);
      })())
            .whereType<DomainResponse>()
            .toList();
      })(),
      total: json['total']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }
}

class DomainVerifyResponse {
  final bool? verified;
  final String? method;
  final String? token;

  DomainVerifyResponse({
    this.verified,
    this.method,
    this.token
  });

  factory DomainVerifyResponse.fromJson(Map<String, dynamic> json) {
    return DomainVerifyResponse(
      verified: json['verified'] is bool ? json['verified'] : null,
      method: json['method']?.toString(),
      token: json['token']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'verified': verified,
      'method': method,
      'token': token,
    };
  }
}

class CreateDeploymentRequest {
  final int? deployType;
  final String? versionTag;
  final String? commitHash;
  final String? sourceRef;
  final String? artifactDriveUri;
  final String? artifactSize;
  final String? artifactHash;
  final String? environment;

  CreateDeploymentRequest({
    this.deployType,
    this.versionTag,
    this.commitHash,
    this.sourceRef,
    this.artifactDriveUri,
    this.artifactSize,
    this.artifactHash,
    this.environment
  });

  factory CreateDeploymentRequest.fromJson(Map<String, dynamic> json) {
    return CreateDeploymentRequest(
      deployType: json['deployType'] is int ? json['deployType'] : null,
      versionTag: json['versionTag']?.toString(),
      commitHash: json['commitHash']?.toString(),
      sourceRef: json['sourceRef']?.toString(),
      artifactDriveUri: json['artifactDriveUri']?.toString(),
      artifactSize: json['artifactSize']?.toString(),
      artifactHash: json['artifactHash']?.toString(),
      environment: json['environment']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'deployType': deployType,
      'versionTag': versionTag,
      'commitHash': commitHash,
      'sourceRef': sourceRef,
      'artifactDriveUri': artifactDriveUri,
      'artifactSize': artifactSize,
      'artifactHash': artifactHash,
      'environment': environment,
    };
  }
}

class DeploymentResponse {
  final String? id;
  final String? siteId;
  final int? deployType;
  final String? versionTag;
  final String? commitHash;
  final String? sourceRef;
  final String? rollbackFromDeploymentId;
  final String? environment;
  final String? artifactDriveUri;
  final String? artifactSize;
  final String? artifactHash;
  final int? status;
  final String? startedAt;
  final String? completedAt;
  final String? durationMs;
  final String? createdAt;

  DeploymentResponse({
    this.id,
    this.siteId,
    this.deployType,
    this.versionTag,
    this.commitHash,
    this.sourceRef,
    this.rollbackFromDeploymentId,
    this.environment,
    this.artifactDriveUri,
    this.artifactSize,
    this.artifactHash,
    this.status,
    this.startedAt,
    this.completedAt,
    this.durationMs,
    this.createdAt
  });

  factory DeploymentResponse.fromJson(Map<String, dynamic> json) {
    return DeploymentResponse(
      id: json['id']?.toString(),
      siteId: json['siteId']?.toString(),
      deployType: json['deployType'] is int ? json['deployType'] : null,
      versionTag: json['versionTag']?.toString(),
      commitHash: json['commitHash']?.toString(),
      sourceRef: json['sourceRef']?.toString(),
      rollbackFromDeploymentId: json['rollbackFromDeploymentId']?.toString(),
      environment: json['environment']?.toString(),
      artifactDriveUri: json['artifactDriveUri']?.toString(),
      artifactSize: json['artifactSize']?.toString(),
      artifactHash: json['artifactHash']?.toString(),
      status: json['status'] is int ? json['status'] : null,
      startedAt: json['startedAt']?.toString(),
      completedAt: json['completedAt']?.toString(),
      durationMs: json['durationMs']?.toString(),
      createdAt: json['createdAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'siteId': siteId,
      'deployType': deployType,
      'versionTag': versionTag,
      'commitHash': commitHash,
      'sourceRef': sourceRef,
      'rollbackFromDeploymentId': rollbackFromDeploymentId,
      'environment': environment,
      'artifactDriveUri': artifactDriveUri,
      'artifactSize': artifactSize,
      'artifactHash': artifactHash,
      'status': status,
      'startedAt': startedAt,
      'completedAt': completedAt,
      'durationMs': durationMs,
      'createdAt': createdAt,
    };
  }
}

class DeploymentPage {
  final List<DeploymentResponse>? items;
  final String? total;

  DeploymentPage({
    this.items,
    this.total
  });

  factory DeploymentPage.fromJson(Map<String, dynamic> json) {
    return DeploymentPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DeploymentResponse.fromJson(map);
      })())
            .whereType<DeploymentResponse>()
            .toList();
      })(),
      total: json['total']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }
}

class CreateEnvVariableRequest {
  final String? key;
  final String? value;
  final String? environment;
  final bool? isSecret;

  CreateEnvVariableRequest({
    this.key,
    this.value,
    this.environment,
    this.isSecret
  });

  factory CreateEnvVariableRequest.fromJson(Map<String, dynamic> json) {
    return CreateEnvVariableRequest(
      key: json['key']?.toString(),
      value: json['value']?.toString(),
      environment: json['environment']?.toString(),
      isSecret: json['isSecret'] is bool ? json['isSecret'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'key': key,
      'value': value,
      'environment': environment,
      'isSecret': isSecret,
    };
  }
}

class EnvVariableResponse {
  final String? id;
  final String? key;
  final String? environment;
  final bool? isSecret;
  final String? createdAt;

  EnvVariableResponse({
    this.id,
    this.key,
    this.environment,
    this.isSecret,
    this.createdAt
  });

  factory EnvVariableResponse.fromJson(Map<String, dynamic> json) {
    return EnvVariableResponse(
      id: json['id']?.toString(),
      key: json['key']?.toString(),
      environment: json['environment']?.toString(),
      isSecret: json['isSecret'] is bool ? json['isSecret'] : null,
      createdAt: json['createdAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'key': key,
      'environment': environment,
      'isSecret': isSecret,
      'createdAt': createdAt,
    };
  }
}

class EnvVariablePage {
  final List<EnvVariableResponse>? items;
  final String? total;

  EnvVariablePage({
    this.items,
    this.total
  });

  factory EnvVariablePage.fromJson(Map<String, dynamic> json) {
    return EnvVariablePage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : EnvVariableResponse.fromJson(map);
      })())
            .whereType<EnvVariableResponse>()
            .toList();
      })(),
      total: json['total']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }
}

class CreateCertificateRequest {
  final String? domainId;
  final int? certType;
  final bool? autoRenew;

  CreateCertificateRequest({
    this.domainId,
    this.certType,
    this.autoRenew
  });

  factory CreateCertificateRequest.fromJson(Map<String, dynamic> json) {
    return CreateCertificateRequest(
      domainId: json['domainId']?.toString(),
      certType: json['certType'] is int ? json['certType'] : null,
      autoRenew: json['autoRenew'] is bool ? json['autoRenew'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domainId': domainId,
      'certType': certType,
      'autoRenew': autoRenew,
    };
  }
}

class CertificateResponse {
  final String? id;
  final String? certName;
  final String? domain;
  final int? certType;
  final String? issuer;
  final String? fingerprint;
  final String? notBefore;
  final String? notAfter;
  final bool? autoRenew;
  final int? renewalStatus;
  final int? status;
  final String? createdAt;

  CertificateResponse({
    this.id,
    this.certName,
    this.domain,
    this.certType,
    this.issuer,
    this.fingerprint,
    this.notBefore,
    this.notAfter,
    this.autoRenew,
    this.renewalStatus,
    this.status,
    this.createdAt
  });

  factory CertificateResponse.fromJson(Map<String, dynamic> json) {
    return CertificateResponse(
      id: json['id']?.toString(),
      certName: json['certName']?.toString(),
      domain: json['domain']?.toString(),
      certType: json['certType'] is int ? json['certType'] : null,
      issuer: json['issuer']?.toString(),
      fingerprint: json['fingerprint']?.toString(),
      notBefore: json['notBefore']?.toString(),
      notAfter: json['notAfter']?.toString(),
      autoRenew: json['autoRenew'] is bool ? json['autoRenew'] : null,
      renewalStatus: json['renewalStatus'] is int ? json['renewalStatus'] : null,
      status: json['status'] is int ? json['status'] : null,
      createdAt: json['createdAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'certName': certName,
      'domain': domain,
      'certType': certType,
      'issuer': issuer,
      'fingerprint': fingerprint,
      'notBefore': notBefore,
      'notAfter': notAfter,
      'autoRenew': autoRenew,
      'renewalStatus': renewalStatus,
      'status': status,
      'createdAt': createdAt,
    };
  }
}

class CertificatePage {
  final List<CertificateResponse>? items;
  final String? total;

  CertificatePage({
    this.items,
    this.total
  });

  factory CertificatePage.fromJson(Map<String, dynamic> json) {
    return CertificatePage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : CertificateResponse.fromJson(map);
      })())
            .whereType<CertificateResponse>()
            .toList();
      })(),
      total: json['total']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }
}

class CreateHealthCheckRequest {
  final int? checkType;
  final String? checkUrl;
  final int? checkInterval;
  final int? timeoutMs;
  final int? retryCount;

  CreateHealthCheckRequest({
    this.checkType,
    this.checkUrl,
    this.checkInterval,
    this.timeoutMs,
    this.retryCount
  });

  factory CreateHealthCheckRequest.fromJson(Map<String, dynamic> json) {
    return CreateHealthCheckRequest(
      checkType: json['checkType'] is int ? json['checkType'] : null,
      checkUrl: json['checkUrl']?.toString(),
      checkInterval: json['checkInterval'] is int ? json['checkInterval'] : null,
      timeoutMs: json['timeoutMs'] is int ? json['timeoutMs'] : null,
      retryCount: json['retryCount'] is int ? json['retryCount'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'checkType': checkType,
      'checkUrl': checkUrl,
      'checkInterval': checkInterval,
      'timeoutMs': timeoutMs,
      'retryCount': retryCount,
    };
  }
}

class HealthCheckResponse {
  final String? id;
  final int? checkType;
  final String? checkUrl;
  final int? checkInterval;
  final int? status;
  final String? createdAt;

  HealthCheckResponse({
    this.id,
    this.checkType,
    this.checkUrl,
    this.checkInterval,
    this.status,
    this.createdAt
  });

  factory HealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return HealthCheckResponse(
      id: json['id']?.toString(),
      checkType: json['checkType'] is int ? json['checkType'] : null,
      checkUrl: json['checkUrl']?.toString(),
      checkInterval: json['checkInterval'] is int ? json['checkInterval'] : null,
      status: json['status'] is int ? json['status'] : null,
      createdAt: json['createdAt']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'checkType': checkType,
      'checkUrl': checkUrl,
      'checkInterval': checkInterval,
      'status': status,
      'createdAt': createdAt,
    };
  }
}

class HealthCheckPage {
  final List<HealthCheckResponse>? items;
  final String? total;

  HealthCheckPage({
    this.items,
    this.total
  });

  factory HealthCheckPage.fromJson(Map<String, dynamic> json) {
    return HealthCheckPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : HealthCheckResponse.fromJson(map);
      })())
            .whereType<HealthCheckResponse>()
            .toList();
      })(),
      total: json['total']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }
}

class SdkWorkApiResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkApiResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkApiResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkApiResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkResourceData {
  final Map<String, dynamic>? item;

  SdkWorkResourceData({
    this.item
  });

  factory SdkWorkResourceData.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceData(
      item: _sdkworkAsMap(json['item'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class SdkWorkPageData {
  final List<Map<String, dynamic>>? items;
  final PageInfo? pageInfo;

  SdkWorkPageData({
    this.items,
    this.pageInfo
  });

  factory SdkWorkPageData.fromJson(Map<String, dynamic> json) {
    return SdkWorkPageData(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        return map == null ? null : PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items?.map((item) => item).toList(),
      'pageInfo': pageInfo?.toJson(),
    };
  }
}

class SdkWorkCommandData {
  final bool? accepted;
  final String? resourceId;
  final String? status;

  SdkWorkCommandData({
    this.accepted,
    this.resourceId,
    this.status
  });

  factory SdkWorkCommandData.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandData(
      accepted: json['accepted'] is bool ? json['accepted'] : null,
      resourceId: json['resourceId']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accepted': accepted,
      'resourceId': resourceId,
      'status': status,
    };
  }
}

class PageInfo {
  final String? mode;
  final int? page;
  final int? pageSize;
  final String? totalItems;
  final int? totalPages;
  final String? nextCursor;
  final bool? hasMore;

  PageInfo({
    this.mode,
    this.page,
    this.pageSize,
    this.totalItems,
    this.totalPages,
    this.nextCursor,
    this.hasMore
  });

  factory PageInfo.fromJson(Map<String, dynamic> json) {
    return PageInfo(
      mode: json['mode']?.toString(),
      page: json['page'] is int ? json['page'] : null,
      pageSize: json['pageSize'] is int ? json['pageSize'] : null,
      totalItems: json['totalItems']?.toString(),
      totalPages: json['totalPages'] is int ? json['totalPages'] : null,
      nextCursor: json['nextCursor']?.toString(),
      hasMore: json['hasMore'] is bool ? json['hasMore'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'mode': mode,
      'page': page,
      'pageSize': pageSize,
      'totalItems': totalItems,
      'totalPages': totalPages,
      'nextCursor': nextCursor,
      'hasMore': hasMore,
    };
  }
}

class FieldError {
  final String? field;
  final String? message;
  final int? code;

  FieldError({
    this.field,
    this.message,
    this.code
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      field: json['field']?.toString(),
      message: json['message']?.toString(),
      code: json['code'] is int ? json['code'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'field': field,
      'message': message,
      'code': code,
    };
  }
}

class SdkWorkResourceResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkResourceResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkResourceResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkListResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkCommandResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SdkWorkCommandResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SdkWorkCommandResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandResponse(
      code: json['code'] is int ? json['code'] : null,
      data: json['data'],
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesListResponse.fromJson(Map<String, dynamic> json) {
    return SitesListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesRetrieveResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesRetrieveResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesRetrieveResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesUpdateResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesUpdateResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesUpdateResponse.fromJson(Map<String, dynamic> json) {
    return SitesUpdateResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesActivateResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesActivateResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesActivateResponse.fromJson(Map<String, dynamic> json) {
    return SitesActivateResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesPauseResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesPauseResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesPauseResponse.fromJson(Map<String, dynamic> json) {
    return SitesPauseResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDomainsListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDomainsListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDomainsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDomainsCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDomainsCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDomainsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesDomainsCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDomainsRetrieveResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDomainsRetrieveResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDomainsRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsRetrieveResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDomainsVerifyResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDomainsVerifyResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDomainsVerifyResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsVerifyResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDeploymentsListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDeploymentsListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDeploymentsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDeploymentsCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDeploymentsCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDeploymentsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDeploymentsRetrieveResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDeploymentsRetrieveResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDeploymentsRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsRetrieveResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesDeploymentsRollbackResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesDeploymentsRollbackResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesDeploymentsRollbackResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsRollbackResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesEnvVariablesListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesEnvVariablesListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesEnvVariablesListResponse.fromJson(Map<String, dynamic> json) {
    return SitesEnvVariablesListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesEnvVariablesCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesEnvVariablesCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesEnvVariablesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesEnvVariablesCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class CertificatesListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  CertificatesListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory CertificatesListResponse.fromJson(Map<String, dynamic> json) {
    return CertificatesListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class CertificatesCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  CertificatesCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory CertificatesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return CertificatesCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesHealthChecksListResponse {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesHealthChecksListResponse({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesHealthChecksListResponse.fromJson(Map<String, dynamic> json) {
    return SitesHealthChecksListResponse(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SitesHealthChecksCreateResponse201 {
  final int? code;
  final dynamic data;
  final String? traceId;

  SitesHealthChecksCreateResponse201({
    this.code,
    this.data,
    this.traceId
  });

  factory SitesHealthChecksCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesHealthChecksCreateResponse201(
      code: json['code'] is int ? json['code'] : null,
      data: _sdkworkAsMap(json['data']),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}
