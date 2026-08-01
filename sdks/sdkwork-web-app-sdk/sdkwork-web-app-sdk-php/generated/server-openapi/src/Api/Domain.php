<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateDomainRequest;
use SDKWork\Web\AppSdk\Models\SitesDomainsCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesDomainsListResponse;
use SDKWork\Web\AppSdk\Models\SitesDomainsRetrieveResponse;
use SDKWork\Web\AppSdk\Models\SitesDomainsVerifyResponse;

final class DomainApi extends BaseApi
{
    /** 获取站点域名列表 */
    public function sitesDomainsList(string $siteId, ?int $page = null, ?int $pageSize = null): ?SitesDomainsListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesDomainsListResponse::fromArray($result) : null;
    }

    /** 绑定域名 */
    public function sitesDomainsCreate(string $siteId, array|CreateDomainRequest $body, string $idempotencyKey): ?SitesDomainsCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateDomainRequest ? $body->toArray() : $body;
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
        return is_array($result) ? SitesDomainsCreateResponse201::fromArray($result) : null;
    }

    /** 获取域名详情 */
    public function sitesDomainsRetrieve(string $siteId, string $domainId): ?SitesDomainsRetrieveResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesDomainsRetrieveResponse::fromArray($result) : null;
    }

    /** 解绑域名 */
    public function sitesDomainsDelete(string $siteId, string $domainId): mixed
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $result = $this->client->request('DELETE', $path, []);
        return $result;
    }

    /** 创建或检查域名所有权验证挑战 */
    public function sitesDomainsVerify(string $siteId, string $domainId, string $idempotencyKey): ?SitesDomainsVerifyResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}/verify', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('POST', $path, [
            'headers' => $requestHeaders,
        ]);
        return is_array($result) ? SitesDomainsVerifyResponse::fromArray($result) : null;
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
