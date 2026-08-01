<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateSiteRequest;
use SDKWork\Web\AppSdk\Models\SitesActivateResponse;
use SDKWork\Web\AppSdk\Models\SitesCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesListResponse;
use SDKWork\Web\AppSdk\Models\SitesPauseResponse;
use SDKWork\Web\AppSdk\Models\SitesRetrieveResponse;
use SDKWork\Web\AppSdk\Models\SitesUpdateResponse;
use SDKWork\Web\AppSdk\Models\UpdateSiteRequest;

final class SiteApi extends BaseApi
{
    /** 获取站点列表 */
    public function sitesList(?int $page = null, ?int $pageSize = null, ?int $status = null, ?string $applicationType = null, ?int $siteType = null, ?string $keyword = null): ?SitesListResponse
    {
        $path = '/app/v3/api/sites';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
            new QueryParameterSpec('application_type', $applicationType, 'form', true, false, null),
            new QueryParameterSpec('site_type', $siteType, 'form', true, false, null),
            new QueryParameterSpec('keyword', $keyword, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesListResponse::fromArray($result) : null;
    }

    /** 创建站点 */
    public function sitesCreate(array|CreateSiteRequest $body, string $idempotencyKey): ?SitesCreateResponse201
    {
        $path = '/app/v3/api/sites';
        $payload = $body instanceof CreateSiteRequest ? $body->toArray() : $body;
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('POST', $path, [
            'headers' => $requestHeaders,
            'json' => $payload,
        ]);
        return is_array($result) ? SitesCreateResponse201::fromArray($result) : null;
    }

    /** 获取站点详情 */
    public function sitesRetrieve(string $siteId): ?SitesRetrieveResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesRetrieveResponse::fromArray($result) : null;
    }

    /** 更新站点 */
    public function sitesUpdate(string $siteId, array|UpdateSiteRequest $body, string $idempotencyKey): ?SitesUpdateResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof UpdateSiteRequest ? $body->toArray() : $body;
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('PATCH', $path, [
            'headers' => $requestHeaders,
            'json' => $payload,
        ]);
        return is_array($result) ? SitesUpdateResponse::fromArray($result) : null;
    }

    /** 删除站点 */
    public function sitesDelete(string $siteId): mixed
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** 激活站点 */
    public function sitesActivate(string $siteId): ?SitesActivateResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/activate', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? SitesActivateResponse::fromArray($result) : null;
    }

    /** 暂停站点 */
    public function sitesPause(string $siteId): ?SitesPauseResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/pause', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? SitesPauseResponse::fromArray($result) : null;
    }

    private function buildRequestHeaders(array $headers, array $cookies): array
    {
        $requestHeaders = [];
        foreach ($headers as $name => $parameter) {
            $serialized = $this->serializeParameterValue($parameter);
            if ($serialized !== null) {
                $requestHeaders[(string) $name] = $serialized;
            }
        }

        $cookieHeader = $this->buildCookieHeader($cookies);
        if ($cookieHeader !== '') {
            $requestHeaders['Cookie'] = isset($requestHeaders['Cookie']) && $requestHeaders['Cookie'] !== ''
                ? $requestHeaders['Cookie'] . '; ' . $cookieHeader
                : $cookieHeader;
        }

        return $requestHeaders;
    }

    private function buildCookieHeader(array $cookies): string
    {
        $pairs = [];
        foreach ($cookies as $name => $parameter) {
            $serialized = $this->serializeParameterValue($parameter);
            if ($serialized !== null) {
                $pairs[] = rawurlencode((string) $name) . '=' . rawurlencode($serialized);
            }
        }

        return implode('; ', $pairs);
    }

    private function serializeParameterValue(?HeaderParameterSpec $parameter): ?string
    {
        $value = $parameter?->value;
        if ($value === null) {
            return null;
        }
        if ($parameter->contentType !== null && trim($parameter->contentType) !== '') {
            return (string) json_encode($value, JSON_UNESCAPED_SLASHES);
        }
        if (is_array($value)) {
            $serialized = [];
            foreach ($value as $key => $item) {
                if ($item === null) {
                    continue;
                }
                if (!array_is_list($value) && $parameter->explode) {
                    $serialized[] = (string) $key . '=' . (string) $item;
                } elseif (!array_is_list($value)) {
                    $serialized[] = (string) $key;
                    $serialized[] = (string) $item;
                } else {
                    $serialized[] = (string) $item;
                }
            }
            return implode(',', $serialized);
        }
        if ($value instanceof \Stringable) {
            return (string) $value;
        }

        return (string) $value;
    }
}
