from application_types.tags import Tags

create_webhook_endpoint_doc = {
    "summary": "Create webhook endpoint",
    "description": "Register a new webhook endpoint URL",
    "tags": [Tags.WEBHOOKS],
    "responses": {
        200: {
            "description": "Webhook endpoint created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "webhook1",
                        "url": "https://example.com/webhook",
                        "description": "Example webhook endpoint"
                    }
                }
            }
        },
        400: {
            "description": "Invalid webhook URL or duplicate URL",
            "content": {
                "application/json": {
                    "example": {"detail": "Webhook endpoint with this URL already exists"}
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
