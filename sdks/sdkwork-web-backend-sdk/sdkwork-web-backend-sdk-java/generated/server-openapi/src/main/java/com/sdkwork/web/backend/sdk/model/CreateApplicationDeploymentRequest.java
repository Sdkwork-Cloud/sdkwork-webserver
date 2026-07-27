package com.sdkwork.web.backend.sdk.model;


public class CreateApplicationDeploymentRequest {
    private Integer deployType;
    private String environment;
    private String idempotencyKey;

    public Integer getDeployType() {
        return this.deployType;
    }

    public void setDeployType(Integer deployType) {
        this.deployType = deployType;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getIdempotencyKey() {
        return this.idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
