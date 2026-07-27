namespace SDKWork.Web.BackendSdk.Api
{
    /// <summary>
    /// API modules for sdkwork-web-backend-sdk
    /// </summary>
    public static class Api
    {
        public static ApplicationApi? Application { get; set; }
        public static ApplicationDomainApi? ApplicationDomain { get; set; }
        public static ApplicationDeploymentApi? ApplicationDeployment { get; set; }
        public static CertificateApi? Certificate { get; set; }
        public static CertificateDistributionApi? CertificateDistribution { get; set; }
        public static NginxApi? Nginx { get; set; }
        public static ServerApi? Server { get; set; }
        public static AgentApi? Agent { get; set; }
        public static AuditApi? Audit { get; set; }
    }
}
