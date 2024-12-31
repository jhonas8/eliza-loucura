from application_types.tags import Tags

scan_coinbase_listings_doc = {
    "summary": "Scan Coinbase listings",
    "description": "Scan Coinbase blog for new Solana token listings",
    "tags": [Tags.EXCHANGES],
    "responses": {
        200: {
            "description": "Scan completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "processed_listings": 2
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
