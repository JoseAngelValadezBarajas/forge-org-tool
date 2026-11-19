//! Narrow desktop transport policy. The policy accepts only relative API
//! requests; it does not expose shell, filesystem, arbitrary HTTP, or tokens.

#[derive(Debug, PartialEq, Eq)]
pub enum PolicyError {
    InvalidPath,
    UnsupportedRoute,
    BodyTooLarge,
}

pub const MAX_JSON_BODY: usize = 8 * 1024 * 1024;
/// Upper bound for a sidecar response held in memory (a 5 MiB package is ~7 MiB as base64).
pub const MAX_RESPONSE_BYTES: usize = 32 * 1024 * 1024;

/// Where a transport attempt failed. This decides whether the request may be sent again.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum FailureStage {
    /// The request was rejected locally or the connection was never established: nothing reached
    /// the sidecar.
    BeforeSend,
    /// Bytes were written. The sidecar may already have committed the change.
    AfterSend,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Recovery {
    /// Send the same request again (restarting the sidecar first if it is unhealthy).
    Replay,
    /// Report the failure. Never replay: a write could be applied twice.
    Surface,
}

/// A policy rejection is never a sidecar fault, so it never replays or restarts anything.
pub fn recovery_for(method: &str, stage: FailureStage, rejected_locally: bool) -> Recovery {
    if rejected_locally {
        return Recovery::Surface;
    }
    match (stage, method) {
        (FailureStage::BeforeSend, _) | (FailureStage::AfterSend, "GET") => Recovery::Replay,
        _ => Recovery::Surface,
    }
}

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
    let route = path.split('?').next().unwrap_or(path);
    if body_len > MAX_JSON_BODY
        || !path.starts_with("/api/v1/")
        || route.contains("//")
        || route.contains("..")
        || route.contains('%')
        || path.contains('#')
        || path.bytes().any(|byte| byte <= 0x20 || byte == 0x7f)
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
    if route == "/api/v1/health"
        || route == "/api/v1/workspaces"
        || route.starts_with("/api/v1/workspaces/")
    {
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
        assert_eq!(validate_request("GET", "/api/v1/workspaces", 0), Ok(()));
        assert_eq!(
            validate_request(
                "GET",
                "/api/v1/workspaces/w1/projects?search=forge%20org&status=active",
                0
            ),
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
        assert_eq!(
            validate_request("GET", "/api/v1/workspaces/\r\nX-Injected: true", 0),
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
        assert_eq!(validate_loopback_base_url("http://127.0.0.1:43123"), Ok(()));
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

    #[test]
    fn rejects_whitespace_and_control_characters_in_the_path() {
        for path in [
            "/api/v1/workspaces/a b",
            "/api/v1/workspaces/a\tb",
            "/api/v1/workspaces/a\0b",
            "/api/v1/workspaces/a\x7fb",
        ] {
            assert_eq!(
                validate_request("GET", path, 0),
                Err(PolicyError::InvalidPath),
                "{path:?}"
            );
        }
    }

    #[test]
    fn accepts_a_query_on_the_collection_routes() {
        assert_eq!(
            validate_request("GET", "/api/v1/workspaces?status=active", 0),
            Ok(())
        );
        assert_eq!(validate_request("GET", "/api/v1/health?probe=1", 0), Ok(()));
        assert_eq!(
            validate_request("GET", "/api/v1/other", 0),
            Err(PolicyError::UnsupportedRoute)
        );
    }

    #[test]
    fn never_replays_a_write_that_may_have_been_applied() {
        for method in ["POST", "PATCH", "DELETE"] {
            assert_eq!(
                recovery_for(method, FailureStage::AfterSend, false),
                Recovery::Surface,
                "{method} after send"
            );
            assert_eq!(
                recovery_for(method, FailureStage::BeforeSend, false),
                Recovery::Replay,
                "{method} before send"
            );
        }
    }

    #[test]
    fn replays_reads_and_never_acts_on_a_local_rejection() {
        assert_eq!(
            recovery_for("GET", FailureStage::AfterSend, false),
            Recovery::Replay
        );
        for method in ["GET", "POST"] {
            for stage in [FailureStage::BeforeSend, FailureStage::AfterSend] {
                assert_eq!(recovery_for(method, stage, true), Recovery::Surface);
            }
        }
    }
}
