require_relative 'base_api'
require_relative '../models/create_site_request'
require_relative '../models/sites_activate_response'
require_relative '../models/sites_create_response201'
require_relative '../models/sites_list_response'
require_relative '../models/sites_pause_response'
require_relative '../models/sites_retrieve_response'
require_relative '../models/sites_update_response'
require_relative '../models/update_site_request'

module Sdkwork
  module AppSdk
    module Api
      class SiteApi < BaseApi
          # 获取站点列表
          def sites_list(page: nil, page_size: nil, status: nil, application_type: nil, site_type: nil, keyword: nil)
            path = '/app/v3/api/sites'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('status', status, 'form', true, false, nil),
              QueryParameterSpec.new('application_type', application_type, 'form', true, false, nil),
              QueryParameterSpec.new('site_type', site_type, 'form', true, false, nil),
              QueryParameterSpec.new('keyword', keyword, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SitesListResponse.from_hash(result) : nil
          end

          # 创建站点
          def sites_create(idempotency_key, body: nil)
            path = '/app/v3/api/sites'
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
            result.is_a?(Hash) ? Models::SitesCreateResponse201.from_hash(result) : nil
          end

          # 获取站点详情
          def sites_retrieve(site_id)
            path = interpolate_path('/app/v3/api/sites/{siteId}', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SitesRetrieveResponse.from_hash(result) : nil
          end

          # 更新站点
          def sites_update(site_id, idempotency_key, body: nil)
            path = interpolate_path('/app/v3/api/sites/{siteId}', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
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
            result = @client.request('PATCH', path, **options)
            result.is_a?(Hash) ? Models::SitesUpdateResponse.from_hash(result) : nil
          end

          # 删除站点
          def sites_delete(site_id)
            path = interpolate_path('/app/v3/api/sites/{siteId}', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # 激活站点
          def sites_activate(site_id)
            path = interpolate_path('/app/v3/api/sites/{siteId}/activate', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SitesActivateResponse.from_hash(result) : nil
          end

          # 暂停站点
          def sites_pause(site_id)
            path = interpolate_path('/app/v3/api/sites/{siteId}/pause', siteId: serialize_path_parameter(site_id, PathParameterSpec.new('siteId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SitesPauseResponse.from_hash(result) : nil
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
