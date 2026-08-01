require_relative 'base_api'
require_relative '../models/create_deployment_request'
require_relative '../models/sites_deployments_create_response201'
require_relative '../models/sites_deployments_list_response'
require_relative '../models/sites_deployments_retrieve_response'
require_relative '../models/sites_deployments_rollback_response'

module Sdkwork
  module AppSdk
    module Api
      class DeploymentApi < BaseApi
          # 获取部署历史
          def sites_deployments_list(site_id, page_size: nil, cursor: nil, status: nil)
            path = interpolate_path('/app/v3/api/sites/{siteId}/deployments', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            query = build_query_string([
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('status', status, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SitesDeploymentsListResponse.from_hash(result) : nil
          end

          # 发起部署
          def sites_deployments_create(site_id, idempotency_key, body: nil)
            path = interpolate_path('/app/v3/api/sites/{siteId}/deployments', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            request_headers = build_request_headers(
              {
                'Idempotency-Key' => HeaderParameterSpec.new(idempotency_key, 'simple', false, nil),
              },
              {}
            )
            options = {}
            options[:headers] = request_headers unless request_headers.empty?
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SitesDeploymentsCreateResponse201.from_hash(result) : nil
          end

          # 获取部署详情
          def sites_deployments_retrieve(site_id, deployment_id)
            path = interpolate_path('/app/v3/api/sites/{siteId}/deployments/{deploymentId}', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)), deploymentId: serialize_path_parameter(deployment_id, PathParameterSpec.new('deploymentId', 'simple', false)))
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SitesDeploymentsRetrieveResponse.from_hash(result) : nil
          end

          # 基于历史成功版本创建快速还原命令
          def sites_deployments_rollback(site_id, deployment_id, idempotency_key)
            path = interpolate_path('/app/v3/api/sites/{siteId}/deployments/{deploymentId}/rollback', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)), deploymentId: serialize_path_parameter(deployment_id, PathParameterSpec.new('deploymentId', 'simple', false)))
            request_headers = build_request_headers(
              {
                'Idempotency-Key' => HeaderParameterSpec.new(idempotency_key, 'simple', false, nil),
              },
              {}
            )
            options = {}
            options[:headers] = request_headers unless request_headers.empty?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SitesDeploymentsRollbackResponse.from_hash(result) : nil
          end

        private

        def build_request_headers(headers = {}, cookies = {})
          request_headers = {}
          headers.each do |name, parameter|
            serialized = serialize_parameter_value(parameter)
            request_headers[name.to_s] = serialized unless serialized.nil?
          end

          cookie_header = build_cookie_header(cookies)
          unless cookie_header.empty?
            request_headers['Cookie'] =
              request_headers.key?('Cookie') && !request_headers['Cookie'].empty? ? "#{request_headers['Cookie']}; #{cookie_header}" : cookie_header
          end

          request_headers
        end

        def build_cookie_header(cookies = {})
          cookies.filter_map do |name, parameter|
            serialized = serialize_parameter_value(parameter)
            next if serialized.nil?

            "#{CGI.escape(name.to_s)}=#{CGI.escape(serialized)}"
          end.join('; ')
        end

        def serialize_parameter_value(parameter)
          value = parameter&.value
          return nil if value.nil?
          return JSON.generate(value) if parameter.content_type && !parameter.content_type.empty?
          return value.compact.map(&:to_s).join(',') if value.is_a?(Array)
          if value.is_a?(Hash)
            serialized = []
            value.each do |key, item|
              next if item.nil?
              if parameter.explode
                serialized << "#{key}=#{item}"
              else
                serialized << key.to_s
                serialized << item.to_s
              end
            end
            return serialized.join(',')
          end
          return value.iso8601 if value.respond_to?(:iso8601)

          value.to_s
        end
      end
    end
  end
end
