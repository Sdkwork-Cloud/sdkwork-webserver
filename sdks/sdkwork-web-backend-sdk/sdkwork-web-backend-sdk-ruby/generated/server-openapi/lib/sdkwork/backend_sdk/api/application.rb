require_relative 'base_api'
require_relative '../models/applications_activate_response'
require_relative '../models/applications_create_response201'
require_relative '../models/applications_list_response'
require_relative '../models/applications_pause_response'
require_relative '../models/applications_retrieve_response'
require_relative '../models/applications_update_response'
require_relative '../models/create_application_request'
require_relative '../models/update_application_request'

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

          # Retrieve a managed application
          def applications_retrieve(application_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsRetrieveResponse.from_hash(result) : nil
          end

          # Update a managed application
          def applications_update(application_id, body: nil)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PATCH', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsUpdateResponse.from_hash(result) : nil
          end

          # Delete a managed application
          def applications_delete(application_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Activate a managed application
          def applications_activate(application_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/activate', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsActivateResponse.from_hash(result) : nil
          end

          # Pause a managed application
          def applications_pause(application_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/pause', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsPauseResponse.from_hash(result) : nil
          end

      end
    end
  end
end
