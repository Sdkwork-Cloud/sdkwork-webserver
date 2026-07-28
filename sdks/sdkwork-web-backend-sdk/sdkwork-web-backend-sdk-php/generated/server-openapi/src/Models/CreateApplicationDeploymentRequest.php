<?php

declare(strict_types=1);

namespace SDKWork\Web\BackendSdk\Models;

final class CreateApplicationDeploymentRequest
{
    public ?int $deployType = null;

    public ?string $environment = null;

    public ?string $versionTag = null;

    public ?string $commitHash = null;

    public ?string $sourceRef = null;

    /** Stable Drive resource identity. Signed delivery URLs are forbidden. */
    public ?string $artifactDriveUri = null;

    public ?string $artifactSize = null;

    /** Lowercase SHA-256 hexadecimal digest of the uploaded package. */
    public ?string $artifactHash = null;

    public function __construct(array $data = [])
    {
        $this->deployType = array_key_exists('deployType', $data)
            ? $data['deployType']
            : null;
        $this->environment = array_key_exists('environment', $data)
            ? $data['environment']
            : null;
        $this->versionTag = array_key_exists('versionTag', $data)
            ? $data['versionTag']
            : null;
        $this->commitHash = array_key_exists('commitHash', $data)
            ? $data['commitHash']
            : null;
        $this->sourceRef = array_key_exists('sourceRef', $data)
            ? $data['sourceRef']
            : null;
        $this->artifactDriveUri = array_key_exists('artifactDriveUri', $data)
            ? $data['artifactDriveUri']
            : null;
        $this->artifactSize = array_key_exists('artifactSize', $data)
            ? $data['artifactSize']
            : null;
        $this->artifactHash = array_key_exists('artifactHash', $data)
            ? $data['artifactHash']
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
            'versionTag' => $this->versionTag,
            'commitHash' => $this->commitHash,
            'sourceRef' => $this->sourceRef,
            'artifactDriveUri' => $this->artifactDriveUri,
            'artifactSize' => $this->artifactSize,
            'artifactHash' => $this->artifactHash,
        ];
    }
}
