require_relative 'base_api'
require_relative '../models/applications_domains_create_response201'
require_relative '../models/applications_domains_list_response'
require_relative '../models/applications_domains_verify_response'
require_relative '../models/create_application_domain_request'

module Sdkwork
  module BackendSdk
    module Api
      class ApplicationDomainApi < BaseApi
          # List application domains
          def applications_domains_list(application_id, page: nil, page_size: nil)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/domains', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsDomainsListResponse.from_hash(result) : nil
          end

          # Bind a public domain to an application
          def applications_domains_create(application_id, body: nil)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/domains', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)))
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsDomainsCreateResponse201.from_hash(result) : nil
          end

          # Unbind an application public domain
          def applications_domains_delete(application_id, domain_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/domains/{domainId}', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)), domainId: serialize_path_parameter(domain_id, PathParameterSpec.new('domainId', 'simple', false)))
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Verify an application public domain
          def applications_domains_verify(application_id, domain_id)
            path = interpolate_path('/backend/v3/api/applications/{applicationId}/domains/{domainId}/verify', applicationId: serialize_path_parameter(application_id, PathParameterSpec.new('applicationId', 'simple', false)), domainId: serialize_path_parameter(domain_id, PathParameterSpec.new('domainId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::ApplicationsDomainsVerifyResponse.from_hash(result) : nil
          end

      end
    end
  end
end
