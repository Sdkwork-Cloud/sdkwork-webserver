package com.sdkwork.web.backend.sdk.model;


public class CertificateResponse {
    private String id;
    private String certName;
    private String domain;
    private String domainId;
    private Integer certType;
    private String issuer;
    private String fingerprint;
    private String notBefore;
    private String notAfter;
    private Boolean autoRenew;
    private Integer renewalStatus;
    private Integer status;
    private String createdAt;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCertName() {
        return this.certName;
    }

    public void setCertName(String certName) {
        this.certName = certName;
    }

    public String getDomain() {
        return this.domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getDomainId() {
        return this.domainId;
    }

    public void setDomainId(String domainId) {
        this.domainId = domainId;
    }

    public Integer getCertType() {
        return this.certType;
    }

    public void setCertType(Integer certType) {
        this.certType = certType;
    }

    public String getIssuer() {
        return this.issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getFingerprint() {
        return this.fingerprint;
    }

    public void setFingerprint(String fingerprint) {
        this.fingerprint = fingerprint;
    }

    public String getNotBefore() {
        return this.notBefore;
    }

    public void setNotBefore(String notBefore) {
        this.notBefore = notBefore;
    }

    public String getNotAfter() {
        return this.notAfter;
    }

    public void setNotAfter(String notAfter) {
        this.notAfter = notAfter;
    }

    public Boolean getAutoRenew() {
        return this.autoRenew;
    }

    public void setAutoRenew(Boolean autoRenew) {
        this.autoRenew = autoRenew;
    }

    public Integer getRenewalStatus() {
        return this.renewalStatus;
    }

    public void setRenewalStatus(Integer renewalStatus) {
        this.renewalStatus = renewalStatus;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
