from clients.binance.scraper import BinanceScraper
from clients.firebase.notification import FirebaseNotificationClient
from utils.handle_listing_notification import handle_listing_notification


async def scan_binance_listings() -> int:
    scraper = BinanceScraper()
    listings = await scraper.get_latest_listings()
    notification_client = FirebaseNotificationClient()

    processed_count = 0
    for listing in listings:
        try:
            # Check for existing notifications with this address
            token_address = listing.get('currency', {}).get('address')
            if token_address:
                existing_notifications = await notification_client.check_for_last_notification_by_token(
                    token_address,
                    days_ago=7  # Check last 7 days
                )

                if existing_notifications:
                    print(
                        f"Token {token_address} was already notified in the last 7 days, skipping...")
                    continue

            # Process new notification
            processed_notification = await handle_listing_notification(listing)
            if processed_notification:
                await notification_client.save_notification(processed_notification)
                processed_count += 1

        except Exception as e:
            print(f"Error processing listing: {str(e)}")
            continue

    return processed_count
