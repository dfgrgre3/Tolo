import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_check_system_performance_and_caching_strategies():
    """
    Test backend API performance and caching strategies to ensure system meets performance benchmarks under load.
    This test will:
    - Make repeated requests to key API endpoints to simulate load
    - Measure response times to check performance consistency
    - Validate presence of caching headers (e.g., Cache-Control)
    """

    endpoints_to_test = [
        "/api/courses",        # Example LMS content endpoint
        "/api/exams/latest",   # Example exam endpoint
        "/api/leaderboards",   # Example gamification leaderboard
        "/api/notifications",  # Example real-time notification endpoint
    ]

    max_avg_response_time_seconds = 1.0  # Example performance benchmark per request
    request_counts = 10

    for endpoint in endpoints_to_test:
        url = BASE_URL + endpoint
        response_times = []

        # Warm up the cache with one request
        try:
            warmup = requests.get(url, timeout=TIMEOUT)
            warmup.raise_for_status()
        except Exception as e:
            assert False, f"Warmup request failed for {url}: {str(e)}"

        # Measure response times over multiple requests
        for _ in range(request_counts):
            start_time = time.perf_counter()
            try:
                resp = requests.get(url, timeout=TIMEOUT)
                resp.raise_for_status()
            except Exception as e:
                assert False, f"Request failed for {url}: {str(e)}"
            duration = time.perf_counter() - start_time
            response_times.append(duration)

            # Check caching header presence on each response
            cache_control = resp.headers.get("Cache-Control")
            assert cache_control is not None and len(cache_control) > 0, f"Cache-Control header missing on {url}"

        avg_response_time = sum(response_times) / len(response_times)
        assert avg_response_time <= max_avg_response_time_seconds, (
            f"Average response time {avg_response_time:.2f}s for {url} exceeds benchmark of "
            f"{max_avg_response_time_seconds}s"
        )

test_check_system_performance_and_caching_strategies()