<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\ApplicationsCreateResponse201;
use SDKWork\Web\BackendSdk\Models\ApplicationsListResponse;
use SDKWork\Web\BackendSdk\Models\CreateApplicationRequest;

final class ApplicationApi extends BaseApi
{
    /** List managed applications */
    public function applicationsList(?int $page = null, ?int $pageSize = null, ?string $applicationType = null, ?int $siteType = null, ?int $status = null, ?string $keyword = null): ?ApplicationsListResponse
    {
        $path = '/backend/v3/api/applications';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('applicationType', $applicationType, 'form', true, false, null),
            new QueryParameterSpec('siteType', $siteType, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
            new QueryParameterSpec('keyword', $keyword, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ApplicationsListResponse::fromArray($result) : null;
    }

    /** Create a managed application */
    public function applicationsCreate(array|CreateApplicationRequest $body): ?ApplicationsCreateResponse201
    {
        $path = '/backend/v3/api/applications';
        $payload = $body instanceof CreateApplicationRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ApplicationsCreateResponse201::fromArray($result) : null;
    }

}
