<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\ConfigsCreateResponse201;
use SDKWork\Web\BackendSdk\Models\ConfigsDeployResponse;
use SDKWork\Web\BackendSdk\Models\ConfigsListResponse;
use SDKWork\Web\BackendSdk\Models\ConfigsRetrieveResponse;
use SDKWork\Web\BackendSdk\Models\ConfigsUpdateResponse;
use SDKWork\Web\BackendSdk\Models\ConfigsValidateResponse;
use SDKWork\Web\BackendSdk\Models\CreateNginxConfigRequest;
use SDKWork\Web\BackendSdk\Models\ReloadResponse;
use SDKWork\Web\BackendSdk\Models\StatusRetrieveResponse;
use SDKWork\Web\BackendSdk\Models\UpdateNginxConfigRequest;

final class NginxApi extends BaseApi
{
    /** List Nginx configurations */
    public function configsList(?int $page = null, ?int $pageSize = null, ?string $siteId = null, ?int $configType = null, ?bool $isActive = null): ?ConfigsListResponse
    {
        $path = '/backend/v3/api/nginx/configs';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('siteId', $siteId, 'form', true, false, null),
            new QueryParameterSpec('configType', $configType, 'form', true, false, null),
            new QueryParameterSpec('isActive', $isActive, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ConfigsListResponse::fromArray($result) : null;
    }

    /** Create an Nginx configuration */
    public function configsCreate(array|CreateNginxConfigRequest $body): ?ConfigsCreateResponse201
    {
        $path = '/backend/v3/api/nginx/configs';
        $payload = $body instanceof CreateNginxConfigRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ConfigsCreateResponse201::fromArray($result) : null;
    }

    /** Retrieve an Nginx configuration */
    public function configsRetrieve(string $configId): ?ConfigsRetrieveResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/nginx/etc/{configId}', ['configId' => $this->serializePathParameter($configId, new PathParameterSpec('configId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ConfigsRetrieveResponse::fromArray($result) : null;
    }

    /** Update an Nginx configuration */
    public function configsUpdate(string $configId, array|UpdateNginxConfigRequest $body): ?ConfigsUpdateResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/nginx/etc/{configId}', ['configId' => $this->serializePathParameter($configId, new PathParameterSpec('configId', 'simple', false))]);
        $payload = $body instanceof UpdateNginxConfigRequest ? $body->toArray() : $body;
        $result = $this->client->request('PUT', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ConfigsUpdateResponse::fromArray($result) : null;
    }

    /** Validate an Nginx configuration */
    public function configsValidate(string $configId): ?ConfigsValidateResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/nginx/etc/{configId}/validate', ['configId' => $this->serializePathParameter($configId, new PathParameterSpec('configId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? ConfigsValidateResponse::fromArray($result) : null;
    }

    /** Deploy an Nginx configuration */
    public function configsDeploy(string $configId): ?ConfigsDeployResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/nginx/etc/{configId}/deploy', ['configId' => $this->serializePathParameter($configId, new PathParameterSpec('configId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? ConfigsDeployResponse::fromArray($result) : null;
    }

    /** Reload Nginx */
    public function reload(): ?ReloadResponse
    {
        $path = '/backend/v3/api/nginx/reload';
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? ReloadResponse::fromArray($result) : null;
    }

    /** Retrieve Nginx status */
    public function statusRetrieve(): ?StatusRetrieveResponse
    {
        $path = '/backend/v3/api/nginx/status';
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? StatusRetrieveResponse::fromArray($result) : null;
    }

}
