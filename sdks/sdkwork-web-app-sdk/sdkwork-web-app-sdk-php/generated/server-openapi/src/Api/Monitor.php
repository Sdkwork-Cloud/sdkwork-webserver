<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateHealthCheckRequest;
use SDKWork\Web\AppSdk\Models\SitesHealthChecksCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesHealthChecksListResponse;

final class MonitorApi extends BaseApi
{
    /** 获取健康检查配置 */
    public function sitesHealthChecksList(string $siteId): ?SitesHealthChecksListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/health_checks', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesHealthChecksListResponse::fromArray($result) : null;
    }

    /** 创建健康检查 */
    public function sitesHealthChecksCreate(string $siteId, array|CreateHealthCheckRequest $body): ?SitesHealthChecksCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/health_checks', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateHealthCheckRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SitesHealthChecksCreateResponse201::fromArray($result) : null;
    }

}
