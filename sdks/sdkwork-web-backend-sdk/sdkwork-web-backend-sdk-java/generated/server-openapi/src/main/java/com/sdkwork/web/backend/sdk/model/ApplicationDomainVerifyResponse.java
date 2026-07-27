package com.sdkwork.web.backend.sdk.model;


public class ApplicationDomainVerifyResponse {
    private Boolean verified;
    private String verifyToken;

    public Boolean getVerified() {
        return this.verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public String getVerifyToken() {
        return this.verifyToken;
    }

    public void setVerifyToken(String verifyToken) {
        this.verifyToken = verifyToken;
    }
}
