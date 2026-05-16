# Blood Donor Finder Backend API Documentation

## Endpoints

### User Registration

#### Endpoint Description
This endpoint allows new users to register and create an account in the Blood Donor Finder system. Upon successful registration, the user receives an authentication token for subsequent authenticated requests.

---

#### Request Details

**HTTP Method:** `POST`

**Endpoint Path:** `/users/register`

**Authentication:** Not required

**Middleware:** Input Validation

---

#### Request Body

The request body must be sent as JSON with the following structure:

```json
{
  "fullName": {
    "firstName": "string (required, min 3 characters)",
    "lastName": "string (optional, min 3 characters)"
  },
  "email": "string (required, valid email format)",
  "password": "string (required, min 6 characters)"
}
```

#### Request Body Parameters

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|------------------|-------------|
| `fullName.firstName` | String | Yes | Minimum 3 characters | User's first name |
| `fullName.lastName` | String | No | Minimum 3 characters | User's last name |
| `email` | String | Yes | Valid email format | User's email address (must be unique) |
| `password` | String | Yes | Minimum 6 characters | User's password |

---

#### Example Request

```bash
curl -X POST http://localhost:PORT/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

---

#### Response Format

**On Success (Status 201):**

```json
{
  "token": "jwt_token_string",
  "user": {
    "_id": "user_id",
    "fullName": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "john.doe@example.com",
    "socketId": null
  }
}
```

**On Validation Error (Status 400):**

```json
{
  "error": {
    "issues": [
      {
        "code": "string",
        "expected": "string",
        "received": "string",
        "path": ["fieldName"],
        "message": "Validation error message"
      }
    ]
  }
}
```

---

#### Status Codes

| Status Code | Description | Scenario |
|-------------|-------------|----------|
| `201` | Created | User successfully registered and account created |
| `400` | Bad Request | Validation failed (invalid email, short password, empty fields, etc.) |
| `500` | Internal Server Error | Unexpected server-side error |

---

#### Common Validation Errors

| Error | Cause |
|-------|-------|
| `First name must be at least 3 characters long` | `firstName` has fewer than 3 characters |
| `Last name must be at least 3 characters long` | `lastName` has fewer than 3 characters |
| `Email must be a valid email` | `email` is not in valid email format |
| `Email must be unique` | An account with the provided `email` already exists |
| `Password must be at least 6 characters long` | `password` has fewer than 6 characters |

---

---

#### Example Responses

**Example 1: Successful Registration (201)**

Request:
```bash
POST /users/register
Content-Type: application/json

{
  "fullName": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

Response:
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWYzNGQyMWE4YmMxMjM0NTY3ODkwYWIiLCJpYXQiOjE3MTA3Njc5OTZ9.2kX3vF8nM9pL5qR2tU4wX6yZ9aB1cD3eF5gH7iJ9kL",
  "user": {
    "_id": "65f34d21a8bc12345678901ab",
    "fullName": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "john.doe@example.com",
    "socketId": null
  }
}
```

---

**Example 2: Missing lastName (201) - Optional Field**

Request:
```bash
POST /users/register
Content-Type: application/json

{
  "fullName": {
    "firstName": "Jane"
  },
  "email": "jane@example.com",
  "password": "securePass456"
}
```

Response:
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWYzNGQyMWE4YmMxMjM0NTY3ODkwY2QiLCJpYXQiOjE3MTA3Njc5OTd9.3kX3vF8nM9pL5qR2tU4wX6yZ9aB1cD3eF5gH7iJ9kL",
  "user": {
    "_id": "65f34d21a8bc12345678902cd",
    "fullName": {
      "firstName": "Jane",
      "lastName": undefined
    },
    "email": "jane@example.com",
    "socketId": null
  }
}
```

---

**Example 3: Invalid Email Format (400)**

Request:
```bash
POST /users/register
Content-Type: application/json

{
  "fullName": {
    "firstName": "John",
    "lastName": "Smith"
  },
  "email": "invalid-email",
  "password": "securePassword123"
}
```

Response:
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "issues": [
      {
        "code": "invalid_string",
        "expected": "email",
        "received": "string",
        "path": ["email"],
        "message": "Invalid email"
      }
    ]
  }
}
```

---

**Example 4: Password Too Short (400)**

Request:
```bash
POST /users/register
Content-Type: application/json

{
  "fullName": {
    "firstName": "John",
    "lastName": "Smith"
  },
  "email": "john.smith@example.com",
  "password": "123"
}
```

Response:
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "issues": [
      {
        "code": "too_small",
        "minimum": 6,
        "type": "string",
        "path": ["password"],
        "message": "String must contain at least 6 character(s)"
      }
    ]
  }
}
```

---

**Example 5: firstName Too Short (400)**

Request:
```bash
POST /users/register
Content-Type: application/json

{
  "fullName": {
    "firstName": "Jo",
    "lastName": "Smith"
  },
  "email": "jo.smith@example.com",
  "password": "securePassword123"
}
```

Response:
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "issues": [
      {
        "code": "too_small",
        "minimum": 3,
        "type": "string",
        "path": ["fullName", "firstName"],
        "message": "String must contain at least 3 character(s)"
      }
    ]
  }
}
```

---

#### Notes

- The password is hashed using bcrypt before storage and is never returned in the response
- The JWT token returned should be used for subsequent authenticated requests
- The email field must be unique across all users
- The `lastName` field is optional, but if provided, must have at least 3 characters
