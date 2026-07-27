module Sdkwork
  module BackendSdk
    module Models
      class ApplicationDomainVerifyResponse
              attr_accessor :verified, :verify_token

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @verified = attributes['verified']
                @verify_token = attributes['verifyToken']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'verified' => @verified,
                  'verifyToken' => @verify_token,
                }
              end
            end
    end
  end
end
