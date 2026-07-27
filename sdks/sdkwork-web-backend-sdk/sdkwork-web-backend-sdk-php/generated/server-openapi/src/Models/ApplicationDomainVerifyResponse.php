<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Models;

final class ApplicationDomainVerifyResponse
{
    public ?bool $verified = null;

    public ?string $verifyToken = null;

    public function __construct(array $data = [])
    {
        $this->verified = array_key_exists('verified', $data)
            ? $data['verified']
            : null;
        $this->verifyToken = array_key_exists('verifyToken', $data)
            ? $data['verifyToken']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'verified' => $this->verified,
            'verifyToken' => $this->verifyToken,
        ];
    }
}
