require_relative 'base_api'
require_relative '../models/certificates_create_response201'
require_relative '../models/certificates_list_response'
require_relative '../models/create_certificate_request'

module Sdkwork
  module AppSdk
    module Api
      class CertificateApi < BaseApi
          # 获取证书列表
          def certificates_list(page: nil, page_size: nil, site_id: nil)
            path = '/app/v3/api/certificates'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('siteId', site_id, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::CertificatesListResponse.from_hash(result) : nil
          end

          # 申请证书
          def certificates_create(body: nil)
            path = '/app/v3/api/certificates'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::CertificatesCreateResponse201.from_hash(result) : nil
          end

      end
    end
  end
end
