module Sdkwork
  module BackendSdk
    module Models
      class CreateApplicationDeploymentRequest
              attr_accessor :deploy_type, :environment, :idempotency_key

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @deploy_type = attributes['deployType']
                @environment = attributes['environment']
                @idempotency_key = attributes['idempotencyKey']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'deployType' => @deploy_type,
                  'environment' => @environment,
                  'idempotencyKey' => @idempotency_key,
                }
              end
            end
    end
  end
end
