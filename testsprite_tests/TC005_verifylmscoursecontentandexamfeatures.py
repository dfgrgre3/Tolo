import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_verifylmscoursecontentandexamfeatures():
    # Create a new course to test with
    course_payload = {
        "name": "Test Course for TC005",
        "name_ar": "دورة اختبارية لـ TC005",
        "description": "This is a test course for verifying LMS features."
    }

    created_course_id = None
    created_lesson_id = None
    created_exam_id = None

    try:
        # Create course
        resp = requests.post(f"{BASE_URL}/api/courses", json=course_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Failed to create course: {resp.text}"
        course_data = resp.json()
        created_course_id = course_data.get("id")
        assert created_course_id is not None, "Created course ID is None"

        # Add lesson to the course
        lesson_payload = {
            "title": "Introduction Lesson",
            "content": "Welcome to the introduction lesson."
        }
        resp = requests.post(f"{BASE_URL}/api/courses/{created_course_id}/lessons", json=lesson_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Failed to create lesson: {resp.text}"
        lesson_data = resp.json()
        created_lesson_id = lesson_data.get("id")
        assert created_lesson_id is not None, "Created lesson ID is None"

        # Retrieve course content (List lessons)
        resp = requests.get(f"{BASE_URL}/api/courses/{created_course_id}/content", headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to retrieve course content: {resp.text}"
        content_data = resp.json()
        lessons = content_data.get("lessons")
        assert isinstance(lessons, list), "Lessons is not a list"
        assert any(lesson.get("id") == created_lesson_id for lesson in lessons), "Created lesson not found in course content"

        # Retrieve lesson display
        resp = requests.get(f"{BASE_URL}/api/lessons/{created_lesson_id}", headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to retrieve lesson display: {resp.text}"
        lesson_display = resp.json()
        assert lesson_display.get("id") == created_lesson_id, "Lesson ID mismatch in lesson display"
        assert "content" in lesson_display, "Lesson content missing"

        # Create an exam for the course
        exam_payload = {
            "title": "Sample Exam",
            "questions": [
                {
                    "question": "What is 2+2?",
                    "options": ["2", "3", "4", "5"],
                    "correctOptionIndex": 2
                },
                {
                    "question": "Select the correct color of the sky.",
                    "options": ["Green", "Blue", "Red", "Yellow"],
                    "correctOptionIndex": 1
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/courses/{created_course_id}/exams", json=exam_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Failed to create exam: {resp.text}"
        exam_data = resp.json()
        created_exam_id = exam_data.get("id")
        assert created_exam_id is not None, "Created exam ID is None"

        # Take the exam by submitting answers
        exam_submission_payload = {
            "answers": [
                {"questionIndex": 0, "selectedOptionIndex": 2},  # Correct answer
                {"questionIndex": 1, "selectedOptionIndex": 1}   # Correct answer
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/exams/{created_exam_id}/submit", json=exam_submission_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to submit exam answers: {resp.text}"
        result_data = resp.json()
        assert "score" in result_data, "Score not returned after exam submission"
        assert isinstance(result_data["score"], (int, float)), "Score is not numeric"
        assert result_data.get("score") == 100, f"Expected full score 100 but got {result_data.get('score')}"

    finally:
        # Cleanup created resources
        if created_exam_id is not None:
            requests.delete(f"{BASE_URL}/api/exams/{created_exam_id}", headers=HEADERS, timeout=TIMEOUT)
        if created_lesson_id is not None and created_course_id is not None:
            requests.delete(f"{BASE_URL}/api/courses/{created_course_id}/lessons/{created_lesson_id}", headers=HEADERS, timeout=TIMEOUT)
        if created_course_id is not None:
            requests.delete(f"{BASE_URL}/api/courses/{created_course_id}", headers=HEADERS, timeout=TIMEOUT)

test_verifylmscoursecontentandexamfeatures()
