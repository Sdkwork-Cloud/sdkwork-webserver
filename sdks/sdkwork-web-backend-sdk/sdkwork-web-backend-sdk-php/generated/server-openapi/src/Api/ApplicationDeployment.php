<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\ApplicationsDeploymentsCreateResponse201;
use SDKWork\Web\BackendSdk\Models\ApplicationsDeploymentsListResponse;
use SDKWork\Web\BackendSdk\Models\ApplicationsDeploymentsRollbackResponse;
use SDKWork\Web\BackendSdk\Models\CreateApplicationDeploymentRequest;

final class ApplicationDeploymentApi extends BaseApi
{
    /** List application deployments */
    public function applicationsDeploymentsList(string $applicationId, ?int $page = null, ?int $pageSize = null, ?int $status = null): ?ApplicationsDeploymentsListResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/deployments', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false))]);
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('status', $status, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? ApplicationsDeploymentsListResponse::fromArray($result) : null;
    }

    /** Deploy an application */
    public function applicationsDeploymentsCreate(string $applicationId, array|CreateApplicationDeploymentRequest $body): ?ApplicationsDeploymentsCreateResponse201
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/deployments', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false))]);
        $payload = $body instanceof CreateApplicationDeploymentRequest ? $body->toArray() : $body;
        $result = $this->client->request('POST', $path, [
            'json' => $payload,
        ]);
        return is_array($result) ? ApplicationsDeploymentsCreateResponse201::fromArray($result) : null;
    }

    /** Roll back a managed application deployment */
    public function applicationsDeploymentsRollback(string $applicationId, string $deploymentId): ?ApplicationsDeploymentsRollbackResponse
    {
        $path = $this->interpolatePath('/backend/v3/api/applications/{applicationId}/deployments/{deploymentId}/rollback', ['applicationId' => $this->serializePathParameter($applicationId, new PathParameterSpec('applicationId', 'simple', false)), 'deploymentId' => $this->serializePathParameter($deploymentId, new PathParameterSpec('deploymentId', 'simple', false))]);
        $result = $this->client->request('POST', $path, []);
        return is_array($result) ? ApplicationsDeploymentsRollbackResponse::fromArray($result) : null;
    }

}
