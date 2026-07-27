require_relative 'base_api'
require_relative '../models/applications_deployments_create_response201'
require_relative '../models/applications_deployments_list_response'
require_relative '../models/create_application_deployment_request'

module Sdkwork
  module BackendSdk
    module Api
      class ApplicationDeploymentApi < BaseApi
          # List application deployments
          def applications_deployments_list(application_id, page: nil, page_size: nil, status: nil)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/deployments', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('status', status, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsDeploymentsListResponse.from_hash(result) : nil
          end

          # Deploy an application
          def applications_deployments_create(application_id, body: nil)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/deployments', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsDeploymentsCreateResponse201.from_hash(result) : nil
          end

      end
    end
  end
end
