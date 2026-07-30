<?php

declare(strict_types=1);

namespace SDKWork\Web\AppSdk\Models;

final class CertificateResponse
{
    public ?string $id = null;

    public ?string $certName = null;

    public ?string $domain = null;

    public ?string $domainId = null;

    public ?int $certType = null;

    public ?string $issuer = null;

    public ?string $fingerprint = null;

    public ?string $notBefore = null;

    public ?string $notAfter = null;

    public ?bool $autoRenew = null;

    /** 0=idle, 1=renewing, 2=pending, 3=failed */
    public ?int $renewalStatus = null;

    /** 0=pending, 1=active, 2=expired, 3=revoked, 4=archived */
    public ?int $status = null;

    public ?string $createdAt = null;

    public function __construct(array $data = [])
    {
        $this->id = array_key_exists('id', $data)
            ? $data['id']
            : null;
        $this->certName = array_key_exists('certName', $data)
            ? $data['certName']
            : null;
        $this->domain = array_key_exists('domain', $data)
            ? $data['domain']
            : null;
        $this->domainId = array_key_exists('domainId', $data)
            ? $data['domainId']
            : null;
        $this->certType = array_key_exists('certType', $data)
            ? $data['certType']
            : null;
        $this->issuer = array_key_exists('issuer', $data)
            ? $data['issuer']
            : null;
        $this->fingerprint = array_key_exists('fingerprint', $data)
            ? $data['fingerprint']
            : null;
        $this->notBefore = array_key_exists('notBefore', $data)
            ? $data['notBefore']
            : null;
        $this->notAfter = array_key_exists('notAfter', $data)
            ? $data['notAfter']
            : null;
        $this->autoRenew = array_key_exists('autoRenew', $data)
            ? $data['autoRenew']
            : null;
        $this->renewalStatus = array_key_exists('renewalStatus', $data)
            ? $data['renewalStatus']
            : null;
        $this->status = array_key_exists('status', $data)
            ? $data['status']
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
            'certName' => $this->certName,
            'domain' => $this->domain,
            'domainId' => $this->domainId,
            'certType' => $this->certType,
            'issuer' => $this->issuer,
            'fingerprint' => $this->fingerprint,
            'notBefore' => $this->notBefore,
            'notAfter' => $this->notAfter,
            'autoRenew' => $this->autoRenew,
            'renewalStatus' => $this->renewalStatus,
            'status' => $this->status,
            'createdAt' => $this->createdAt,
        ];
    }
}
