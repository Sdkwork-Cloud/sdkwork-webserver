<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateDeploymentRequest;
use SDKWork\Web\AppSdk\Models\SitesDeploymentsCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesDeploymentsListResponse;
use SDKWork\Web\AppSdk\Models\SitesDeploymentsRetrieveResponse;
use SDKWork\Web\AppSdk\Models\SitesDeploymentsRollbackResponse;

final class DeploymentApi extends BaseApi
{
    /** 获取部署历史 */
    public function sitesDeploymentsList(string $siteId, ?int $page = null, ?int $pageSize = null, ?int $status = null): ?SitesDeploymentsListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/deployments', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesDeploymentsListResponse::fromArray($result) : null;
    }

    /** 发起部署 */
    public function sitesDeploymentsCreate(string $siteId, array|CreateDeploymentRequest $body, string $idempotencyKey): ?SitesDeploymentsCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/deployments', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateDeploymentRequest ? $body->toArray() : $body;
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
        return is_array($result) ? SitesDeploymentsCreateResponse201::fromArray($result) : null;
    }

    /** 获取部署详情 */
    public function sitesDeploymentsRetrieve(string $siteId, string $deploymentId): ?SitesDeploymentsRetrieveResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/deployments/{deploymentId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'deploymentId' => $this->serializePathParameter($deploymentId, new PathParameterSpec('deploymentId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesDeploymentsRetrieveResponse::fromArray($result) : null;
    }

    /** 回滚部署 */
    public function sitesDeploymentsRollback(string $siteId, string $deploymentId, string $idempotencyKey): ?SitesDeploymentsRollbackResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/deployments/{deploymentId}/rollback', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'deploymentId' => $this->serializePathParameter($deploymentId, new PathParameterSpec('deploymentId', 'simple', false))]);
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('POST', $path, [
            'headers' => $requestHeaders,
        ]);
        return is_array($result) ? SitesDeploymentsRollbackResponse::fromArray($result) : null;
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
