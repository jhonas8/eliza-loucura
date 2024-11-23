import asyncio
import argparse

from migrations.exchanges import populate_exchanges


async def run_migrations(args):
    if args.exchanges:
        await populate_exchanges()


def main():
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--exchanges', action='store_true',
                        help='Populate exchanges collection')

    args = parser.parse_args()
    asyncio.run(run_migrations(args))


if __name__ == "__main__":
    main()
