using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class ApplicationDeploymentResponse
    {
        public string Id { get; set; }
        public string SiteId { get; set; }
        public int Status { get; set; }
        public int DeployType { get; set; }
        public string CreatedAt { get; set; }
    }
}
