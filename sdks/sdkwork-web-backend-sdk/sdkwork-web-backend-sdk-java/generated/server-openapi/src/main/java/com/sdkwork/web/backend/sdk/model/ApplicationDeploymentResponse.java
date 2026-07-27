package com.sdkwork.web.backend.sdk.model;


public class ApplicationDeploymentResponse {
    private String id;
    private String siteId;
    private Integer status;
    private Integer deployType;
    private String createdAt;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Integer getDeployType() {
        return this.deployType;
    }

    public void setDeployType(Integer deployType) {
        this.deployType = deployType;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
