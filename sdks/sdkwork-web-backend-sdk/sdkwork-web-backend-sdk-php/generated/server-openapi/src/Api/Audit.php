<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Api;

use SDKWork\Web\BackendSdk\Models\AuditLogsListResponse;

final class AuditApi extends BaseApi
{
    /** List audit logs */
    public function logsList(?int $page = null, ?int $pageSize = null, ?string $targetType = null, ?string $action = null, ?string $operatorId = null, ?string $startDate = null, ?string $endDate = null): ?AuditLogsListResponse
    {
        $path = '/backend/v3/api/audit_logs';
        $query = $this->buildQueryString([
            new QueryParameterSpec('page', $page, 'form', true, false, null),
            new QueryParameterSpec('page_size', $pageSize, 'form', true, false, null),
            new QueryParameterSpec('targetType', $targetType, 'form', true, false, null),
            new QueryParameterSpec('action', $action, 'form', true, false, null),
            new QueryParameterSpec('operatorId', $operatorId, 'form', true, false, null),
            new QueryParameterSpec('startDate', $startDate, 'form', true, false, null),
            new QueryParameterSpec('endDate', $endDate, 'form', true, false, null),
        ]);
        $path = $this->appendQueryString($path, $query);
        $result = $this->client->request('GET', $path, []);
        return is_array($result) ? AuditLogsListResponse::fromArray($result) : null;
    }

}
