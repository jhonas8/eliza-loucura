from clients.binance.scraper import BinanceScraper
from clients.firebase.notification import FirebaseNotificationClient
from utils.handle_notification import handle_notification


async def scan_binance_listings() -> int:
    scraper = BinanceScraper()
    listings = await scraper.get_latest_listings()
    notification_client = FirebaseNotificationClient()

    processed_count = 0
    for listing in listings:
        processed_notification = await handle_notification(listing)
        if processed_notification:
            await notification_client.save_notification(processed_notification)
            processed_count += 1

    return processed_count
