from application_types.tags import Tags

get_notifications_doc = {
    "summary": "Get notifications history",
    "description": "Retrieve paginated list of notifications",
    "tags": [Tags.NOTIFICATIONS],
    "responses": {
        200: {
            "description": "List of notifications retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": "notification1",
                                "data": {
                                    "exchange": "binance",
                                    "coin": "BTC",
                                    "event": "new_listing"
                                },
                                "created_at": "2024-01-01T00:00:00Z"
                            }
                        ],
                        "total": 50,
                        "page": 1,
                        "size": 10,
                        "has_more": True
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
