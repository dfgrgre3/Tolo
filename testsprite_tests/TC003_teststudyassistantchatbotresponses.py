import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def teststudyassistantchatbotresponses():
    """
    Ensure the study assistant chatbot provides helpful, contextually relevant responses to student queries.
    """
    url = f"{BASE_URL}/api/chatbot/study-assistant"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Example student queries to test chatbot responses for relevance and helpfulness
    test_queries = [
        "Can you explain the Pythagorean theorem?",
        "How do I improve my time management skills for studying?",
        "What are some tips for preparing for a biology exam?",
    ]

    for query in test_queries:
        payload = {"query": query}
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed for query '{query}': {e}"

        try:
            data = response.json()
        except ValueError:
            assert False, f"Response is not valid JSON for query '{query}'"

        # Validate response structure and content
        assert "response" in data, f"Missing 'response' key in chatbot reply for query '{query}'"
        reply = data["response"]
        assert isinstance(reply, str) and len(reply) > 0, f"Chatbot response is empty or not a string for query '{query}'"

        # Basic relevance check: response should contain at least one keyword from the query (case insensitive)
        query_keywords = [word.lower() for word in query.split() if len(word) > 3]
        reply_lower = reply.lower()
        assert any(keyword in reply_lower for keyword in query_keywords), \
            f"Chatbot response may not be contextually relevant for query '{query}'. Response: '{reply}'"

teststudyassistantchatbotresponses()
