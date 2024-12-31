from clients.coinbase.scraper import CoinbaseScraper
from utils.handle_notification import handle_notification
from clients.firebase.notification import FirebaseNotificationClient
from utils.send_notification import send_notification


async def scan_coinbase_listings() -> int:
    scraper = CoinbaseScraper()
    listings = await scraper.get_latest_listings()

    notification_client = FirebaseNotificationClient()
    processed_count = 0

    for listing in listings:
        processed_notification = await handle_notification(listing)
        if processed_notification:
            # Save notification
            await notification_client.save_notification(processed_notification)
            print(f"Notification saved: {processed_notification}")

            # Forward to webhooks
            await send_notification(processed_notification)
            print(
                f"Notification forwarded to webhooks: {processed_notification}")

            processed_count += 1

    return processed_count
