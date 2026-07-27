require_relative 'base_api'
require_relative '../models/create_server_request'
require_relative '../models/servers_create_response201'
require_relative '../models/servers_list_response'

module Sdkwork
  module BackendSdk
    module Api
      class ServerApi < BaseApi
          # List managed servers
          def servers_list(page: nil, page_size: nil)
            path = '/backend/v3/api/servers'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::ServersListResponse.from_hash(result) : nil
          end

          # Register a managed server
          def servers_create(body: nil)
            path = '/backend/v3/api/servers'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ServersCreateResponse201.from_hash(result) : nil
          end

      end
    end
  end
end
