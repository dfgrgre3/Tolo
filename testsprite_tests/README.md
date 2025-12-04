# TestSprite Test Suite

This directory contains the TestSprite automated test suite for the ThanaWy Platform.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Install Playwright Browsers**:
    ```bash
    python -m playwright install
    ```

## Running Tests

### Run All Tests
You can run the complete test suite using the npm script:
```bash
npm run test:sprite
```

Or directly with Python:
```bash
python TC000_Complete_Test_Suite.py
```

### Run Individual Tests
To run a specific test case, execute the corresponding Python file:
```bash
python TC001_EmailPassword_Login_Success.py
```

## Test Structure
- `TC000_Complete_Test_Suite.py`: Main runner that executes all tests and generates a report.
- `TCxxx_...py`: Individual test cases for specific features.

## Results
Test results are printed to the console and saved to `test_results_complete.json` when running the complete suite.
