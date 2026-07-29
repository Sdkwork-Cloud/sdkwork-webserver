<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateSourceVersionRequest;
use SDKWork\Web\AppSdk\Models\ImportGitSourceVersionRequest;
use SDKWork\Web\AppSdk\Models\SitesSourceVersionsCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesSourceVersionsImportGitResponse201;
use SDKWork\Web\AppSdk\Models\SitesSourceVersionsListResponse;
use SDKWork\Web\AppSdk\Models\SitesSourceVersionsRetrieveResponse;

final class SourceVersionApi extends BaseApi
{
    /** 获取应用源码版本 */
    public function sitesSourceVersionsList(string $siteId, ?int $page = null, ?int $pageSize = null): ?SitesSourceVersionsListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/source_versions', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesSourceVersionsListResponse::fromArray($result) : null;
    }

    /** 登记 Drive 中的应用源码版本 */
    public function sitesSourceVersionsCreate(string $siteId, array|CreateSourceVersionRequest $body, string $idempotencyKey): ?SitesSourceVersionsCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/source_versions', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateSourceVersionRequest ? $body->toArray() : $body;
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
        return is_array($result) ? SitesSourceVersionsCreateResponse201::fromArray($result) : null;
    }

    /** 从公共 Git 仓库导入应用源码版本 */
    public function sitesSourceVersionsImportGit(string $siteId, array|ImportGitSourceVersionRequest $body, string $idempotencyKey): ?SitesSourceVersionsImportGitResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/source_versions/git_import', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof ImportGitSourceVersionRequest ? $body->toArray() : $body;
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
        return is_array($result) ? SitesSourceVersionsImportGitResponse201::fromArray($result) : null;
    }

    /** 获取应用源码版本详情 */
    public function sitesSourceVersionsRetrieve(string $siteId, string $sourceVersionId): ?SitesSourceVersionsRetrieveResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/source_versions/{sourceVersionId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'sourceVersionId' => $this->serializePathParameter($sourceVersionId, new PathParameterSpec('sourceVersionId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesSourceVersionsRetrieveResponse::fromArray($result) : null;
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
