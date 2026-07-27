module Sdkwork
  module BackendSdk
    module Models
      class ApplicationDeploymentResponse
              attr_accessor :id, :site_id, :status, :deploy_type, :created_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @id = attributes['id']
                @site_id = attributes['siteId']
                @status = attributes['status']
                @deploy_type = attributes['deployType']
                @created_at = attributes['createdAt']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'id' => @id,
                  'siteId' => @site_id,
                  'status' => @status,
                  'deployType' => @deploy_type,
                  'createdAt' => @created_at,
                }
              end
            end
    end
  end
end
