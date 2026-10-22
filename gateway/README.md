# Gateway v1

`POST /attack` is the only tenant request route. It requires a short-lived Ed25519 JWT with `role=red`, drops all request fields except `text`, calls the Client LLM on `model_net`, and returns only `{status, text}`. Missing/bad tokens are 401; non-Red roles are 403; unlisted paths are 404. `/health` is the only unauthenticated route. Prompts and model outputs are not logged by this service.

For local development, create ignored key files with `make gateway-keys`; the private key stays on the trusted host and is used by `tools/issue_token.py`. Only the public key is mounted into the Gateway. The host signing helper uses OpenSSL; runtime verification uses pinned PyJWT/cryptography dependencies.
