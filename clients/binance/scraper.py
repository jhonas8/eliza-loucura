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
        """Use GPT to identify potential listing announcements"""
        print("\nAnalyzing announcements for potential listings...")

        if not articles:
            return []

        try:
            # Create numbered list of titles for better logging
            titles_list = [f"{i}. {article['title']}" for i,
                           article in enumerate(articles)]
            titles = "\n".join(titles_list)

            print("\nSending these titles to GPT for analysis:")
            print(titles)

            prompt = f"""
            Analyze these Binance announcement titles and identify which ones are about new token listings.
            
            Titles:
            {titles}
            
            Respond with ONLY the index numbers (0-based) of titles that are about new token listings.
            Example response: 0,3,5
            
            Rules:
            - Only include definite listing announcements
            - Exclude futures listings, trading competitions, staking announcements
            - Include Megadrop and Launchpool announcements
            - If no listings found, respond with "none"
            - Do not include any explanations
            """

            response = await self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )

            result = response.choices[0].message.content.strip(
            ) if response.choices[0].message.content else None
            print(f"\nGPT Response: {result}")

            if not result or result.lower() == "none":
                print("No listing announcements found")
                return []

            try:
                indices = [int(idx) for idx in result.split(",")]
                filtered_articles = []

                print("\nSelected announcements:")
                for idx in indices:
                    if idx < len(articles):
                        article = articles[idx]
                        filtered_articles.append(article)
                        print(f"- {article['title']}")
                        print(f"  URL: {article['url']}")

                print(
                    f"\nFound {len(filtered_articles)} potential listing announcements")
                return filtered_articles

            except ValueError as e:
                print(f"Error parsing GPT response: {str(e)}")
                return []

        except Exception as e:
            print(f"Error in filter_listing_announcements: {str(e)}")
            return []

    async def extract_token_info(self, article_url: str) -> List[Tuple[str, str, str]]:
        """Extract token information from article content"""
        print(f"\nExtracting token info from: {article_url}")

        try:
            content = self.get_rendered_content(
                article_url,
                selector='div.css-1ruscrd, article.css-1ql2hru',
                wait_time=15
            )

            print("\nArticle content:")
            print(content[:500] + "..." if len(content) > 500 else content)

            prompt = f"""
            Extract token information from this Binance announcement.
            
            Announcement:
            {content}
            
            Respond with token information in this format:
            TOKEN_NAME|TOKEN_SYMBOL|TOKEN_ADDRESS
            
            Example:
            Solana Token|SOL|So11111111111111111111111111111111111111112
            
            Rules:
            - Only include Solana tokens (look for mentions of SPL tokens or Solana network)
            - Only include tokens with addresses
            - Addresses must be exact matches from the text
            - If no valid tokens found, respond with "none"
            - Do not include any explanations
            """

            response = await self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )

            result = response.choices[0].message.content.strip(
            ) if response.choices[0].message.content else None
            print(f"\nGPT Token Extraction Response: {result}")

            tokens = []
            if result and result.lower() != "none":
                for line in result.split('\n'):
                    if '|' in line:
                        name, symbol, address = line.strip().split('|')
                        tokens.append(
                            (symbol.strip(), name.strip(), address.strip()))
                        print(f"Extracted: {name} ({symbol}) - {address}")

            return tokens

        except Exception as e:
            print(f"Error extracting token info: {str(e)}")
            return []

    async def verify_solana_tokens(self, tokens: List[Tuple[str, str, str]]) -> List[Dict[str, Any]]:
        """Verify tokens on Solana chain using dextools"""
        print("\nVerifying tokens on Solana chain...")

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
