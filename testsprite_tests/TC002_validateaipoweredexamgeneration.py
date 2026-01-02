import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_validate_ai_powered_exam_generation():
    """
    Verify that the AI-powered exam generator creates exams accurately based on input parameters and curriculum requirements.
    This test creates an exam generation request with specific parameters, validates the response format and content,
    and finally deletes the generated exam to clean up.
    """
    exam_id = None
    try:
        # Prepare payload with input parameters and curriculum requirements for exam generation
        payload = {
            "subject": "Mathematics",
            "grade_level": 10,
            "curriculum": "Common Core",
            "topics": [
                "Algebra",
                "Geometry",
                "Trigonometry"
            ],
            "difficulty": "medium",
            "number_of_questions": 20,
            "question_types": ["multiple_choice", "short_answer"],
            "time_limit_minutes": 60
        }
        # POST to AI exam generator endpoint
        response = requests.post(
            f"{BASE_URL}/api/exams/generate",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}"
        data = response.json()
        # Validate response contains exam id and exam details
        assert "exam_id" in data and isinstance(data["exam_id"], str), "exam_id missing or invalid"
        exam_id = data["exam_id"]

        # Validate exam structure and content
        assert "exam" in data and isinstance(data["exam"], dict), "exam details missing or invalid"
        exam = data["exam"]
        # Check essential fields in the exam
        assert exam.get("subject") == payload["subject"], "Subject mismatch"
        assert exam.get("grade_level") == payload["grade_level"], "Grade level mismatch"
        assert exam.get("curriculum") == payload["curriculum"], "Curriculum mismatch"
        # Validate questions count
        questions = exam.get("questions")
        assert isinstance(questions, list), "questions should be a list"
        assert len(questions) == payload["number_of_questions"], f"Expected {payload['number_of_questions']} questions, got {len(questions)}"
        # Validate question types and required fields in each question
        for q in questions:
            assert "id" in q and isinstance(q["id"], str), "Question id missing or invalid"
            assert "type" in q and q["type"] in payload["question_types"], f"Unexpected question type {q.get('type')}"
            assert "text" in q and isinstance(q["text"], str) and q["text"], "Question text missing or empty"
            # For multiple choice, validate options and correct answer
            if q["type"] == "multiple_choice":
                assert "options" in q and isinstance(q["options"], list) and len(q["options"]) >= 2, "Multiple choice options missing or invalid"
                assert "correct_answer" in q and q["correct_answer"] in q["options"], "Correct answer missing or invalid"
            # For short answer, validate model answer exists
            if q["type"] == "short_answer":
                assert "model_answer" in q and isinstance(q["model_answer"], str) and q["model_answer"], "Model answer missing or empty"

        # Validate time limit
        assert exam.get("time_limit_minutes") == payload["time_limit_minutes"], "Time limit mismatch"

    finally:
        # Cleanup by deleting the generated exam if created
        if exam_id is not None:
            try:
                del_response = requests.delete(
                    f"{BASE_URL}/api/exams/{exam_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                # Accept 200 OK or 204 No Content as successful deletion
                assert del_response.status_code in (200, 204), "Failed to delete generated exam"
            except Exception:
                pass

test_validate_ai_powered_exam_generation()