from application_types.tags import Tags

cryptocurrentalert_new_coin_doc = {
    "summary": "Process new cryptocurrency coin alerts",
    "description": "Handles notifications for newly listed cryptocurrencies on supported exchanges",
    "response_description": "Confirmation of new coin alert processing",
    "tags": [Tags.WEBHOOKS],
    "responses": {
        200: {
            "description": "New coin alert successfully processed",
            "content": {
                "application/json": {
                    "example": {"message": "New coin alert processed successfully"}
                }
            }
        },
        400: {
            "description": "Invalid coin alert format",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid coin alert format"}
                }
            }
        },
        500: {
            "description": "Server error while processing coin alert",
            "content": {
                "application/json": {
                    "example": {"detail": "Error processing coin alert: {error_message}"}
                }
            }
        }
    }
}
