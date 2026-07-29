using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.AppSdk.Models
{
    public class SourceVersionPage
    {
        public List<SourceVersionResponse>? Items { get; set; }
        public string? Total { get; set; }
    }
}
