//! Narrow desktop transport policy. The policy accepts only relative API
//! requests; it does not expose shell, filesystem, arbitrary HTTP, or tokens.

#[derive(Debug, PartialEq, Eq)]
pub enum PolicyError {
    InvalidPath,
    UnsupportedRoute,
    BodyTooLarge,
}

pub const MAX_JSON_BODY: usize = 8 * 1024 * 1024;

pub fn validate_loopback_base_url(url: &str) -> Result<(), PolicyError> {
    let valid = url
        .strip_prefix("http://127.0.0.1:")
        .and_then(|port| port.parse::<u16>().ok())
        .is_some_and(|port| port > 0);
    if valid {
        Ok(())
    } else {
        Err(PolicyError::InvalidPath)
    }
}

pub fn bearer_header(token: &str) -> Result<String, PolicyError> {
    if token.len() < 32 || token.bytes().any(|byte| byte <= 0x20 || byte >= 0x7f) {
        return Err(PolicyError::InvalidPath);
    }
    Ok(format!("Bearer {token}"))
}

pub fn validate_request(method: &str, path: &str, body_len: usize) -> Result<(), PolicyError> {
    if body_len > MAX_JSON_BODY
        || !path.starts_with("/api/v1/")
        || path.contains("//")
        || path.contains("..")
        || path.contains('#')
        || path.contains('?')
        || path.contains('%')
    {
        return Err(if body_len > MAX_JSON_BODY {
            PolicyError::BodyTooLarge
        } else {
            PolicyError::InvalidPath
        });
    }
    if !matches!(method, "GET" | "POST" | "PATCH" | "DELETE") {
        return Err(PolicyError::UnsupportedRoute);
    }
    let allowed = ["/api/v1/health", "/api/v1/workspaces"];
    if allowed.iter().any(|route| *route == path) || path.starts_with("/api/v1/workspaces/") {
        Ok(())
    } else {
        Err(PolicyError::UnsupportedRoute)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_relative_api_route() {
        assert_eq!(
            validate_request("GET", "/api/v1/workspaces", 0),
            Ok(())
        );
    }

    #[test]
    fn rejects_authority_and_encoded_paths() {
        assert_eq!(
            validate_request("GET", "https://127.0.0.1/api/v1/workspaces", 0),
            Err(PolicyError::InvalidPath)
        );
        assert_eq!(
            validate_request("GET", "/api/v1/workspaces/%2e%2e", 0),
            Err(PolicyError::InvalidPath)
        );
    }

    #[test]
    fn rejects_unknown_method_and_large_body() {
        assert_eq!(
            validate_request("PUT", "/api/v1/workspaces", 0),
            Err(PolicyError::UnsupportedRoute)
        );
        assert_eq!(
            validate_request("POST", "/api/v1/workspaces", MAX_JSON_BODY + 1),
            Err(PolicyError::BodyTooLarge)
        );
    }

    #[test]
    fn only_accepts_loopback_sidecar_urls_and_strong_tokens() {
        assert_eq!(
            validate_loopback_base_url("http://127.0.0.1:43123"),
            Ok(())
        );
        assert_eq!(
            validate_loopback_base_url("http://localhost:43123"),
            Err(PolicyError::InvalidPath)
        );
        assert_eq!(
            bearer_header(&"a".repeat(32)),
            Ok(format!("Bearer {}", "a".repeat(32)))
        );
        assert_eq!(bearer_header("short"), Err(PolicyError::InvalidPath));
    }
}
