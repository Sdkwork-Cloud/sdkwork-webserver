<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CertificatesCreateResponse201;
use SDKWork\Web\AppSdk\Models\CertificatesListResponse;
use SDKWork\Web\AppSdk\Models\CreateCertificateRequest;

final class CertificateApi extends BaseApi
{
    /** 获取证书列表 */
    public function certificatesList(?int $page = null, ?int $pageSize = null): ?CertificatesListResponse
    {
        $path = '/app/v3/api/certificates';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? CertificatesListResponse::fromArray($result) : null;
    }

    /** 申请证书 */
    public function certificatesCreate(array|CreateCertificateRequest $body): ?CertificatesCreateResponse201
    {
        $path = '/app/v3/api/certificates';
        $payload = $body instanceof CreateCertificateRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? CertificatesCreateResponse201::fromArray($result) : null;
    }

}
