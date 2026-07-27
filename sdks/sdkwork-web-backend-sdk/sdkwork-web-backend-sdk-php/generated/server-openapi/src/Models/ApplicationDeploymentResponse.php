<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Models;

final class ApplicationDeploymentResponse
{
    public ?string $id = null;

    public ?string $siteId = null;

    public ?int $status = null;

    public ?int $deployType = null;

    public ?string $createdAt = null;

    public function __construct(array $data = [])
    {
        $this->id = array_key_exists('id', $data)
            ? $data['id']
            : null;
        $this->siteId = array_key_exists('siteId', $data)
            ? $data['siteId']
            : null;
        $this->status = array_key_exists('status', $data)
            ? $data['status']
            : null;
        $this->deployType = array_key_exists('deployType', $data)
            ? $data['deployType']
            : null;
        $this->createdAt = array_key_exists('createdAt', $data)
            ? $data['createdAt']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'siteId' => $this->siteId,
            'status' => $this->status,
            'deployType' => $this->deployType,
            'createdAt' => $this->createdAt,
        ];
    }
}
