//! Narrow desktop transport policy. The policy accepts only relative API
//! requests; it does not expose shell, filesystem, arbitrary HTTP, or tokens.

#[derive(Debug, PartialEq, Eq)]
pub enum PolicyError { InvalidPath, UnsupportedRoute, BodyTooLarge }

pub const MAX_JSON_BODY: usize = 8 * 1024 * 1024;

pub fn validate_request(method: &str, path: &str, body_len: usize) -> Result<(), PolicyError> {
    if body_len > MAX_JSON_BODY || !path.starts_with("/api/v1/") || path.contains("//") || path.contains("..") || path.contains('#') || path.contains('?') || path.contains('%') {
        return Err(if body_len > MAX_JSON_BODY { PolicyError::BodyTooLarge } else { PolicyError::InvalidPath });
    }
    if !matches!(method, "GET" | "POST" | "PATCH" | "DELETE") { return Err(PolicyError::UnsupportedRoute); }
    let allowed = ["/api/v1/health", "/api/v1/workspaces"];
    if allowed.iter().any(|route| *route == path) || path.starts_with("/api/v1/workspaces/") { Ok(()) } else { Err(PolicyError::UnsupportedRoute) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn accepts_relative_api_route() { assert_eq!(validate_request("GET", "/api/v1/workspaces", 0), Ok(())); }
    #[test] fn rejects_authority_and_encoded_paths() { assert_eq!(validate_request("GET", "https://127.0.0.1/api/v1/workspaces", 0), Err(PolicyError::InvalidPath)); assert_eq!(validate_request("GET", "/api/v1/workspaces/%2e%2e", 0), Err(PolicyError::InvalidPath)); }
    #[test] fn rejects_unknown_method_and_large_body() { assert_eq!(validate_request("PUT", "/api/v1/workspaces", 0), Err(PolicyError::UnsupportedRoute)); assert_eq!(validate_request("POST", "/api/v1/workspaces", MAX_JSON_BODY + 1), Err(PolicyError::BodyTooLarge)); }
}
