import requests
import uuid
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_verify_time_management_tools_functionality():
    # Create a study activity (schedule)
    study_activity_payload = {
        "title": "Sample Study Activity",
        "description": "Testing scheduling functionality",
        "start": "2026-01-10T10:00:00Z",
        "end": "2026-01-10T11:00:00Z",
        "user_id": str(uuid.uuid4())
    }
    created_activity_id = None
    try:
        # Create schedule
        r_create = requests.post(
            f"{BASE_URL}/api/time-management/schedules",
            json=study_activity_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_create.status_code == 201, f"Expected 201 Created, got {r_create.status_code}"
        created_activity = r_create.json()
        created_activity_id = created_activity.get("id")
        assert created_activity_id is not None, "Created activity ID is None"

        # Track time on the created study activity
        time_tracking_payload = {
            "activityId": created_activity_id,
            "startTime": "2026-01-10T10:05:00Z",
            "endTime": "2026-01-10T10:55:00Z",
            "notes": "Focused study session"
        }
        r_track = requests.post(
            f"{BASE_URL}/api/time-management/time-tracker",
            json=time_tracking_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_track.status_code == 201, f"Expected 201 Created for time tracking, got {r_track.status_code}"
        tracked_time = r_track.json()
        assert tracked_time.get("activityId") == created_activity_id, "Tracked time activityId mismatch"

        # Request reminder to be sent for the activity
        reminder_payload = {
            "user_id": study_activity_payload["user_id"],
            "activityId": created_activity_id,
            "reminderTime": "2026-01-10T09:55:00Z",
            "message": "Reminder: Upcoming study activity starting soon."
        }
        r_reminder = requests.post(
            f"{BASE_URL}/api/time-management/reminders",
            json=reminder_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_reminder.status_code == 201, f"Expected 201 Created for reminder, got {r_reminder.status_code}"
        reminder_response = r_reminder.json()
        assert reminder_response.get("activityId") == created_activity_id, "Reminder activityId mismatch"
        assert reminder_response.get("user_id") == study_activity_payload["user_id"], "Reminder user_id mismatch"

    finally:
        # Cleanup: delete created reminder, time tracking, and schedule
        if created_activity_id:
            # Delete reminder
            try:
                requests.delete(
                    f"{BASE_URL}/api/time-management/reminders/{created_activity_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

            # Delete time tracking records - assuming single record per activity for test simplicity
            try:
                requests.delete(
                    f"{BASE_URL}/api/time-management/time-tracker/{created_activity_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

            # Delete study activity
            try:
                requests.delete(
                    f"{BASE_URL}/api/time-management/schedules/{created_activity_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_verify_time_management_tools_functionality()
