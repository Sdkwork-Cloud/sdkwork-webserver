<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\CreateServerRequest;
use SDKWork\Web\BackendSdk\Models\ServersCreateResponse201;
use SDKWork\Web\BackendSdk\Models\ServersListResponse;

final class ServerApi extends BaseApi
{
    /** List managed servers */
    public function serversList(?int $page = null, ?int $pageSize = null): ?ServersListResponse
    {
        $path = '/backend/v3/api/servers';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ServersListResponse::fromArray($result) : null;
    }

    /** Register a managed server */
    public function serversCreate(array|CreateServerRequest $body): ?ServersCreateResponse201
    {
        $path = '/backend/v3/api/servers';
        $payload = $body instanceof CreateServerRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ServersCreateResponse201::fromArray($result) : null;
    }

}
