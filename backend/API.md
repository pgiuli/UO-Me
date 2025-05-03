# API Routes for UO-Me

## Authentication
### Register
- **Endpoint**: `/api/auth/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string"
  }
  ```
- **Response**:
    ```json
    {
        "message": "User registered successfully"
    }
    ```

### Login
- **Endpoint**: `/api/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
    ```json
    {
        "access_token": "string",
        "token_type": "bearer"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid credentials"
    }
    ```
### Logout
- **Endpoint**: `/api/auth/logout`
- **Method**: `POST`
- **Headers**:
    - `Authorization: Bearer <access_token>`
- **Response**:
    ```json
    {
        "message": "User logged out successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
## User Management
### Get Logged User Profile
- **Endpoint**: `/api/users/profile`
- **Method**: `GET`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**:
    ```json
    {
        "id": 1,
        "username": "string",
        "email": "string",
        "created_at": "2023-10-01T00:00:00Z"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Update User Profile
- **Endpoint**: `/api/users/profile`
- **Method**: `PUT`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**:
    ```json
    {
        "username": "string",
        "email": "string"
    }
    ```
- **Response**:
    ```json
    {
        "message": "User profile updated successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Delete User Account
- **Endpoint**: `/api/users/profile`
- **Method**: `DELETE`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**: 
    ```json
    {
        "message": "User account deleted successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
## Payments
### Create Payment
- **Endpoint**: `/api/payments/create`
- **Method**: `POST`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**:
    ```json
    {
        "title": "string",
        "description": "string",
        "total_amount": 100.0,
        "shares": [
            {
                "user_id": 1,
                "amount": 50.0
            },
            {
                "user_id": 2,
                "amount": 50.0
            }
        ],
        "due_date": "2023-10-01T00:00:00Z"
    }
    ```
- **Response**:
    ```json
    {
        "message": "Payment created successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Get Payments
- **Endpoint**: `/api/payments`
- **Method**: `GET`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**: 
    ```json
    [
        {
            "id": 1,
            "description": "string",
            "total_amount": 100.0,
            "created_at": "2023-10-01T00:00:00Z",
            "due_date": "2023-10-01T00:00:00Z",
            "shares": [
                {
                    "user_id": 1,
                    "amount": 50.0
                },
                {
                    "user_id": 2,
                    "amount": 50.0
                }
            ]
        }
    ]
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```

## Shares
### Fulfill Share
- **Endpoint**: `/api/shares/fulfill`
- **Method**: `POST`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**: 
    ```json
    {
        "share_id": 1,
        "amount": 50.0
    }
    ```
- **Response**:
    ```json
    {
        "message": "Share fulfilled successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Get Shares
- **Endpoint**: `/api/shares`
- **Method**: `GET`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**:
    ```json
    [
        {
            "id": 1,
            "payment_id": 1,
            "user_id": 1,
            "amount": 50.0,
            "status": "pending"
        }
    ]
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
## Friendships
### Send Friend Request
- **Endpoint**: `/api/friendships/request`
- **Method**: `POST`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**:
    ```json
    {
        "friend_id": 2
    }
    ```
- **Response**:
    ```json
    {
        "message": "Friend request sent successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Accept Friend Request
- **Endpoint**: `/api/friendships/accept`
- **Method**: `POST`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**:
    ```json
    {
        "friend_id": 2
    }
    ```
- **Response**:
    ```json
    {
        "message": "Friend request accepted successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Delete Friend
- **Endpoint**: `/api/friendships/delete`
- **Method**: `DELETE`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Request Body**:
    ```json
    {
        "friend_id": 2
    }
    ```
- **Response**:
    ```json
    {
        "message": "Friend deleted successfully"
    }
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Get Friends List
- **Endpoint**: `/api/friendships`
- **Method**: `GET`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**:
    ```json
    [
        {
            "id": 2,
            "username": "friend_username",
            "status": "accepted"
        }
    ]
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
### Get Friend Requests
- **Endpoint**: `/api/friendships/requests`
- **Method**: `GET`
- **Headers**:
    - `Authorization
        Bearer <access_token>`
- **Response**:     
    ```json
    [
        {
            "id": 2,
            "username": "friend_username",
            "status": "pending"
        }
    ]
    ```
- **Error Response**:
    ```json
    {
        "detail": "Invalid token"
    }
    ```
    ### Search Users
    - **Endpoint**: `/api/users/search`
    - **Method**: `GET`
    - **Headers**:
        - `Authorization: Bearer <access_token>`
    - **Query Parameters**:
        - `query`: The username search string.
    - **Response**:
        ```json
        [
            {
                "id": 3,
                "username": "searched_user"
            }
        ]
        ```
    - **Error Response**:
        ```json
        {
            "detail": "Invalid token"
        }
        ```