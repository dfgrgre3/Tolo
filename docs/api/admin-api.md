# Admin API Documentation

## Next.js: BFF vs rewrite

When the frontend calls `/api/admin/...` on the app origin, some paths are implemented as Next Route Handlers and others hit the Go API via `rewrites`. See the short internal guide (Arabic): [admin-bff.md](./admin-bff.md).

## Base URL
```
https://api.thanawy.com/api/admin
```

## Authentication
All admin endpoints require authentication via JWT Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limiting
- Read operations: 100 requests/minute
- Write operations: 30 requests/minute
- Critical operations: 10 requests/minute

## Endpoints

### Dashboard

#### GET /dashboard
Get admin dashboard statistics.

**Response:**
```json
{
  "data": {
    "users": {
      "total": 1000,
      "newToday": 15,
      "activeToday": 450
    },
    "exams": {
      "total": 50,
      "completedToday": 120
    },
    "subjects": {
      "total": 25,
      "active": 23
    },
    "revenue": {
      "today": 1500,
      "thisMonth": 45000
    }
  }
}
```

### Users Management

#### GET /users
List all users with pagination and filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |
| role | string | Filter by role (STUDENT, TEACHER, ADMIN) |
| search | string | Search by name or email |
| status | string | Filter by status (active, inactive) |

**Response:**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "STUDENT",
        "gradeLevel": "THIRD_SECONDARY",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "lastLogin": "2024-03-15T08:20:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### POST /users
Create a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "STUDENT",
  "gradeLevel": "THIRD_SECONDARY"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

#### GET /users/:id
Get user details.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "gradeLevel": "THIRD_SECONDARY",
    "isActive": true,
    "profile": {
      "avatar": "https://...",
      "phone": "+1234567890"
    },
    "stats": {
      "examsTaken": 15,
      "averageScore": 85,
      "coursesEnrolled": 3
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-03-15T08:20:00Z"
  }
}
```

#### PATCH /users/:id
Update user information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "gradeLevel": "SECOND_SECONDARY",
  "isActive": false
}
```

#### DELETE /users/:id
Delete a user.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

### Subjects Management

#### GET /subjects
List all subjects.

#### POST /subjects
Create a new subject.

**Request Body:**
```json
{
  "name": "Mathematics",
  "description": "Advanced mathematics course",
  "gradeLevel": "THIRD_SECONDARY",
  "isPublished": true
}
```

#### PATCH /subjects/:id
Update subject.

#### DELETE /subjects/:id
Delete subject.

### Exams Management

#### GET /exams
List all exams.

#### POST /exams
Create a new exam.

**Request Body:**
```json
{
  "title": "Mathematics Final Exam",
  "description": "End of year examination",
  "subjectId": "subject-uuid",
  "duration": 120,
  "totalQuestions": 50,
  "passingScore": 60,
  "isPublished": false
}
```

### Notifications

#### POST /notifications/broadcast
Send broadcast notification to multiple users.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "title": "Important Update",
  "message": "Please check your dashboard",
  "type": "info",
  "channels": ["in-app", "email"],
  "actionUrl": "/dashboard"
}
```

**Response:**
```json
{
  "data": {
    "broadcastId": "broadcast-uuid",
    "summary": {
      "total": 3,
      "success": 3,
      "failure": 0
    },
    "queued": true
  }
}
```

#### GET /broadcasts
List all broadcasts.

### Reports

#### POST /reports
Create custom report.

**Request Body:**
```json
{
  "name": "Monthly User Growth",
  "description": "Track user registration trends",
  "widgets": [
    {
      "type": "line",
      "title": "New Registrations",
      "dataSource": "users",
      "metrics": [
        {
          "name": "count",
          "field": "id",
          "aggregation": "count"
        }
      ],
      "dimensions": [
        {
          "field": "createdAt",
          "label": "Date",
          "format": "date"
        }
      ]
    }
  ]
}
```

#### POST /reports/:id/execute
Execute report and get results.

**Response:**
```json
{
  "data": {
    "result": {
      "reportId": "report-uuid",
      "executedAt": "2024-03-15T10:30:00Z",
      "results": {
        "widget-1": {
          "data": [
            { "date": "2024-03-01", "count": 15 },
            { "date": "2024-03-02", "count": 23 }
          ]
        }
      }
    }
  }
}
```

### Search

#### GET /search/users
Search users with full-text search.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |
| fields | string | Comma-separated fields to search (name,email,username) |
| cursor | string | Pagination cursor |
| limit | integer | Results per page |

### Analytics

#### POST /analytics/journey
Track user journey.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "sessionId": "session-uuid",
  "startedAt": "2024-03-15T10:00:00Z",
  "steps": [
    {
      "page": "/dashboard",
      "action": "page_view",
      "timestamp": "2024-03-15T10:00:00Z"
    }
  ],
  "completed": true
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "message": "Required field 'email' is missing"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

## WebSocket Events

Connect to: `wss://api.thanawy.com/ws`

### Authentication
Send auth message after connection:
```json
{
  "type": "auth",
  "token": "jwt-token"
}
```

### Events

#### notification
Receive real-time notifications.

#### broadcast-progress
Get progress updates for broadcasts.

#### analytics-update
Receive live analytics updates.

#### admin-alert
Receive system alerts.

#### audit-log
Receive audit log events.

## SDK Examples

### JavaScript/TypeScript
```typescript
import { AdminClient } from '@thanawy/admin-sdk';

const client = new AdminClient({
  baseURL: 'https://api.thanawy.com/api',
  token: 'your-jwt-token'
});

// Get dashboard stats
const dashboard = await client.dashboard.getStats();

// List users
const users = await client.users.list({
  page: 1,
  limit: 20,
  role: 'STUDENT'
});

// Create user
const newUser = await client.users.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'STUDENT'
});

// Send broadcast
await client.notifications.broadcast({
  userIds: ['user-1', 'user-2'],
  title: 'Important Update',
  message: 'Check your dashboard',
  type: 'info'
});
```

### cURL Examples
```bash
# Get dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://api.thanawy.com/api/admin/dashboard

# List users
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.thanawy.com/api/admin/users?page=1&limit=20"

# Create user
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","role":"STUDENT"}' \
  https://api.thanawy.com/api/admin/users
```
