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
  final String type;
  final String title;
  final int status;
  final String? detail;
  final String? instance;
  final int code;
  final String traceId;
  final List<FieldError>? errors;

  ProblemDetail({
    required this.type,
    required this.title,
    required this.status,
    this.detail,
    this.instance,
    required this.code,
    required this.traceId,
    this.errors
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.type is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.title is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('ProblemDetail.status is required');
        }
        return value;
      })(),
      detail: json['detail']?.toString(),
      instance: json['instance']?.toString(),
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProblemDetail.code is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.traceId is required');
        }
        return value;
      })(),
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

class MediaChecksum {
  final String algorithm;
  final String value;

  MediaChecksum({
    required this.algorithm,
    required this.value
  });

  factory MediaChecksum.fromJson(Map<String, dynamic> json) {
    return MediaChecksum(
      algorithm: (() {
        final value = json['algorithm']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.algorithm is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'algorithm': algorithm,
      'value': value,
    };
  }
}

class MediaResource {
  final String? id;
  final String kind;
  final String source;
  final String? url;
  final String? publicUrl;
  final String? uri;
  final String? objectBlobId;
  final String? fileName;
  final String? mimeType;
  final String? sizeBytes;
  final MediaChecksum? checksum;
  final int? width;
  final int? height;
  final double? durationSeconds;
  final String? altText;
  final String? title;
  final Map<String, dynamic>? metadata;

  MediaResource({
    this.id,
    required this.kind,
    required this.source,
    this.url,
    this.publicUrl,
    this.uri,
    this.objectBlobId,
    this.fileName,
    this.mimeType,
    this.sizeBytes,
    this.checksum,
    this.width,
    this.height,
    this.durationSeconds,
    this.altText,
    this.title,
    this.metadata
  });

  factory MediaResource.fromJson(Map<String, dynamic> json) {
    return MediaResource(
      id: json['id']?.toString(),
      kind: (() {
        final value = json['kind']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.kind is required');
        }
        return value;
      })(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.source is required');
        }
        return value;
      })(),
      url: json['url']?.toString(),
      publicUrl: json['publicUrl']?.toString(),
      uri: json['uri']?.toString(),
      objectBlobId: json['objectBlobId']?.toString(),
      fileName: json['fileName']?.toString(),
      mimeType: json['mimeType']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      checksum: (() {
        final map = _sdkworkAsMap(json['checksum']);
        return map == null ? null : MediaChecksum.fromJson(map);
      })(),
      width: json['width'] is int ? json['width'] : null,
      height: json['height'] is int ? json['height'] : null,
      durationSeconds: json['durationSeconds'] is num ? json['durationSeconds'].toDouble() : null,
      altText: json['altText']?.toString(),
      title: json['title']?.toString(),
      metadata: _sdkworkAsMap(json['metadata'])
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'kind': kind,
      'source': source,
      'url': url,
      'publicUrl': publicUrl,
      'uri': uri,
      'objectBlobId': objectBlobId,
      'fileName': fileName,
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
      'checksum': checksum?.toJson(),
      'width': width,
      'height': height,
      'durationSeconds': durationSeconds,
      'altText': altText,
      'title': title,
      'metadata': metadata,
    };
  }
}

class ApplicationStoreListing {
  final MediaResource? icon;
  final MediaResource? cover;
  final List<MediaResource>? previews;
  final String? shortDescription;
  final String? fullDescription;
  final String? releaseNotes;
  final String? category;
  final List<String>? keywords;
  final String? supportUrl;
  final String? privacyPolicyUrl;
  final String? officialWebsiteUrl;

  ApplicationStoreListing({
    this.icon,
    this.cover,
    this.previews,
    this.shortDescription,
    this.fullDescription,
    this.releaseNotes,
    this.category,
    this.keywords,
    this.supportUrl,
    this.privacyPolicyUrl,
    this.officialWebsiteUrl
  });

  factory ApplicationStoreListing.fromJson(Map<String, dynamic> json) {
    return ApplicationStoreListing(
      icon: (() {
        final map = _sdkworkAsMap(json['icon']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      cover: (() {
        final map = _sdkworkAsMap(json['cover']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      previews: (() {
        final list = _sdkworkAsList(json['previews']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MediaResource.fromJson(map);
      })())
            .whereType<MediaResource>()
            .toList();
      })(),
      shortDescription: json['shortDescription']?.toString(),
      fullDescription: json['fullDescription']?.toString(),
      releaseNotes: json['releaseNotes']?.toString(),
      category: json['category']?.toString(),
      keywords: (() {
        final list = _sdkworkAsList(json['keywords']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      supportUrl: json['supportUrl']?.toString(),
      privacyPolicyUrl: json['privacyPolicyUrl']?.toString(),
      officialWebsiteUrl: json['officialWebsiteUrl']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'icon': icon?.toJson(),
      'cover': cover?.toJson(),
      'previews': previews?.map((item) => item.toJson()).toList(),
      'shortDescription': shortDescription,
      'fullDescription': fullDescription,
      'releaseNotes': releaseNotes,
      'category': category,
      'keywords': keywords?.map((item) => item).toList(),
      'supportUrl': supportUrl,
      'privacyPolicyUrl': privacyPolicyUrl,
      'officialWebsiteUrl': officialWebsiteUrl,
    };
  }
}

class CreateSiteRequest {
  final String name;
  final String? slug;
  final String? description;
  final String? applicationType;
  final int siteType;
  final Map<String, dynamic>? runtimeConfig;
  final ApplicationStoreListing? storeListing;

  CreateSiteRequest({
    required this.name,
    this.slug,
    this.description,
    this.applicationType,
    required this.siteType,
    this.runtimeConfig,
    this.storeListing
  });

  factory CreateSiteRequest.fromJson(Map<String, dynamic> json) {
    return CreateSiteRequest(
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('CreateSiteRequest.name is required');
        }
        return value;
      })(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      applicationType: json['applicationType']?.toString(),
      siteType: (() {
        final value = json['siteType'];
        if (value is! int) {
          throw FormatException('CreateSiteRequest.siteType is required');
        }
        return value;
      })(),
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig']),
      storeListing: (() {
        final map = _sdkworkAsMap(json['storeListing']);
        return map == null ? null : ApplicationStoreListing.fromJson(map);
      })()
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
      'storeListing': storeListing?.toJson(),
    };
  }
}

class UpdateSiteRequest {
  final String? name;
  final String? description;
  final Map<String, dynamic>? runtimeConfig;
  final ApplicationStoreListing? storeListing;

  UpdateSiteRequest({
    this.name,
    this.description,
    this.runtimeConfig,
    this.storeListing
  });

  factory UpdateSiteRequest.fromJson(Map<String, dynamic> json) {
    return UpdateSiteRequest(
      name: json['name']?.toString(),
      description: json['description']?.toString(),
      runtimeConfig: _sdkworkAsMap(json['runtimeConfig']),
      storeListing: (() {
        final map = _sdkworkAsMap(json['storeListing']);
        return map == null ? null : ApplicationStoreListing.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      'description': description,
      'runtimeConfig': runtimeConfig,
      'storeListing': storeListing?.toJson(),
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
  final ApplicationStoreListing? storeListing;
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
    this.storeListing,
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
      storeListing: (() {
        final map = _sdkworkAsMap(json['storeListing']);
        return map == null ? null : ApplicationStoreListing.fromJson(map);
      })(),
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
      'storeListing': storeListing?.toJson(),
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
  final String hostname;
  final bool? isPrimary;
  final bool? sslEnabled;
  final String? sslProvider;

  CreateDomainRequest({
    required this.hostname,
    this.isPrimary,
    this.sslEnabled,
    this.sslProvider
  });

  factory CreateDomainRequest.fromJson(Map<String, dynamic> json) {
    return CreateDomainRequest(
      hostname: (() {
        final value = json['hostname']?.toString();
        if (value == null) {
          throw FormatException('CreateDomainRequest.hostname is required');
        }
        return value;
      })(),
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
  final String id;
  final String hostname;
  final String? applicationId;
  final String? applicationName;
  final String certificateCount;
  final bool isPrimary;
  final bool isVerified;
  final bool sslEnabled;
  final String? sslProvider;
  final int status;
  final String createdAt;

  DomainResponse({
    required this.id,
    required this.hostname,
    this.applicationId,
    this.applicationName,
    required this.certificateCount,
    required this.isPrimary,
    required this.isVerified,
    required this.sslEnabled,
    this.sslProvider,
    required this.status,
    required this.createdAt
  });

  factory DomainResponse.fromJson(Map<String, dynamic> json) {
    return DomainResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DomainResponse.id is required');
        }
        return value;
      })(),
      hostname: (() {
        final value = json['hostname']?.toString();
        if (value == null) {
          throw FormatException('DomainResponse.hostname is required');
        }
        return value;
      })(),
      applicationId: json['applicationId']?.toString(),
      applicationName: json['applicationName']?.toString(),
      certificateCount: (() {
        final value = json['certificateCount']?.toString();
        if (value == null) {
          throw FormatException('DomainResponse.certificateCount is required');
        }
        return value;
      })(),
      isPrimary: (() {
        final value = json['isPrimary'];
        if (value is! bool) {
          throw FormatException('DomainResponse.isPrimary is required');
        }
        return value;
      })(),
      isVerified: (() {
        final value = json['isVerified'];
        if (value is! bool) {
          throw FormatException('DomainResponse.isVerified is required');
        }
        return value;
      })(),
      sslEnabled: (() {
        final value = json['sslEnabled'];
        if (value is! bool) {
          throw FormatException('DomainResponse.sslEnabled is required');
        }
        return value;
      })(),
      sslProvider: json['sslProvider']?.toString(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('DomainResponse.status is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('DomainResponse.createdAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'hostname': hostname,
      'applicationId': applicationId,
      'applicationName': applicationName,
      'certificateCount': certificateCount,
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

class SourceVersionConfigSnapshot {
  final String appConfigPath;
  final String deploymentConfigPath;
  final bool appConfigDetected;
  final bool deploymentConfigDetected;

  SourceVersionConfigSnapshot({
    required this.appConfigPath,
    required this.deploymentConfigPath,
    required this.appConfigDetected,
    required this.deploymentConfigDetected
  });

  factory SourceVersionConfigSnapshot.fromJson(Map<String, dynamic> json) {
    return SourceVersionConfigSnapshot(
      appConfigPath: (() {
        final value = json['appConfigPath']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionConfigSnapshot.appConfigPath is required');
        }
        return value;
      })(),
      deploymentConfigPath: (() {
        final value = json['deploymentConfigPath']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionConfigSnapshot.deploymentConfigPath is required');
        }
        return value;
      })(),
      appConfigDetected: (() {
        final value = json['appConfigDetected'];
        if (value is! bool) {
          throw FormatException('SourceVersionConfigSnapshot.appConfigDetected is required');
        }
        return value;
      })(),
      deploymentConfigDetected: (() {
        final value = json['deploymentConfigDetected'];
        if (value is! bool) {
          throw FormatException('SourceVersionConfigSnapshot.deploymentConfigDetected is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'appConfigPath': appConfigPath,
      'deploymentConfigPath': deploymentConfigPath,
      'appConfigDetected': appConfigDetected,
      'deploymentConfigDetected': deploymentConfigDetected,
    };
  }
}

class CreateSourceVersionRequest {
  final String versionTag;
  final String sourceType;
  final String? sourceRef;
  final String? commitHash;
  final String artifactDriveUri;
  final String artifactSize;
  final String artifactHash;
  final SourceVersionConfigSnapshot? configSnapshot;

  CreateSourceVersionRequest({
    required this.versionTag,
    required this.sourceType,
    this.sourceRef,
    this.commitHash,
    required this.artifactDriveUri,
    required this.artifactSize,
    required this.artifactHash,
    this.configSnapshot
  });

  factory CreateSourceVersionRequest.fromJson(Map<String, dynamic> json) {
    return CreateSourceVersionRequest(
      versionTag: (() {
        final value = json['versionTag']?.toString();
        if (value == null) {
          throw FormatException('CreateSourceVersionRequest.versionTag is required');
        }
        return value;
      })(),
      sourceType: (() {
        final value = json['sourceType']?.toString();
        if (value == null) {
          throw FormatException('CreateSourceVersionRequest.sourceType is required');
        }
        return value;
      })(),
      sourceRef: json['sourceRef']?.toString(),
      commitHash: json['commitHash']?.toString(),
      artifactDriveUri: (() {
        final value = json['artifactDriveUri']?.toString();
        if (value == null) {
          throw FormatException('CreateSourceVersionRequest.artifactDriveUri is required');
        }
        return value;
      })(),
      artifactSize: (() {
        final value = json['artifactSize']?.toString();
        if (value == null) {
          throw FormatException('CreateSourceVersionRequest.artifactSize is required');
        }
        return value;
      })(),
      artifactHash: (() {
        final value = json['artifactHash']?.toString();
        if (value == null) {
          throw FormatException('CreateSourceVersionRequest.artifactHash is required');
        }
        return value;
      })(),
      configSnapshot: (() {
        final map = _sdkworkAsMap(json['configSnapshot']);
        return map == null ? null : SourceVersionConfigSnapshot.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'versionTag': versionTag,
      'sourceType': sourceType,
      'sourceRef': sourceRef,
      'commitHash': commitHash,
      'artifactDriveUri': artifactDriveUri,
      'artifactSize': artifactSize,
      'artifactHash': artifactHash,
      'configSnapshot': configSnapshot?.toJson(),
    };
  }
}

class ImportGitSourceVersionRequest {
  final String versionTag;
  final String repositoryUrl;
  final String? gitRef;

  ImportGitSourceVersionRequest({
    required this.versionTag,
    required this.repositoryUrl,
    this.gitRef
  });

  factory ImportGitSourceVersionRequest.fromJson(Map<String, dynamic> json) {
    return ImportGitSourceVersionRequest(
      versionTag: (() {
        final value = json['versionTag']?.toString();
        if (value == null) {
          throw FormatException('ImportGitSourceVersionRequest.versionTag is required');
        }
        return value;
      })(),
      repositoryUrl: (() {
        final value = json['repositoryUrl']?.toString();
        if (value == null) {
          throw FormatException('ImportGitSourceVersionRequest.repositoryUrl is required');
        }
        return value;
      })(),
      gitRef: json['gitRef']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'versionTag': versionTag,
      'repositoryUrl': repositoryUrl,
      'gitRef': gitRef,
    };
  }
}

class SourceVersionResponse {
  final String id;
  final String siteId;
  final String versionTag;
  final String sourceType;
  final String? sourceRef;
  final String? commitHash;
  final String artifactDriveUri;
  final String artifactSize;
  final String artifactHash;
  final SourceVersionConfigSnapshot configSnapshot;
  final int status;
  final bool retained;
  final String createdAt;

  SourceVersionResponse({
    required this.id,
    required this.siteId,
    required this.versionTag,
    required this.sourceType,
    this.sourceRef,
    this.commitHash,
    required this.artifactDriveUri,
    required this.artifactSize,
    required this.artifactHash,
    required this.configSnapshot,
    required this.status,
    required this.retained,
    required this.createdAt
  });

  factory SourceVersionResponse.fromJson(Map<String, dynamic> json) {
    return SourceVersionResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.id is required');
        }
        return value;
      })(),
      siteId: (() {
        final value = json['siteId']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.siteId is required');
        }
        return value;
      })(),
      versionTag: (() {
        final value = json['versionTag']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.versionTag is required');
        }
        return value;
      })(),
      sourceType: (() {
        final value = json['sourceType']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.sourceType is required');
        }
        return value;
      })(),
      sourceRef: json['sourceRef']?.toString(),
      commitHash: json['commitHash']?.toString(),
      artifactDriveUri: (() {
        final value = json['artifactDriveUri']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.artifactDriveUri is required');
        }
        return value;
      })(),
      artifactSize: (() {
        final value = json['artifactSize']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.artifactSize is required');
        }
        return value;
      })(),
      artifactHash: (() {
        final value = json['artifactHash']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.artifactHash is required');
        }
        return value;
      })(),
      configSnapshot: (() {
        final map = _sdkworkAsMap(json['configSnapshot']);
        if (map == null) {
          throw FormatException('SourceVersionResponse.configSnapshot is required');
        }
        return SourceVersionConfigSnapshot.fromJson(map);
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('SourceVersionResponse.status is required');
        }
        return value;
      })(),
      retained: (() {
        final value = json['retained'];
        if (value is! bool) {
          throw FormatException('SourceVersionResponse.retained is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('SourceVersionResponse.createdAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'siteId': siteId,
      'versionTag': versionTag,
      'sourceType': sourceType,
      'sourceRef': sourceRef,
      'commitHash': commitHash,
      'artifactDriveUri': artifactDriveUri,
      'artifactSize': artifactSize,
      'artifactHash': artifactHash,
      'configSnapshot': configSnapshot.toJson(),
      'status': status,
      'retained': retained,
      'createdAt': createdAt,
    };
  }
}

class SourceVersionPage {
  final List<SourceVersionResponse>? items;
  final String? total;

  SourceVersionPage({
    this.items,
    this.total
  });

  factory SourceVersionPage.fromJson(Map<String, dynamic> json) {
    return SourceVersionPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : SourceVersionResponse.fromJson(map);
      })())
            .whereType<SourceVersionResponse>()
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

class CreateDeploymentRequest {
  final String? sourceVersionId;
  final int deployType;
  final String? versionTag;
  final String? commitHash;
  final String? sourceRef;
  final String? artifactDriveUri;
  final String? artifactSize;
  final String? artifactHash;
  final String? environment;

  CreateDeploymentRequest({
    this.sourceVersionId,
    required this.deployType,
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
      sourceVersionId: json['sourceVersionId']?.toString(),
      deployType: (() {
        final value = json['deployType'];
        if (value is! int) {
          throw FormatException('CreateDeploymentRequest.deployType is required');
        }
        return value;
      })(),
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
      'sourceVersionId': sourceVersionId,
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
  final String id;
  final String siteId;
  final int deployType;
  final String? sourceVersionId;
  final String? versionTag;
  final String? commitHash;
  final String? sourceRef;
  final String? rollbackFromDeploymentId;
  final String environment;
  final String? artifactDriveUri;
  final String? artifactSize;
  final String? artifactHash;
  final int status;
  final String? startedAt;
  final String? completedAt;
  final String? durationMs;
  final String createdAt;

  DeploymentResponse({
    required this.id,
    required this.siteId,
    required this.deployType,
    this.sourceVersionId,
    this.versionTag,
    this.commitHash,
    this.sourceRef,
    this.rollbackFromDeploymentId,
    required this.environment,
    this.artifactDriveUri,
    this.artifactSize,
    this.artifactHash,
    required this.status,
    this.startedAt,
    this.completedAt,
    this.durationMs,
    required this.createdAt
  });

  factory DeploymentResponse.fromJson(Map<String, dynamic> json) {
    return DeploymentResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DeploymentResponse.id is required');
        }
        return value;
      })(),
      siteId: (() {
        final value = json['siteId']?.toString();
        if (value == null) {
          throw FormatException('DeploymentResponse.siteId is required');
        }
        return value;
      })(),
      deployType: (() {
        final value = json['deployType'];
        if (value is! int) {
          throw FormatException('DeploymentResponse.deployType is required');
        }
        return value;
      })(),
      sourceVersionId: json['sourceVersionId']?.toString(),
      versionTag: json['versionTag']?.toString(),
      commitHash: json['commitHash']?.toString(),
      sourceRef: json['sourceRef']?.toString(),
      rollbackFromDeploymentId: json['rollbackFromDeploymentId']?.toString(),
      environment: (() {
        final value = json['environment']?.toString();
        if (value == null) {
          throw FormatException('DeploymentResponse.environment is required');
        }
        return value;
      })(),
      artifactDriveUri: json['artifactDriveUri']?.toString(),
      artifactSize: json['artifactSize']?.toString(),
      artifactHash: json['artifactHash']?.toString(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('DeploymentResponse.status is required');
        }
        return value;
      })(),
      startedAt: json['startedAt']?.toString(),
      completedAt: json['completedAt']?.toString(),
      durationMs: json['durationMs']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('DeploymentResponse.createdAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'siteId': siteId,
      'deployType': deployType,
      'sourceVersionId': sourceVersionId,
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
  final String key;
  final String value;
  final String? environment;
  final bool? isSecret;

  CreateEnvVariableRequest({
    required this.key,
    required this.value,
    this.environment,
    this.isSecret
  });

  factory CreateEnvVariableRequest.fromJson(Map<String, dynamic> json) {
    return CreateEnvVariableRequest(
      key: (() {
        final value = json['key']?.toString();
        if (value == null) {
          throw FormatException('CreateEnvVariableRequest.key is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('CreateEnvVariableRequest.value is required');
        }
        return value;
      })(),
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
  final List<String> domainIds;
  final int certType;
  final String? keyAlgorithm;
  final bool? autoRenew;

  CreateCertificateRequest({
    required this.domainIds,
    required this.certType,
    this.keyAlgorithm,
    this.autoRenew
  });

  factory CreateCertificateRequest.fromJson(Map<String, dynamic> json) {
    return CreateCertificateRequest(
      domainIds: (() {
        final list = _sdkworkAsList(json['domainIds']);
        if (list == null) {
          throw FormatException('CreateCertificateRequest.domainIds is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      certType: (() {
        final value = json['certType'];
        if (value is! int) {
          throw FormatException('CreateCertificateRequest.certType is required');
        }
        return value;
      })(),
      keyAlgorithm: json['keyAlgorithm']?.toString(),
      autoRenew: json['autoRenew'] is bool ? json['autoRenew'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domainIds': domainIds.map((item) => item).toList(),
      'certType': certType,
      'keyAlgorithm': keyAlgorithm,
      'autoRenew': autoRenew,
    };
  }
}

class CertificateIdentifierResponse {
  final String domainId;
  final String hostname;
  final String identifierType;
  final int position;

  CertificateIdentifierResponse({
    required this.domainId,
    required this.hostname,
    required this.identifierType,
    required this.position
  });

  factory CertificateIdentifierResponse.fromJson(Map<String, dynamic> json) {
    return CertificateIdentifierResponse(
      domainId: (() {
        final value = json['domainId']?.toString();
        if (value == null) {
          throw FormatException('CertificateIdentifierResponse.domainId is required');
        }
        return value;
      })(),
      hostname: (() {
        final value = json['hostname']?.toString();
        if (value == null) {
          throw FormatException('CertificateIdentifierResponse.hostname is required');
        }
        return value;
      })(),
      identifierType: (() {
        final value = json['identifierType']?.toString();
        if (value == null) {
          throw FormatException('CertificateIdentifierResponse.identifierType is required');
        }
        return value;
      })(),
      position: (() {
        final value = json['position'];
        if (value is! int) {
          throw FormatException('CertificateIdentifierResponse.position is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domainId': domainId,
      'hostname': hostname,
      'identifierType': identifierType,
      'position': position,
    };
  }
}

class CertificateResponse {
  final String id;
  final String certName;
  final List<CertificateIdentifierResponse> identifiers;
  final int? certType;
  final String? issuer;
  final String? fingerprint;
  final String keyAlgorithm;
  final String? notBefore;
  final String? notAfter;
  final bool? autoRenew;
  final String? renewalStatus;
  final String status;
  final String createdAt;

  CertificateResponse({
    required this.id,
    required this.certName,
    required this.identifiers,
    this.certType,
    this.issuer,
    this.fingerprint,
    required this.keyAlgorithm,
    this.notBefore,
    this.notAfter,
    this.autoRenew,
    this.renewalStatus,
    required this.status,
    required this.createdAt
  });

  factory CertificateResponse.fromJson(Map<String, dynamic> json) {
    return CertificateResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('CertificateResponse.id is required');
        }
        return value;
      })(),
      certName: (() {
        final value = json['certName']?.toString();
        if (value == null) {
          throw FormatException('CertificateResponse.certName is required');
        }
        return value;
      })(),
      identifiers: (() {
        final list = _sdkworkAsList(json['identifiers']);
        if (list == null) {
          throw FormatException('CertificateResponse.identifiers is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : CertificateIdentifierResponse.fromJson(map);
      })())
            .whereType<CertificateIdentifierResponse>()
            .toList();
      })(),
      certType: json['certType'] is int ? json['certType'] : null,
      issuer: json['issuer']?.toString(),
      fingerprint: json['fingerprint']?.toString(),
      keyAlgorithm: (() {
        final value = json['keyAlgorithm']?.toString();
        if (value == null) {
          throw FormatException('CertificateResponse.keyAlgorithm is required');
        }
        return value;
      })(),
      notBefore: json['notBefore']?.toString(),
      notAfter: json['notAfter']?.toString(),
      autoRenew: json['autoRenew'] is bool ? json['autoRenew'] : null,
      renewalStatus: json['renewalStatus']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('CertificateResponse.status is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('CertificateResponse.createdAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'certName': certName,
      'identifiers': identifiers.map((item) => item.toJson()).toList(),
      'certType': certType,
      'issuer': issuer,
      'fingerprint': fingerprint,
      'keyAlgorithm': keyAlgorithm,
      'notBefore': notBefore,
      'notAfter': notAfter,
      'autoRenew': autoRenew,
      'renewalStatus': renewalStatus,
      'status': status,
      'createdAt': createdAt,
    };
  }
}

class CreateListenerCertificateBindingRequest {
  final String certificateId;
  final String? certificateVersionId;
  final int? priority;
  final bool? isDefault;

  CreateListenerCertificateBindingRequest({
    required this.certificateId,
    this.certificateVersionId,
    this.priority,
    this.isDefault
  });

  factory CreateListenerCertificateBindingRequest.fromJson(Map<String, dynamic> json) {
    return CreateListenerCertificateBindingRequest(
      certificateId: (() {
        final value = json['certificateId']?.toString();
        if (value == null) {
          throw FormatException('CreateListenerCertificateBindingRequest.certificateId is required');
        }
        return value;
      })(),
      certificateVersionId: json['certificateVersionId']?.toString(),
      priority: json['priority'] is int ? json['priority'] : null,
      isDefault: json['isDefault'] is bool ? json['isDefault'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'certificateId': certificateId,
      'certificateVersionId': certificateVersionId,
      'priority': priority,
      'isDefault': isDefault,
    };
  }
}

class ListenerCertificateBindingResponse {
  final String id;
  final String siteId;
  final String domainId;
  final String certificateId;
  final String desiredCertificateVersionId;
  final String? currentCertificateVersionId;
  final ListenerCertificateSummaryResponse desiredCertificate;
  final ListenerCertificateSummaryResponse? currentCertificate;
  final String keyAlgorithm;
  final int priority;
  final bool isDefault;
  final String status;
  final String? activatedAt;
  final String createdAt;
  final String updatedAt;

  ListenerCertificateBindingResponse({
    required this.id,
    required this.siteId,
    required this.domainId,
    required this.certificateId,
    required this.desiredCertificateVersionId,
    this.currentCertificateVersionId,
    required this.desiredCertificate,
    this.currentCertificate,
    required this.keyAlgorithm,
    required this.priority,
    required this.isDefault,
    required this.status,
    this.activatedAt,
    required this.createdAt,
    required this.updatedAt
  });

  factory ListenerCertificateBindingResponse.fromJson(Map<String, dynamic> json) {
    return ListenerCertificateBindingResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.id is required');
        }
        return value;
      })(),
      siteId: (() {
        final value = json['siteId']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.siteId is required');
        }
        return value;
      })(),
      domainId: (() {
        final value = json['domainId']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.domainId is required');
        }
        return value;
      })(),
      certificateId: (() {
        final value = json['certificateId']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.certificateId is required');
        }
        return value;
      })(),
      desiredCertificateVersionId: (() {
        final value = json['desiredCertificateVersionId']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.desiredCertificateVersionId is required');
        }
        return value;
      })(),
      currentCertificateVersionId: json['currentCertificateVersionId']?.toString(),
      desiredCertificate: (() {
        final map = _sdkworkAsMap(json['desiredCertificate']);
        if (map == null) {
          throw FormatException('ListenerCertificateBindingResponse.desiredCertificate is required');
        }
        return ListenerCertificateSummaryResponse.fromJson(map);
      })(),
      currentCertificate: (() {
        final map = _sdkworkAsMap(json['currentCertificate']);
        return map == null ? null : ListenerCertificateSummaryResponse.fromJson(map);
      })(),
      keyAlgorithm: (() {
        final value = json['keyAlgorithm']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.keyAlgorithm is required');
        }
        return value;
      })(),
      priority: (() {
        final value = json['priority'];
        if (value is! int) {
          throw FormatException('ListenerCertificateBindingResponse.priority is required');
        }
        return value;
      })(),
      isDefault: (() {
        final value = json['isDefault'];
        if (value is! bool) {
          throw FormatException('ListenerCertificateBindingResponse.isDefault is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.status is required');
        }
        return value;
      })(),
      activatedAt: json['activatedAt']?.toString(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.createdAt is required');
        }
        return value;
      })(),
      updatedAt: (() {
        final value = json['updatedAt']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateBindingResponse.updatedAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'siteId': siteId,
      'domainId': domainId,
      'certificateId': certificateId,
      'desiredCertificateVersionId': desiredCertificateVersionId,
      'currentCertificateVersionId': currentCertificateVersionId,
      'desiredCertificate': desiredCertificate.toJson(),
      'currentCertificate': currentCertificate?.toJson(),
      'keyAlgorithm': keyAlgorithm,
      'priority': priority,
      'isDefault': isDefault,
      'status': status,
      'activatedAt': activatedAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class ListenerCertificateSummaryResponse {
  final String certName;
  final List<CertificateIdentifierResponse> identifiers;
  final String? issuer;
  final String? fingerprint;
  final String? notAfter;
  final String status;

  ListenerCertificateSummaryResponse({
    required this.certName,
    required this.identifiers,
    this.issuer,
    this.fingerprint,
    this.notAfter,
    required this.status
  });

  factory ListenerCertificateSummaryResponse.fromJson(Map<String, dynamic> json) {
    return ListenerCertificateSummaryResponse(
      certName: (() {
        final value = json['certName']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateSummaryResponse.certName is required');
        }
        return value;
      })(),
      identifiers: (() {
        final list = _sdkworkAsList(json['identifiers']);
        if (list == null) {
          throw FormatException('ListenerCertificateSummaryResponse.identifiers is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : CertificateIdentifierResponse.fromJson(map);
      })())
            .whereType<CertificateIdentifierResponse>()
            .toList();
      })(),
      issuer: json['issuer']?.toString(),
      fingerprint: json['fingerprint']?.toString(),
      notAfter: json['notAfter']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('ListenerCertificateSummaryResponse.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'certName': certName,
      'identifiers': identifiers.map((item) => item.toJson()).toList(),
      'issuer': issuer,
      'fingerprint': fingerprint,
      'notAfter': notAfter,
      'status': status,
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
  final int checkType;
  final String checkUrl;
  final int? checkInterval;
  final int? timeoutMs;
  final int? retryCount;

  CreateHealthCheckRequest({
    required this.checkType,
    required this.checkUrl,
    this.checkInterval,
    this.timeoutMs,
    this.retryCount
  });

  factory CreateHealthCheckRequest.fromJson(Map<String, dynamic> json) {
    return CreateHealthCheckRequest(
      checkType: (() {
        final value = json['checkType'];
        if (value is! int) {
          throw FormatException('CreateHealthCheckRequest.checkType is required');
        }
        return value;
      })(),
      checkUrl: (() {
        final value = json['checkUrl']?.toString();
        if (value == null) {
          throw FormatException('CreateHealthCheckRequest.checkUrl is required');
        }
        return value;
      })(),
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
  final String id;
  final int checkType;
  final String checkUrl;
  final int checkInterval;
  final int timeoutMs;
  final int retryCount;
  final int status;
  final String createdAt;

  HealthCheckResponse({
    required this.id,
    required this.checkType,
    required this.checkUrl,
    required this.checkInterval,
    required this.timeoutMs,
    required this.retryCount,
    required this.status,
    required this.createdAt
  });

  factory HealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return HealthCheckResponse(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('HealthCheckResponse.id is required');
        }
        return value;
      })(),
      checkType: (() {
        final value = json['checkType'];
        if (value is! int) {
          throw FormatException('HealthCheckResponse.checkType is required');
        }
        return value;
      })(),
      checkUrl: (() {
        final value = json['checkUrl']?.toString();
        if (value == null) {
          throw FormatException('HealthCheckResponse.checkUrl is required');
        }
        return value;
      })(),
      checkInterval: (() {
        final value = json['checkInterval'];
        if (value is! int) {
          throw FormatException('HealthCheckResponse.checkInterval is required');
        }
        return value;
      })(),
      timeoutMs: (() {
        final value = json['timeoutMs'];
        if (value is! int) {
          throw FormatException('HealthCheckResponse.timeoutMs is required');
        }
        return value;
      })(),
      retryCount: (() {
        final value = json['retryCount'];
        if (value is! int) {
          throw FormatException('HealthCheckResponse.retryCount is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('HealthCheckResponse.status is required');
        }
        return value;
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('HealthCheckResponse.createdAt is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'checkType': checkType,
      'checkUrl': checkUrl,
      'checkInterval': checkInterval,
      'timeoutMs': timeoutMs,
      'retryCount': retryCount,
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkApiResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkApiResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkApiResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkApiResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkApiResponse.traceId is required');
        }
        return value;
      })()
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
  final Map<String, dynamic> item;

  SdkWorkResourceData({
    required this.item
  });

  factory SdkWorkResourceData.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceData(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('SdkWorkResourceData.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class SdkWorkPageData {
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;

  SdkWorkPageData({
    required this.items,
    required this.pageInfo
  });

  factory SdkWorkPageData.fromJson(Map<String, dynamic> json) {
    return SdkWorkPageData(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('SdkWorkPageData.items is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('SdkWorkPageData.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class SdkWorkCommandData {
  final bool accepted;
  final String? resourceId;
  final String? status;

  SdkWorkCommandData({
    required this.accepted,
    this.resourceId,
    this.status
  });

  factory SdkWorkCommandData.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandData(
      accepted: (() {
        final value = json['accepted'];
        if (value is! bool) {
          throw FormatException('SdkWorkCommandData.accepted is required');
        }
        return value;
      })(),
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
  final String mode;
  final int? page;
  final int? pageSize;
  final String? totalItems;
  final int? totalPages;
  final String? nextCursor;
  final bool? hasMore;

  PageInfo({
    required this.mode,
    this.page,
    this.pageSize,
    this.totalItems,
    this.totalPages,
    this.nextCursor,
    this.hasMore
  });

  factory PageInfo.fromJson(Map<String, dynamic> json) {
    return PageInfo(
      mode: (() {
        final value = json['mode']?.toString();
        if (value == null) {
          throw FormatException('PageInfo.mode is required');
        }
        return value;
      })(),
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
  final String field;
  final String message;
  final int? code;

  FieldError({
    required this.field,
    required this.message,
    this.code
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      field: (() {
        final value = json['field']?.toString();
        if (value == null) {
          throw FormatException('FieldError.field is required');
        }
        return value;
      })(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('FieldError.message is required');
        }
        return value;
      })(),
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkResourceResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkResourceResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkResourceResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkResourceResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkListResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkListResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkCommandResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkCommandResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkCommandResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkCommandResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesListResponse.fromJson(Map<String, dynamic> json) {
    return SitesListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesCreateResponse201.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesRetrieveResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesRetrieveResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesRetrieveResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesRetrieveResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesRetrieveResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesUpdateResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesUpdateResponse.fromJson(Map<String, dynamic> json) {
    return SitesUpdateResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesUpdateResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesUpdateResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesUpdateResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesActivateResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesActivateResponse.fromJson(Map<String, dynamic> json) {
    return SitesActivateResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesActivateResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesActivateResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesActivateResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesPauseResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesPauseResponse.fromJson(Map<String, dynamic> json) {
    return SitesPauseResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesPauseResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesPauseResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesPauseResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesDomainsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsCreateResponse201.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsRetrieveResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsRetrieveResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsRetrieveResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsRetrieveResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsRetrieveResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsVerifyResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsVerifyResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsVerifyResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsVerifyResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsVerifyResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsVerifyResponse.traceId is required');
        }
        return value;
      })()
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

class SitesDomainsListenerCertificateBindingsListResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsListenerCertificateBindingsListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsListenerCertificateBindingsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesDomainsListenerCertificateBindingsListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsListenerCertificateBindingsListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsListenerCertificateBindingsListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsListenerCertificateBindingsListResponse.traceId is required');
        }
        return value;
      })()
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

class SitesDomainsListenerCertificateBindingsCreateResponse201 {
  final int code;
  final dynamic data;
  final String traceId;

  SitesDomainsListenerCertificateBindingsCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDomainsListenerCertificateBindingsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesDomainsListenerCertificateBindingsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDomainsListenerCertificateBindingsCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDomainsListenerCertificateBindingsCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDomainsListenerCertificateBindingsCreateResponse201.traceId is required');
        }
        return value;
      })()
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

class SitesSourceVersionsListResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SitesSourceVersionsListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesSourceVersionsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesSourceVersionsListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesSourceVersionsListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesSourceVersionsListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesSourceVersionsListResponse.traceId is required');
        }
        return value;
      })()
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

class SitesSourceVersionsCreateResponse201 {
  final int code;
  final dynamic data;
  final String traceId;

  SitesSourceVersionsCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesSourceVersionsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesSourceVersionsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesSourceVersionsCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesSourceVersionsCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesSourceVersionsCreateResponse201.traceId is required');
        }
        return value;
      })()
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

class SitesSourceVersionsGitImportCreateResponse201 {
  final int code;
  final dynamic data;
  final String traceId;

  SitesSourceVersionsGitImportCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesSourceVersionsGitImportCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesSourceVersionsGitImportCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesSourceVersionsGitImportCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesSourceVersionsGitImportCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesSourceVersionsGitImportCreateResponse201.traceId is required');
        }
        return value;
      })()
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

class SitesSourceVersionsRetrieveResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SitesSourceVersionsRetrieveResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesSourceVersionsRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesSourceVersionsRetrieveResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesSourceVersionsRetrieveResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesSourceVersionsRetrieveResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesSourceVersionsRetrieveResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDeploymentsListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDeploymentsListResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDeploymentsListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDeploymentsListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDeploymentsListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDeploymentsCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDeploymentsCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDeploymentsCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDeploymentsCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDeploymentsCreateResponse201.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDeploymentsRetrieveResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDeploymentsRetrieveResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsRetrieveResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDeploymentsRetrieveResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDeploymentsRetrieveResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDeploymentsRetrieveResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesDeploymentsRollbackResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesDeploymentsRollbackResponse.fromJson(Map<String, dynamic> json) {
    return SitesDeploymentsRollbackResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesDeploymentsRollbackResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesDeploymentsRollbackResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesDeploymentsRollbackResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesEnvVariablesListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesEnvVariablesListResponse.fromJson(Map<String, dynamic> json) {
    return SitesEnvVariablesListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesEnvVariablesListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesEnvVariablesListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesEnvVariablesListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesEnvVariablesCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesEnvVariablesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesEnvVariablesCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesEnvVariablesCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesEnvVariablesCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesEnvVariablesCreateResponse201.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  CertificatesListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CertificatesListResponse.fromJson(Map<String, dynamic> json) {
    return CertificatesListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CertificatesListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('CertificatesListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CertificatesListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  CertificatesCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CertificatesCreateResponse201.fromJson(Map<String, dynamic> json) {
    return CertificatesCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CertificatesCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('CertificatesCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CertificatesCreateResponse201.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesHealthChecksListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesHealthChecksListResponse.fromJson(Map<String, dynamic> json) {
    return SitesHealthChecksListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesHealthChecksListResponse.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesHealthChecksListResponse.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesHealthChecksListResponse.traceId is required');
        }
        return value;
      })()
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
  final int code;
  final dynamic data;
  final String traceId;

  SitesHealthChecksCreateResponse201({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SitesHealthChecksCreateResponse201.fromJson(Map<String, dynamic> json) {
    return SitesHealthChecksCreateResponse201(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SitesHealthChecksCreateResponse201.code is required');
        }
        return value;
      })(),
      data: (() {
        final map = _sdkworkAsMap(json['data']);
        if (map == null) {
          throw FormatException('SitesHealthChecksCreateResponse201.data is required');
        }
        return map;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SitesHealthChecksCreateResponse201.traceId is required');
        }
        return value;
      })()
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
