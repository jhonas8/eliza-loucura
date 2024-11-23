from dtos.user import UserResponse

update_user_doc = {
    "summary": "Update user",
    "description": "Update user details by ID or unique identifier. Creates new user if not exists.",
    "response_model": UserResponse,
    "responses": {
        200: {
            "description": "User updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "unique_identifier": "user123",
                        "target_type": "USER",
                        "allowed_exchanges": ["binance", "coinbase"],
                        "origin": "TELEGRAM",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    }
                }
            }
        },
        201: {
            "description": "User created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "unique_identifier": "user123",
                        "target_type": "USER",
                        "allowed_exchanges": ["binance"],
                        "origin": "TELEGRAM",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Error processing request: {error_message}"}
                }
            }
        }
    }
}
