import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def testgamificationfeaturesintegration():
    user_payload = {"username": "testuser_gamification", "email": "testuser_gamification@example.com", "password": "TestPass123!"}
    session = requests.Session()
    try:
        # Step 1: Register a new user for gamification tests
        resp = session.post(f"{BASE_URL}/api/auth/register", json=user_payload, timeout=TIMEOUT, headers=HEADERS)
        assert resp.status_code == 201, f"User registration failed: {resp.text}"
        user_data = resp.json()
        user_id = user_data.get("id")
        assert user_id, "Registered user id not returned"

        # Step 2: Authenticate the user to obtain token/session cookie
        resp = session.post(f"{BASE_URL}/api/auth/login", json=user_payload, timeout=TIMEOUT, headers=HEADERS)
        assert resp.status_code == 200, f"User login failed: {resp.text}"
        login_data = resp.json()
        token = login_data.get("token")
        assert token, "Login token not returned"

        auth_headers = HEADERS.copy()
        auth_headers["Authorization"] = f"Bearer {token}"

        # Step 3: Award an achievement to the user
        achievement_payload = {
            "userId": user_id,
            "achievementCode": "FIRST_QUIZ_COMPLETED"
        }
        resp = session.post(f"{BASE_URL}/api/gamification/achievements/award", json=achievement_payload, timeout=TIMEOUT, headers=auth_headers)
        assert resp.status_code == 200, f"Award achievement API failed: {resp.text}"
        achievement_resp = resp.json()
        assert achievement_resp.get("success") is True, "Achievement not awarded successfully"
        assert achievement_resp.get("achievement", {}).get("code") == "FIRST_QUIZ_COMPLETED"

        # Step 4: Add points to the user
        points_payload = {
            "userId": user_id,
            "points": 50,
            "reason": "Completed first quiz"
        }
        resp = session.post(f"{BASE_URL}/api/gamification/points/add", json=points_payload, timeout=TIMEOUT, headers=auth_headers)
        assert resp.status_code == 200, f"Add points API failed: {resp.text}"
        points_resp = resp.json()
        assert points_resp.get("success") is True, "Points not added successfully"
        new_points = points_resp.get("newPoints")
        assert isinstance(new_points, int) and new_points >= 50, "Invalid new points value"

        # Step 5: Fetch leaderboard and check user's updated position and points appear
        # Some delay to simulate real-time update
        time.sleep(2)  # wait 2 seconds to allow real-time update processing

        resp = session.get(f"{BASE_URL}/api/gamification/leaderboard", timeout=TIMEOUT, headers=auth_headers)
        assert resp.status_code == 200, f"Leaderboard fetch failed: {resp.text}"
        leaderboard = resp.json()
        assert "leaderboard" in leaderboard, "Leaderboard data not found"

        # Check the user entry is in the leaderboard with correct points and achievement reflected
        user_entry = None
        for entry in leaderboard["leaderboard"]:
            if entry.get("userId") == user_id:
                user_entry = entry
                break
        assert user_entry is not None, "User not found in leaderboard"
        assert user_entry.get("points") >= 50, "User points on leaderboard not updated correctly"
        assert "FIRST_QUIZ_COMPLETED" in user_entry.get("achievements", []), "User achievement not reflected on leaderboard"

    finally:
        # Cleanup: delete created user if API exists
        if 'user_id' in locals():
            try:
                resp = session.delete(f"{BASE_URL}/api/users/{user_id}", timeout=TIMEOUT, headers=auth_headers)
                # deletion may fail if API or auth missing; ignore to not mask test results
            except Exception:
                pass


testgamificationfeaturesintegration()