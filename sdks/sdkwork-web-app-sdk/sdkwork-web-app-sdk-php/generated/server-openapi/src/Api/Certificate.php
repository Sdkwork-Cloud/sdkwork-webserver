<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CertificatesCreateResponse201;
use SDKWork\Web\AppSdk\Models\CertificatesListResponse;
use SDKWork\Web\AppSdk\Models\CreateCertificateRequest;
use SDKWork\Web\AppSdk\Models\CreateListenerCertificateBindingRequest;
use SDKWork\Web\AppSdk\Models\SitesDomainsListenerCertificateBindingsCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesDomainsListenerCertificateBindingsListResponse;

final class CertificateApi extends BaseApi
{
    /** List certificates active on the domain listener */
    public function sitesDomainsListenerCertificateBindingsList(string $siteId, string $domainId, ?int $page = null, ?int $pageSize = null): ?SitesDomainsListenerCertificateBindingsListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}/listener_certificate_bindings', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesDomainsListenerCertificateBindingsListResponse::fromArray($result) : null;
    }

    /** Bind a certificate version to the domain listener */
    public function sitesDomainsListenerCertificateBindingsCreate(string $siteId, string $domainId, array|CreateListenerCertificateBindingRequest $body, string $idempotencyKey): ?SitesDomainsListenerCertificateBindingsCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}/listener_certificate_bindings', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $payload = $body instanceof CreateListenerCertificateBindingRequest ? $body->toArray() : $body;
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
        return is_array($result) ? SitesDomainsListenerCertificateBindingsCreateResponse201::fromArray($result) : null;
    }

    /** Remove a certificate from the domain listener */
    public function sitesDomainsListenerCertificateBindingsDelete(string $siteId, string $domainId, string $bindingId, string $idempotencyKey): mixed
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}/listener_certificate_bindings/{bindingId}', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false)), 'bindingId' => $this->serializePathParameter($bindingId, new PathParameterSpec('bindingId', 'simple', false))]);
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('DELETE', $path, [
            'headers' => $requestHeaders,
        ]);
        return $result;
    }

    /** 获取证书列表 */
    public function certificatesList(?int $page = null, ?int $pageSize = null, ?string $siteId = null, ?string $domainId = null): ?CertificatesListResponse
    {
        $path = '/app/v3/api/certificates';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('siteId', $siteId, 'form', true, false, null),
            new QueryParameterSpec('domainId', $domainId, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? CertificatesListResponse::fromArray($result) : null;
    }

    /** 申请证书 */
    public function certificatesCreate(array|CreateCertificateRequest $body, string $idempotencyKey): ?CertificatesCreateResponse201
    {
        $path = '/app/v3/api/certificates';
        $payload = $body instanceof CreateCertificateRequest ? $body->toArray() : $body;
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
        return is_array($result) ? CertificatesCreateResponse201::fromArray($result) : null;
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
