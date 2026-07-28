<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\CertificatesCreateResponse201;
use SDKWork\Web\BackendSdk\Models\CertificatesListResponse;
use SDKWork\Web\BackendSdk\Models\CertificatesRenewResponse;
use SDKWork\Web\BackendSdk\Models\CertificatesUpdateResponse;
use SDKWork\Web\BackendSdk\Models\CreateCertificateRequest;
use SDKWork\Web\BackendSdk\Models\UpdateCertificateRequest;

final class CertificateApi extends BaseApi
{
    /** List canonical certificates */
    public function certificatesList(?int $page = null, ?int $pageSize = null): ?CertificatesListResponse
    {
        $path = '/backend/v3/api/certificates';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? CertificatesListResponse::fromArray($result) : null;
    }

    /** Issue a canonical certificate */
    public function certificatesCreate(array|CreateCertificateRequest $body, string $idempotencyKey): ?CertificatesCreateResponse201
    {
        $path = '/backend/v3/api/certificates';
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

    /** Update certificate automatic renewal policy */
    public function certificatesUpdate(string $certificateId, array|UpdateCertificateRequest $body, string $idempotencyKey): ?CertificatesUpdateResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/certificates/{certificateId}', ['certificateId' => $this->serializePathParameter($certificateId, new PathParameterSpec('certificateId', 'simple', false))]);
        $payload = $body instanceof UpdateCertificateRequest ? $body->toArray() : $body;
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('PUT', $path, [
            'headers' => $requestHeaders,
            'json' => $payload,
        ]);
        return is_array($result) ? CertificatesUpdateResponse::fromArray($result) : null;
    }

    /** Renew a canonical certificate now */
    public function certificatesRenew(string $certificateId, string $idempotencyKey): ?CertificatesRenewResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/certificates/{certificateId}/renew', ['certificateId' => $this->serializePathParameter($certificateId, new PathParameterSpec('certificateId', 'simple', false))]);
        $requestHeaders = $this->buildRequestHeaders(
            [
                'Idempotency-Key' => new HeaderParameterSpec($idempotencyKey, 'simple', false, null),
            ],
            []
        );
        $result = $this->client->request('POST', $path, [
            'headers' => $requestHeaders,
        ]);
        return is_array($result) ? CertificatesRenewResponse::fromArray($result) : null;
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
