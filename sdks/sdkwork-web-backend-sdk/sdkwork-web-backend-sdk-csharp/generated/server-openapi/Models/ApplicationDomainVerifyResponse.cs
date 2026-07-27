using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class ApplicationDomainVerifyResponse
    {
        public bool Verified { get; set; }
        public string? VerifyToken { get; set; }
    }
}
