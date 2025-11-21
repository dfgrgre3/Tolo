# Scripts Documentation

## create-test-account.ts

This script creates a test account in the database for development and testing purposes.

### Security

For security reasons, this script **does not** contain hardcoded passwords. You must provide credentials via environment variables.

### Usage

1. Set the required environment variable:

```bash
# Windows (PowerShell)
$env:TEST_ACCOUNT_PASSWORD="YourSecurePassword123!@#"

# Linux/Mac
export TEST_ACCOUNT_PASSWORD="YourSecurePassword123!@#"
```

2. Run the script:

```bash
npm run create-test-account
# or
npx tsx scripts/create-test-account.ts
```

### Optional Environment Variables

- `TEST_ACCOUNT_EMAIL` - Email for the test account (default: `test@example.com`)
- `TEST_ACCOUNT_PASSWORD` - **Required** - Password for the test account
- `TEST_ACCOUNT_NAME` - Name for the test account (default: `مستخدم تجريبي`)

### Example

```bash
# Windows (PowerShell)
$env:TEST_ACCOUNT_EMAIL="dev@example.com"
$env:TEST_ACCOUNT_PASSWORD="SecurePass123!@#"
$env:TEST_ACCOUNT_NAME="Dev User"
npx tsx scripts/create-test-account.ts

# Linux/Mac
TEST_ACCOUNT_EMAIL="dev@example.com" \
TEST_ACCOUNT_PASSWORD="SecurePass123!@#" \
TEST_ACCOUNT_NAME="Dev User" \
npx tsx scripts/create-test-account.ts
```

### Notes

- The script will check if the test account already exists before creating it
- Passwords are hashed using bcryptjs with a salt round of 12
- The test account is created with email verification already completed
