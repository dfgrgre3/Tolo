import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_uisupport_for_rtl_and_theme_toggling():
    """
    Validate that the UI components support right-to-left languages
    and theme toggling between dark and light modes consistently.
    This test assumes the API exposes endpoints to retrieve UI config or settings per language and theme,
    and to toggle theme preference.
    """
    headers = {
        "Accept": "application/json",
    }

    try:
        # 1. Check UI config for RTL language support (e.g., Arabic)
        rtl_language = "ar"
        rtl_url = f"{BASE_URL}/api/ui/config"
        rtl_headers = {**headers, "Accept-Language": rtl_language}
        rtl_resp = requests.get(rtl_url, headers=rtl_headers, timeout=TIMEOUT)
        assert rtl_resp.status_code == 200, f"Failed to get UI config for RTL language, status {rtl_resp.status_code}"
        rtl_data = rtl_resp.json()
        # Validate RTL related fields
        assert "direction" in rtl_data, "Missing 'direction' field in RTL UI config"
        assert rtl_data["direction"].lower() == "rtl", f"Expected direction 'rtl', got {rtl_data['direction']}"
        assert "theme" in rtl_data, "Missing 'theme' field in RTL UI config"

        # 2. Check UI config for LTR language support (e.g., English)
        ltr_language = "en"
        ltr_url = f"{BASE_URL}/api/ui/config"
        ltr_headers = {**headers, "Accept-Language": ltr_language}
        ltr_resp = requests.get(ltr_url, headers=ltr_headers, timeout=TIMEOUT)
        assert ltr_resp.status_code == 200, f"Failed to get UI config for LTR language, status {ltr_resp.status_code}"
        ltr_data = ltr_resp.json()
        assert "direction" in ltr_data, "Missing 'direction' field in LTR UI config"
        assert ltr_data["direction"].lower() == "ltr", f"Expected direction 'ltr', got {ltr_data['direction']}"
        assert "theme" in ltr_data, "Missing 'theme' field in LTR UI config"

        # 3. Test theme toggling between dark and light modes - assuming a POST endpoint to toggle theme for user session or device
        toggle_theme_url = f"{BASE_URL}/api/ui/theme/toggle"
        # First toggle theme to dark
        payload_dark = {"theme": "dark"}
        toggle_dark_resp = requests.post(toggle_theme_url, headers={**headers, "Content-Type": "application/json"}, json=payload_dark, timeout=TIMEOUT)
        assert toggle_dark_resp.status_code == 200, f"Failed to toggle to dark theme, status {toggle_dark_resp.status_code}"
        dark_resp_data = toggle_dark_resp.json()
        assert dark_resp_data.get("theme") == "dark", f"Expected theme 'dark', got {dark_resp_data.get('theme')}"

        # Verify UI config after toggling theme to dark for LTR
        ltr_dark_resp = requests.get(ltr_url, headers=ltr_headers, timeout=TIMEOUT)
        assert ltr_dark_resp.status_code == 200, f"Failed to get UI config after dark theme toggle, status {ltr_dark_resp.status_code}"
        ltr_dark_data = ltr_dark_resp.json()
        assert ltr_dark_data.get("theme") == "dark", f"UI theme not updated to dark, got {ltr_dark_data.get('theme')}"
        assert ltr_dark_data.get("direction").lower() == "ltr", "UI direction should remain LTR after theme toggle"

        # Toggle theme to light
        payload_light = {"theme": "light"}
        toggle_light_resp = requests.post(toggle_theme_url, headers={**headers, "Content-Type": "application/json"}, json=payload_light, timeout=TIMEOUT)
        assert toggle_light_resp.status_code == 200, f"Failed to toggle to light theme, status {toggle_light_resp.status_code}"
        light_resp_data = toggle_light_resp.json()
        assert light_resp_data.get("theme") == "light", f"Expected theme 'light', got {light_resp_data.get('theme')}"

        # Verify UI config after toggling theme to light for RTL
        rtl_light_resp = requests.get(rtl_url, headers=rtl_headers, timeout=TIMEOUT)
        assert rtl_light_resp.status_code == 200, f"Failed to get UI config after light theme toggle, status {rtl_light_resp.status_code}"
        rtl_light_data = rtl_light_resp.json()
        assert rtl_light_data.get("theme") == "light", f"UI theme not updated to light, got {rtl_light_data.get('theme')}"
        assert rtl_light_data.get("direction").lower() == "rtl", "UI direction should remain RTL after theme toggle"

    except RequestException as e:
        assert False, f"HTTP request failed: {e}"
    except AssertionError:
        raise
    except Exception as e:
        assert False, f"Unexpected error: {e}"

test_uisupport_for_rtl_and_theme_toggling()