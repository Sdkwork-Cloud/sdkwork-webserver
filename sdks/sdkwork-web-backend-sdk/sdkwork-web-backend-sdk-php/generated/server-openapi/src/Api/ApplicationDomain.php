<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\ApplicationsDomainsCreateResponse201;
use SDKWork\Web\BackendSdk\Models\ApplicationsDomainsListResponse;
use SDKWork\Web\BackendSdk\Models\ApplicationsDomainsVerifyResponse;
use SDKWork\Web\BackendSdk\Models\CreateApplicationDomainRequest;

final class ApplicationDomainApi extends BaseApi
{
    /** List application domains */
    public function applicationsDomainsList(string $applicationId, ?int $page = null, ?int $pageSize = null): ?ApplicationsDomainsListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/domains', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ApplicationsDomainsListResponse::fromArray($result) : null;
    }

    /** Bind a public domain to an application */
    public function applicationsDomainsCreate(string $applicationId, array|CreateApplicationDomainRequest $body): ?ApplicationsDomainsCreateResponse201
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/domains', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false))]);
        $payload = $body instanceof CreateApplicationDomainRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ApplicationsDomainsCreateResponse201::fromArray($result) : null;
    }

    /** Verify an application public domain */
    public function applicationsDomainsVerify(string $applicationId, string $domainId): ?ApplicationsDomainsVerifyResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/domains/{domainId}/verify', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? ApplicationsDomainsVerifyResponse::fromArray($result) : null;
    }

}
