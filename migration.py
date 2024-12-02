import asyncio
import argparse

from migrations.exchanges import populate_exchanges
from migrations.webhook_test import test_webhook_notifications


async def run_migrations(args):
    if args.exchanges:
        await populate_exchanges()

    if args.test_webhook:
        await test_webhook_notifications()


def main():
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--exchanges', action='store_true',
                        help='Populate exchanges collection')
    parser.add_argument('--test-webhook', action='store_true',
                        help='Test webhook notifications')

    args = parser.parse_args()
    asyncio.run(run_migrations(args))


if __name__ == "__main__":
    main()
