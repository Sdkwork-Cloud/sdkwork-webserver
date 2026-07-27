<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Api;

use SDKWork\Web\AppSdk\Models\CreateEnvVariableRequest;
use SDKWork\Web\AppSdk\Models\SitesEnvVariablesCreateResponse201;
use SDKWork\Web\AppSdk\Models\SitesEnvVariablesListResponse;

final class EnvVariableApi extends BaseApi
{
    /** 获取环境变量列表 */
    public function sitesEnvVariablesList(string $siteId, ?string $environment = null): ?SitesEnvVariablesListResponse
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/env_variables', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('environment', $environment, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? SitesEnvVariablesListResponse::fromArray($result) : null;
    }

    /** 创建环境变量 */
    public function sitesEnvVariablesCreate(string $siteId, array|CreateEnvVariableRequest $body): ?SitesEnvVariablesCreateResponse201
    {
        $path = $this->interpolatePath('/app/v3/api/sites/{siteId}/env_variables', ['siteId' => $this->serializePathParameter($siteId, new PathParameterSpec('siteId', 'simple', false))]);
        $payload = $body instanceof CreateEnvVariableRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? SitesEnvVariablesCreateResponse201::fromArray($result) : null;
    }

}
