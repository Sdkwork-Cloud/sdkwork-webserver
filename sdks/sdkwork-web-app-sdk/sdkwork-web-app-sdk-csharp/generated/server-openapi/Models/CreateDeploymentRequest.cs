using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Web.AppSdk.Models
{
    public class CreateDeploymentRequest
    {
        public int DeployType { get; set; }
        public string? VersionTag { get; set; }
        public string? CommitHash { get; set; }
        public string? SourceRef { get; set; }
        public string? ArtifactDriveUri { get; set; }
        public string? ArtifactSize { get; set; }
        public string? ArtifactHash { get; set; }
        public string? Environment { get; set; }
    }
}
