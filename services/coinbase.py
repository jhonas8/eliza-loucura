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

                print(
                    f"\nProcessing listing for {listing['currency']['name']}")
                processed_notification = await handle_listing_notification(listing)

                if processed_notification:
                    # Save notification
                    await notification_client.save_notification(
                        {**processed_notification, 'currency_address': token_address})
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
                continue

        print(f"\n=== Scan Complete. Processed {processed_count} listings ===")
        return processed_count

    except Exception as e:
        print(f"Error in Coinbase scan: {str(e)}")
        return 0
