using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class UpdateDomainApplicationBindingRequest
    {
        public string ApplicationId { get; set; }
        public bool? IsPrimary { get; set; }
    }
}
