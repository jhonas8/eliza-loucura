from clients.coinbase.scraper import CoinbaseScraper
from utils.handle_listing_notification import handle_listing_notification
from clients.firebase.notification import FirebaseNotificationClient
from utils.send_notification import send_notification


async def scan_coinbase_listings() -> int:
    try:
        print("\n=== Starting Coinbase Listings Scan ===")

        scraper = CoinbaseScraper()
        listings = await scraper.get_latest_listings()
        print(f"\nFound {len(listings)} potential listings to process")

        notification_client = FirebaseNotificationClient()
        processed_count = 0

        for listing in listings:
            try:
                print(
                    f"\nProcessing listing for {listing['currency']['name']}")
                processed_notification = await handle_listing_notification(listing)

                if processed_notification:
                    # Save notification
                    await notification_client.save_notification(processed_notification)
                    print(
                        f"Notification saved to Firebase: {processed_notification['currency']['symbol']}")

                    # Forward to webhooks
                    await send_notification(processed_notification)
                    print(
                        f"Notification forwarded to webhooks: {processed_notification['currency']['symbol']}")

                    processed_count += 1
                else:
                    print(
                        f"Listing skipped for {listing['currency']['symbol']}")
            except Exception as e:
                print(f"Error processing individual listing: {str(e)}")
                continue  # Continue with next listing even if one fails

        print(f"\n=== Scan Complete. Processed {processed_count} listings ===")
        return processed_count
    except Exception as e:
        print(f"Error in Coinbase scan: {str(e)}")
        return 0  # Return 0 instead of raising error
