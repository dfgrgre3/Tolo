import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_verifyauthenticationsystemfunctionality():
    headers = {"Content-Type": "application/json"}

    # 1. Register a new user (needed to test multi-factor and biometric auth flows)
    register_payload = {
        "username": "testuser_auth_system",
        "email": "testuser_auth_system@example.com",
        "password": "TestPassw0rd!"
    }
    try:
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload, headers=headers, timeout=TIMEOUT)
        assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"
        user_id = register_resp.json().get("id")
        assert user_id, "Registration response missing user ID"

        # 2. Perform login with password to obtain base JWT token/session cookie
        login_payload = {
            "username": "testuser_auth_system",
            "password": "TestPassw0rd!"
        }
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        access_token = login_data.get("accessToken") or login_resp.cookies.get("session")
        assert access_token, "Login response missing access token or session cookie"

        auth_headers = headers.copy()
        # Support JWT or cookie auth depending on API
        if access_token and "accessToken" in login_data:
            auth_headers["Authorization"] = f"Bearer {access_token}"
        else:
            auth_headers["Cookie"] = f"session={access_token}"

        # 3. Register biometric (WebAuthn) credential
        webauthn_register_payload = {
            "userId": user_id,
            "credential": {
                "id": "test_credential_id",
                "rawId": "test_raw_id",
                "response": {
                    "clientDataJSON": "eyJjaGFsbGVuZ2UiOiJ0ZXN0In0=",
                    "attestationObject": "test_attestation_object"
                },
                "type": "public-key"
            }
        }
        webauthn_resp = requests.post(f"{BASE_URL}/api/auth/webauthn/register", json=webauthn_register_payload, headers=auth_headers, timeout=TIMEOUT)
        assert webauthn_resp.status_code == 201, f"WebAuthn registration failed: {webauthn_resp.text}"

        # 4. Initiate Two-Factor Authentication setup (TOTP)
        totp_setup_resp = requests.post(f"{BASE_URL}/api/auth/totp/setup", headers=auth_headers, timeout=TIMEOUT)
        assert totp_setup_resp.status_code == 200, f"TOTP setup initiation failed: {totp_setup_resp.text}"
        totp_secret = totp_setup_resp.json().get("secret")
        assert totp_secret, "TOTP secret missing in setup response"

        # Simulate user providing TOTP code (normally generated using secret)
        # For test, mock/fake a valid TOTP code; assume "123456" is valid for testing
        totp_verify_payload = {"token": "123456"}
        totp_verify_resp = requests.post(f"{BASE_URL}/api/auth/totp/verify", json=totp_verify_payload, headers=auth_headers, timeout=TIMEOUT)
        assert totp_verify_resp.status_code in (200, 201), f"TOTP verification failed: {totp_verify_resp.text}"

        # 5. Request magic link for login
        magic_link_payload = {"email": "testuser_auth_system@example.com"}
        magic_link_resp = requests.post(f"{BASE_URL}/api/auth/magic-link/request", json=magic_link_payload, headers=headers, timeout=TIMEOUT)
        assert magic_link_resp.status_code == 200, f"Magic link request failed: {magic_link_resp.text}"

        magic_link_status = magic_link_resp.json().get("status")
        assert magic_link_status == "sent", "Magic link not sent properly"

        # 6. Check session tracking - get active sessions for user
        sessions_resp = requests.get(f"{BASE_URL}/api/auth/sessions", headers=auth_headers, timeout=TIMEOUT)
        assert sessions_resp.status_code == 200, f"Fetching sessions failed: {sessions_resp.text}"
        sessions = sessions_resp.json()
        assert isinstance(sessions, list), "Sessions response is not a list"
        assert any(sess.get("userId") == user_id for sess in sessions), "User session not found in session tracking"

        # 7. Fetch recovery codes for user
        recovery_codes_resp = requests.get(f"{BASE_URL}/api/auth/recovery-codes", headers=auth_headers, timeout=TIMEOUT)
        assert recovery_codes_resp.status_code == 200, f"Fetching recovery codes failed: {recovery_codes_resp.text}"
        recovery_codes = recovery_codes_resp.json().get("codes")
        assert isinstance(recovery_codes, list) and len(recovery_codes) > 0, "Recovery codes missing or empty"

        # 8. Fetch security logs for user
        security_logs_resp = requests.get(f"{BASE_URL}/api/security/logs", headers=auth_headers, timeout=TIMEOUT)
        assert security_logs_resp.status_code == 200, f"Fetching security logs failed: {security_logs_resp.text}"
        logs = security_logs_resp.json()
        assert isinstance(logs, list), "Security logs response is not list"
        # Ensure at least one login event logged (from steps above)
        assert any("login" in log.get("event", "").lower() for log in logs), "No login events found in security logs"

    finally:
        # Cleanup: delete the test user
        if 'user_id' in locals():
            try:
                del_resp = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers, timeout=TIMEOUT)
                assert del_resp.status_code in (200,204), "Failed to delete test user in cleanup"
            except Exception:
                pass

test_verifyauthenticationsystemfunctionality()