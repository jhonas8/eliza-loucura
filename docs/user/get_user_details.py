from dtos.user import UserResponse

get_user_details_doc = {
    "summary": "Get user details",
    "description": "Retrieve user details by ID or unique identifier",
    "response_model": UserResponse,
    "responses": {
        200: {
            "description": "User details retrieved successfully",
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
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {"detail": "User not found"}
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
