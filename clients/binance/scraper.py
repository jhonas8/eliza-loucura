from typing import List, Dict, Any, Tuple
import openai
from bs4 import BeautifulSoup
from clients.base_scraper import BaseScraper
from utils.get_env_var import get_env_var
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener


class BinanceScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.binance.com"
        self.announcements_url = f"{self.base_url}/en/support/announcement/c-48?c=48&type=1"
        self.openai = openai.AsyncOpenAI(api_key=get_env_var('OPENAI_API_KEY'))

    async def get_article_links(self) -> List[Dict[str, str]]:
        """Get list of recent announcement articles"""
        print("\nFetching recent Binance announcements...")

        try:
            # Get full page content without waiting for a specific selector
            content = self.get_rendered_content(
                self.announcements_url,
                wait_time=30
            )

            print(f"Got page content, length: {len(content)}")
            soup = BeautifulSoup(content, 'html.parser')
            articles = []

            # Look for all announcement links with the specific class combination
            links = soup.select(
                'a.text-PrimaryText.hover\\:text-PrimaryYellow.active\\:text-PrimaryYellow.focus\\:text-PrimaryYellow.cursor-pointer.no-underline.w-fit')
            print(f"Found {len(links)} announcement links")

            for link_el in links:
                try:
                    # Get title from h3 element inside anchor
                    title_el = link_el.select_one('h3')
                    if not title_el:
                        continue

                    title = title_el.get_text().strip()
                    link = link_el.get('href', '')

                    if link and title:
                        print(f"Link: {link}")
                        print(f"Title: {title}")

                        if isinstance(link, list):
                            link = link[0]

                        if link.startswith('/'):
                            full_url = f"{self.base_url}{link}"
                        else:
                            full_url = f"{self.base_url}/{link}"

                        articles.append({
                            "title": title,
                            "url": full_url
                        })
                        print(f"Found article: {title}")

                except Exception as e:
                    print(f"Error extracting article info: {str(e)}")
                    continue

            print(f"Found {len(articles)} recent announcements")
            return articles

        except Exception as e:
            print(f"Error getting article links: {str(e)}")
            return []

    async def filter_listing_announcements(self, articles: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Get the most recent announcements for analysis"""
        print("\nGetting most recent announcements...")

        if not articles:
            return []

        # Take the lastest article as a listing announcement
        filtered_articles = articles[:1]

        print("\nSelected announcements:")
        for article in filtered_articles:
            print(f"\n- {article['title']}")
            print(f"  URL: {article['url']}")

        return filtered_articles

    async def extract_token_info(self, article_url: str) -> List[Tuple[str, str, str]]:
        """Extract token information from article content"""
        print(f"\nExtracting token info from: {article_url}")

        try:
            content = self.get_rendered_content(
                article_url,
                wait_time=15
            )

            print("\nArticle content:")
            print(content[:500] + "..." if len(content) > 500 else content)

            # Common patterns that indicate a token address
            address_patterns = [
                # Match "contract address here for verification: ADDRESS"
                r'contract address here for verification:\s*([1-9A-HJ-NP-Za-km-z]{43,44})',
                # Match "address: ADDRESS" pattern
                r'address:\s*([1-9A-HJ-NP-Za-km-z]{43,44})',
                # Match "Contract: ADDRESS" pattern
                r'Contract:\s*([1-9A-HJ-NP-Za-km-z]{43,44})',
                # Match standalone Solana addresses with context
                r'([1-9A-HJ-NP-Za-km-z]{43,44})'
            ]

            import re
            tokens = []

            # First try to find sections with both token name and address
            sections = re.finditer(
                r'(?:listing is for|listing of)\s+([^\s]+)\s+(?:with|and)?\s*(?:the)?\s*contract address[^:]*:\s*([1-9A-HJ-NP-Za-km-z]{43,44})',
                content,
                re.IGNORECASE
            )

            for match in sections:
                token_name = match.group(1).strip()
                address = match.group(2).strip()

                # Clean token name (remove common suffixes)
                token_name = re.sub(
                    r'(?i)with|and|the|futures?|listing|[,\.]', '', token_name).strip()

                if address and token_name:
                    print(f"Found token: {token_name} - {address}")
                    tokens.append((token_name.upper(), token_name, address))

            # If no tokens found with the first pattern, try others
            if not tokens:
                for pattern in address_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        address = match.group(1).strip()

                        # Try to find token name near the address
                        context = content[max(
                            0, match.start() - 100):match.end() + 100]
                        name_match = re.search(
                            r'(?:listing of|listing is for|token|coin)\s+([^\s]+)', context, re.IGNORECASE)

                        if name_match:
                            token_name = name_match.group(1).strip()
                            token_name = re.sub(
                                r'(?i)with|and|the|futures?|listing|[,\.]', '', token_name).strip()
                            print(
                                f"Found token with context: {token_name} - {address}")
                            tokens.append(
                                (token_name.upper(), token_name, address))

            print(f"\nFound {len(tokens)} tokens with addresses")
            return tokens

        except Exception as e:
            print(f"Error extracting token info: {str(e)}")
            return []

    async def verify_solana_tokens(self, tokens: List[Tuple[str, str, str]]) -> List[Dict[str, Any]]:
        """Verify tokens on Solana chain using dextools"""
        print("\nVerifying tokens on Solana chain...")
        print(f"Tokens: {tokens}")

        verified_tokens = []
        for symbol, name, address in tokens:
            try:
                print(f"\nVerifying {symbol} ({address})")

                # Try with address first
                verified_address = get_information_from_dexscreener(address)

                if not verified_address:
                    print(f"Address not found, trying with symbol: {symbol}")
                    verified_address = get_information_from_dexscreener(symbol)

                if verified_address:
                    print(
                        f"Token verified on Solana: {symbol} - {verified_address}")
                    verified_tokens.append({
                        "type": "new_coin",
                        "listing_type": "listing",
                        "message": f"{name} ({symbol}) has been listed on Binance!",
                        "currency": {
                            "symbol": symbol.upper(),
                            "name": name,
                            "address": verified_address
                        },
                        "exchange": {
                            "name": "Binance",
                            "trading_pair_url": self.announcements_url
                        },
                        "blockchain": "Solana",
                        "alert_condition_id": 2040394
                    })
                else:
                    print(f"Could not verify {symbol} on Solana chain")

            except Exception as e:
                print(f"Error verifying token {symbol}: {str(e)}")
                continue

        return verified_tokens

    async def get_latest_listings(self) -> List[Dict[str, Any]]:
        """Main method to get latest Solana listings from Binance"""
        try:
            # 1. Get recent announcements
            articles = await self.get_article_links()
            if not articles:
                return []

            # 2. Filter for listing announcements
            listing_articles = await self.filter_listing_announcements(articles)
            if not listing_articles:
                return []

            all_tokens = []
            # 3. Process each listing article
            for article in listing_articles:
                try:
                    # Extract token information
                    tokens = await self.extract_token_info(article['url'])
                    if tokens:
                        all_tokens.extend(tokens)
                except Exception as e:
                    print(
                        f"Error processing article {article['url']}: {str(e)}")
                    continue

            # 4. Verify tokens on Solana chain
            verified_listings = await self.verify_solana_tokens(all_tokens)
            print(f"\nFound {len(verified_listings)} verified Solana listings")

            return verified_listings

        except Exception as e:
            print(f"Error in get_latest_listings: {str(e)}")
            return []
