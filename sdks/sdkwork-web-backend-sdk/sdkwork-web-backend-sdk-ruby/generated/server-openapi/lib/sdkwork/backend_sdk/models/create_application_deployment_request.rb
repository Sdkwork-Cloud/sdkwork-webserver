module Sdkwork
  module BackendSdk
    module Models
      class CreateApplicationDeploymentRequest
              attr_accessor :deploy_type, :environment, :version_tag, :commit_hash, :source_ref, :artifact_drive_uri, :artifact_size, :artifact_hash

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @deploy_type = attributes['deployType']
                @environment = attributes['environment']
                @version_tag = attributes['versionTag']
                @commit_hash = attributes['commitHash']
                @source_ref = attributes['sourceRef']
                @artifact_drive_uri = attributes['artifactDriveUri']
                @artifact_size = attributes['artifactSize']
                @artifact_hash = attributes['artifactHash']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'deployType' => @deploy_type,
                  'environment' => @environment,
                  'versionTag' => @version_tag,
                  'commitHash' => @commit_hash,
                  'sourceRef' => @source_ref,
                  'artifactDriveUri' => @artifact_drive_uri,
                  'artifactSize' => @artifact_size,
                  'artifactHash' => @artifact_hash,
                }
              end
            end
    end
  end
end
