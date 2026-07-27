require_relative 'base_api'
require_relative '../models/applications_create_response201'
require_relative '../models/applications_list_response'
require_relative '../models/create_application_request'

module Sdkwork
  module BackendSdk
    module Api
      class ApplicationApi < BaseApi
          # List managed applications
          def applications_list(page: nil, page_size: nil, application_type: nil, site_type: nil, status: nil, keyword: nil)
            path = '/backend/v3/api/applications'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('applicationType', application_type, 'form', true, false, nil),
              QueryParameterSpec.new('siteType', site_type, 'form', true, false, nil),
              QueryParameterSpec.new('status', status, 'form', true, false, nil),
              QueryParameterSpec.new('keyword', keyword, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsListResponse.from_hash(result) : nil
          end

          # Create a managed application
          def applications_create(body: nil)
            path = '/backend/v3/api/applications'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsCreateResponse201.from_hash(result) : nil
          end

      end
    end
  end
end
