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
    public function sitesDomainsCreate(string $siteId, array|CreateDomainRequest $body): ?SitesDomainsCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateDomainRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
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

    /** 验证域名所有权 */
    public function sitesDomainsVerify(string $siteId, string $domainId): ?SitesDomainsVerifyResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/domains/{domainId}/verify', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false)), 'domainId' => $this->serializePathParameter($domainId, new PathParameterSpec('domainId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? SitesDomainsVerifyResponse::fromArray($result) : null;
    }

}
