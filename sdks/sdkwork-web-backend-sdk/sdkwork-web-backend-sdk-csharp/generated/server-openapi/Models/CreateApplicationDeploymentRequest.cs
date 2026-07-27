using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class CreateApplicationDeploymentRequest
    {
        public int? DeployType { get; set; }
        public string? Environment { get; set; }
        public string? IdempotencyKey { get; set; }
    }
}
