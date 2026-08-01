using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.AppSdk.Models
{
    public class UpdateEnvVariableRequest
    {
        public string Value { get; set; }
        public bool? IsSecret { get; set; }
    }
}
