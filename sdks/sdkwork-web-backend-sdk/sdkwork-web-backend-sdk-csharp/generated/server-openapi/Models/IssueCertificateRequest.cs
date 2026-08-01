using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.BackendSdk.Models
{
    public class IssueCertificateRequest
    {
        public List<string> DomainIds { get; set; }
        public int CertType { get; set; }
        public string? KeyAlgorithm { get; set; }
        public bool? AutoRenew { get; set; }
    }
}
