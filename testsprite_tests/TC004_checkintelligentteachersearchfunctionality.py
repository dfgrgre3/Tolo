import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_check_intelligent_teacher_search_functionality():
    url = f"{BASE_URL}/api/teacher-search"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    # Example search criteria payload; adjust fields as per actual API schema if known
    payload = {
        "subject": "Mathematics",
        "location": "New York",
        "rating_min": 4,
        "availability": ["Monday", "Wednesday"]
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, dict), "Response JSON root should be a dictionary"
    assert "teachers" in data, "'teachers' key not found in response"

    teachers = data["teachers"]
    assert isinstance(teachers, list), "'teachers' should be a list"

    # If no teachers found, that might still be valid, so no failure here.
    if teachers:
        for teacher in teachers:
            # Each teacher should have required keys; adjust as per API schema
            assert isinstance(teacher, dict), "Each teacher should be a dict"
            assert "id" in teacher, "Teacher missing 'id'"
            assert "name" in teacher, "Teacher missing 'name'"
            assert "subjects" in teacher, "Teacher missing 'subjects'"
            assert "location" in teacher, "Teacher missing 'location'"
            assert "rating" in teacher, "Teacher missing 'rating'"

            # Validate that each teacher matches the search criteria in some way
            assert isinstance(teacher["subjects"], list), "'subjects' should be a list"
            assert payload["subject"] in teacher["subjects"] or payload["subject"].lower() in (s.lower() for s in teacher["subjects"]), (
                f"Teacher subjects {teacher['subjects']} do not include searched subject {payload['subject']}"
            )
            assert payload["location"].lower() == teacher["location"].lower(), (
                f"Teacher location {teacher['location']} does not match searched location {payload['location']}"
            )
            assert isinstance(teacher["rating"], (int, float)), "'rating' should be numeric"
            assert teacher["rating"] >= payload["rating_min"], (
                f"Teacher rating {teacher['rating']} is less than minimum required {payload['rating_min']}"
            )
    else:
        # No teachers found is not necessarily a test failure, but log or note it
        print("Warning: No teachers found matching the criteria")

test_check_intelligent_teacher_search_functionality()