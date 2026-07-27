module Sdkwork
  module BackendSdk
    module Models
      class ApplicationResponse
              attr_accessor :id, :name, :slug, :description, :application_type, :site_type, :status, :runtime_config, :created_at, :updated_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @id = attributes['id']
                @name = attributes['name']
                @slug = attributes['slug']
                @description = attributes['description']
                @application_type = attributes['applicationType']
                @site_type = attributes['siteType']
                @status = attributes['status']
                @runtime_config = attributes['runtimeConfig'].is_a?(Hash) ? attributes['runtimeConfig'] : {}
                @created_at = attributes['createdAt']
                @updated_at = attributes['updatedAt']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'id' => @id,
                  'name' => @name,
                  'slug' => @slug,
                  'description' => @description,
                  'applicationType' => @application_type,
                  'siteType' => @site_type,
                  'status' => @status,
                  'runtimeConfig' => @runtime_config,
                  'createdAt' => @created_at,
                  'updatedAt' => @updated_at,
                }
              end
            end
    end
  end
end
