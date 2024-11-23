from application_types.tags import Tags

get_users_by_exchange_doc = {
    "summary": "Get users by exchange",
    "description": "Retrieve paginated list of users that have the specified exchange in their allowed_exchanges",
    "tags": [Tags.USERS],
    "responses": {
        200: {
            "description": "List of users retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": "123e4567-e89b-12d3-a456-426614174000",
                                "unique_identifier": "user123",
                                "target_type": "USER",
                                "allowed_exchanges": ["binance", "coinbase"],
                                "origin": "TELEGRAM",
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z"
                            }
                        ],
                        "next_page_token": "eyJsYXN0X2lkIjoiMTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIn0="
                    }
                }
            }
        },
        400: {
            "description": "Invalid page token",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid page token"}
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
