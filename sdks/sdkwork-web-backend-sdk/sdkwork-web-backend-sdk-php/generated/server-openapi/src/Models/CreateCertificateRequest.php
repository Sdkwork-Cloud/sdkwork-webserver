<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Models;

final class CreateCertificateRequest
{
    public ?string $domainId = null;

    /** 1=Let's Encrypt, 3=self-signed. Custom import is a separate future workflow. */
    public ?int $certType = null;

    public ?bool $autoRenew = null;

    public function __construct(array $data = [])
    {
        $this->domainId = array_key_exists('domainId', $data)
            ? $data['domainId']
            : null;
        $this->certType = array_key_exists('certType', $data)
            ? $data['certType']
            : null;
        $this->autoRenew = array_key_exists('autoRenew', $data)
            ? $data['autoRenew']
            : null;
    }

    public static function fromArray(?array $data): ?self
    {
        return $data === null ? null : new self($data);
    }

    public function toArray(): array
    {
        return [
            'domainId' => $this->domainId,
            'certType' => $this->certType,
            'autoRenew' => $this->autoRenew,
        ];
    }
}
