# -*- coding: utf-8 -*-
import io

path = r"crates/sdkwork-webserver-delivery-runtime/src/app_config_executor.rs"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# 1. Add ServeContext struct before impl block
old = """/// Executes provider-backed resources declared in the application Web Server
/// configuration. One instance is shared by all listeners and reload
/// generations; the provider registry and cache outlive configuration
/// generations while their content is generation-keyed.
pub struct AppConfigResourceExecutor {"""
new = """/// Per-request serving context shared by the content-open helpers.
struct ServeContext<'a> {
    policy: &'a AppConfigProviderPolicy,
    request: &'a AppConfigProviderRequest,
}

/// Executes provider-backed resources declared in the application Web Server
/// configuration. One instance is shared by all listeners and reload
/// generations; the provider registry and cache outlive configuration
/// generations while their content is generation-keyed.
pub struct AppConfigResourceExecutor {"""
assert old in src, "marker1"
src = src.replace(old, new, 1)

# 2. open_static_content signature + body
old = """    async fn open_static_content(
        &self,
        provider: Arc<dyn WebsiteStaticContentProvider>,
        identity: WebsiteDeliveryRouteIdentity,
        mut context: WebsiteProviderRuntimeContext,
        deadline: &ProviderDeadline,
        content: ResolvedWebsiteContent,
        policy: &AppConfigProviderPolicy,
        request: &AppConfigProviderRequest,
    ) -> Result<WebsiteDeliveryOutcome, WebsiteDeliveryError> {
        let expected_bytes = content.metadata.content_length;
        let if_range_present = request.conditions.if_range.is_some();
        let opened = if request.method == WebsiteDeliveryMethod::Head {
            None
        } else {
            let permit = self.acquire_buffered_content(policy.maximum_object_bytes)?;
            context.deadline_ms = deadline.remaining_ms()?;
            let open_request = OpenWebsiteContentRequest {
                context,
                provider: identity.provider.clone(),
                provider_relative_path: identity.provider_relative_path.clone(),
                content_handle: content.content_handle,
                range: request.range,
                conditions: request.conditions.clone(),
                maximum_bytes: policy.maximum_object_bytes,
            };
            let mut opened = deadline
                .call(provider.open_static_content(&open_request))
                .await?;
            if request.range.is_none() && opened.content_length != expected_bytes {
                return Err(provider_contract_mismatch());
            }
            opened.stream = Box::new(AdmittedProviderContentStream::new(opened.stream, permit));
            Some(opened)
        };
        let opened = opened_body_fields(
            opened,
            &content.metadata,
            request.range,
            if_range_present,
            policy.maximum_object_bytes,
            policy.provider_timeout_ms,
        )?;"""
new = """    async fn open_static_content(
        &self,
        provider: Arc<dyn WebsiteStaticContentProvider>,
        identity: WebsiteDeliveryRouteIdentity,
        mut context: WebsiteProviderRuntimeContext,
        deadline: &ProviderDeadline,
        content: ResolvedWebsiteContent,
        serve: ServeContext<'_>,
    ) -> Result<WebsiteDeliveryOutcome, WebsiteDeliveryError> {
        let ServeContext { policy, request } = serve;
        let expected_bytes = content.metadata.content_length;
        let if_range_present = request.conditions.if_range.is_some();
        let opened = if request.method == WebsiteDeliveryMethod::Head {
            None
        } else {
            let permit = self.acquire_buffered_content(policy.maximum_object_bytes)?;
            context.deadline_ms = deadline.remaining_ms()?;
            let open_request = OpenWebsiteContentRequest {
                context,
                provider: identity.provider.clone(),
                provider_relative_path: identity.provider_relative_path.clone(),
                content_handle: content.content_handle,
                range: request.range,
                conditions: request.conditions.clone(),
                maximum_bytes: policy.maximum_object_bytes,
            };
            let mut opened = deadline
                .call(provider.open_static_content(&open_request))
                .await?;
            if request.range.is_none() && opened.content_length != expected_bytes {
                return Err(provider_contract_mismatch());
            }
            opened.stream = Box::new(AdmittedProviderContentStream::new(opened.stream, permit));
            Some(opened)
        };
        let opened = opened_body_fields(
            opened,
            &content.metadata,
            request.range,
            if_range_present,
            policy.maximum_object_bytes,
            policy.provider_timeout_ms,
        )?;"""
assert old in src, "marker2"
src = src.replace(old, new, 1)

# 3. open_wiki_body signature + body
old = """    async fn open_wiki_body(
        &self,
        provider: Arc<dyn WebsiteWikiProvider>,
        identity: WebsiteDeliveryRouteIdentity,
        mut context: WebsiteProviderRuntimeContext,
        deadline: &ProviderDeadline,
        content: &ResolvedWebsiteWikiContent,
        policy: &AppConfigProviderPolicy,
        request: &AppConfigProviderRequest,
    ) -> Result<
        Option<sdkwork_webserver_contract::provider::OpenedWebsiteContent>,
        WebsiteDeliveryError,
    > {
        if request.method == WebsiteDeliveryMethod::Head {
            return Ok(None);
        }
        let expected_bytes = content.metadata.content_length;
        let permit = self.acquire_buffered_content(policy.maximum_object_bytes)?;
        context.deadline_ms = deadline.remaining_ms()?;
        let open_request = OpenWebsiteContentRequest {
            context,
            provider: identity.provider.clone(),
            provider_relative_path: identity.provider_relative_path.clone(),
            content_handle: content.content_handle.clone(),
            range: request.range,
            conditions: request.conditions.clone(),
            maximum_bytes: policy.maximum_object_bytes,
        };
        let mut opened = deadline
            .call(provider.open_wiki_content(&open_request))
            .await?;
        if request.range.is_none() && opened.content_length != expected_bytes {
            return Err(provider_contract_mismatch());
        }
        opened.stream = Box::new(AdmittedProviderContentStream::new(opened.stream, permit));
        Ok(Some(opened))
    }"""
new = """    async fn open_wiki_body(
        &self,
        provider: Arc<dyn WebsiteWikiProvider>,
        identity: WebsiteDeliveryRouteIdentity,
        mut context: WebsiteProviderRuntimeContext,
        deadline: &ProviderDeadline,
        content: &ResolvedWebsiteWikiContent,
        serve: ServeContext<'_>,
    ) -> Result<
        Option<sdkwork_webserver_contract::provider::OpenedWebsiteContent>,
        WebsiteDeliveryError,
    > {
        let ServeContext { policy, request } = serve;
        if request.method == WebsiteDeliveryMethod::Head {
            return Ok(None);
        }
        let expected_bytes = content.metadata.content_length;
        let permit = self.acquire_buffered_content(policy.maximum_object_bytes)?;
        context.deadline_ms = deadline.remaining_ms()?;
        let open_request = OpenWebsiteContentRequest {
            context,
            provider: identity.provider.clone(),
            provider_relative_path: identity.provider_relative_path.clone(),
            content_handle: content.content_handle.clone(),
            range: request.range,
            conditions: request.conditions.clone(),
            maximum_bytes: policy.maximum_object_bytes,
        };
        let mut opened = deadline
            .call(provider.open_wiki_content(&open_request))
            .await?;
        if request.range.is_none() && opened.content_length != expected_bytes {
            return Err(provider_contract_mismatch());
        }
        opened.stream = Box::new(AdmittedProviderContentStream::new(opened.stream, permit));
        Ok(Some(opened))
    }"""
assert old in src, "marker3"
src = src.replace(old, new, 1)

# 4. Update call sites in serve_static
old = """            return self
                .open_static_content(
                    provider,
                    identity,
                    context,
                    &deadline,
                    content,
                    policy,
                    request,
                )
                .await;"""
new = """            return self
                .open_static_content(
                    provider,
                    identity,
                    context,
                    &deadline,
                    content,
                    ServeContext { policy, request },
                )
                .await;"""
assert old in src, "marker4"
src = src.replace(old, new, 1)

# 5. Update call site in serve_wiki
old = """                let opened = self
                    .open_wiki_body(
                        provider,
                        identity.clone(),
                        context,
                        &deadline,
                        &content,
                        policy,
                        request,
                    )
                    .await?;"""
new = """                let opened = self
                    .open_wiki_body(
                        provider,
                        identity.clone(),
                        context,
                        &deadline,
                        &content,
                        ServeContext { policy, request },
                    )
                    .await?;"""
assert old in src, "marker5"
src = src.replace(old, new, 1)

with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(src)
print("patched ok")
