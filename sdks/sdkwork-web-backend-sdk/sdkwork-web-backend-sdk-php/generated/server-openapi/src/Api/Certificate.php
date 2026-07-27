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
    public function certificatesCreate(array|CreateCertificateRequest $body): ?CertificatesCreateResponse201
    {
        $path = '/backend/v3/api/certificates';
        $payload = $body instanceof CreateCertificateRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? CertificatesCreateResponse201::fromArray($result) : null;
    }

    /** Update certificate automatic renewal policy */
    public function certificatesUpdate(string $certificateId, array|UpdateCertificateRequest $body): ?CertificatesUpdateResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/certificates/{certificateId}', ['certificateId' => $this->serializePathParameter($certificateId, new PathParameterSpec('certificateId', 'simple', false))]);
        $payload = $body instanceof UpdateCertificateRequest ? $body->toArray() : $body;
        $result = $this->client->request('PUT', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? CertificatesUpdateResponse::fromArray($result) : null;
    }

    /** Renew a canonical certificate now */
    public function certificatesRenew(string $certificateId): ?CertificatesRenewResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/certificates/{certificateId}/renew', ['certificateId' => $this->serializePathParameter($certificateId, new PathParameterSpec('certificateId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? CertificatesRenewResponse::fromArray($result) : null;
    }

}
