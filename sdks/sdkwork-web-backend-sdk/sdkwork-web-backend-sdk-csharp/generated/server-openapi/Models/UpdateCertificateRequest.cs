using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class UpdateCertificateRequest
    {
        public bool AutoRenew { get; set; }
    }
}
