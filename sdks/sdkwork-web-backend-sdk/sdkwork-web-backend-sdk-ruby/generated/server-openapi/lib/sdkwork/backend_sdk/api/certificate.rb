require_relative 'base_api'
require_relative '../models/certificates_create_response201'
require_relative '../models/certificates_list_response'
require_relative '../models/certificates_renew_response'
require_relative '../models/certificates_update_response'
require_relative '../models/create_certificate_request'
require_relative '../models/update_certificate_request'

module Sdkwork
  module BackendSdk
    module Api
      class CertificateApi < BaseApi
          # List canonical certificates
          def certificates_list(page: nil, page_size: nil)
            path = '/backend/v3/api/certificates'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::CertificatesListResponse.from_hash(result) : nil
          end

          # Issue a canonical certificate
          def certificates_create(body: nil)
            path = '/backend/v3/api/certificates'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::CertificatesCreateResponse201.from_hash(result) : nil
          end

          # Update certificate automatic renewal policy
          def certificates_update(certificate_id, body: nil)
            path = interpolate_path('/backend/v3/api/certificates/{certificateId}', certificateId: serialize_path_parameter(certificate_id, PathParameterSpec.new('certificateId', 'simple', false)))
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PUT', path, **options)
            result.is_a?(Hash) ? Models::CertificatesUpdateResponse.from_hash(result) : nil
          end

          # Renew a canonical certificate now
          def certificates_renew(certificate_id)
            path = interpolate_path('/backend/v3/api/certificates/{certificateId}/renew', certificateId: serialize_path_parameter(certificate_id, PathParameterSpec.new('certificateId', 'simple', false)))
            options = {}

            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::CertificatesRenewResponse.from_hash(result) : nil
          end

      end
    end
  end
end
