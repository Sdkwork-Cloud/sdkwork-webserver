<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Models;

final class CreateApplicationDeploymentRequest
{
    public ?int $deployType = null;

    public ?string $environment = null;

    public ?string $idempotencyKey = null;

    public function __construct(array $data = [])
    {
        $this->deployType = array_key_exists('deployType', $data)
            ? $data['deployType']
            : null;
        $this->environment = array_key_exists('environment', $data)
            ? $data['environment']
            : null;
        $this->idempotencyKey = array_key_exists('idempotencyKey', $data)
            ? $data['idempotencyKey']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'deployType' => $this->deployType,
            'environment' => $this->environment,
            'idempotencyKey' => $this->idempotencyKey,
        ];
    }
}
