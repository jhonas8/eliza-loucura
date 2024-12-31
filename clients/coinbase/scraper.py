import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Union
import openai
from utils.get_env_var import get_env_var
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener


class CoinbaseScraper:
    def __init__(self):
        self.base_url = "https://www.coinbase.com"
        self.listing_url = f"{self.base_url}/en-br/blog/increasing-transparency-for-new-asset-listings-on-coinbase"
        self.openai = openai.AsyncOpenAI(api_key=get_env_var('OPENAI_API_KEY'))

    async def get_article_content(self, url: str) -> str:
        """Get article content from URL"""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')

                # Find the main article content
                article = soup.find('article') or soup.find(
                    'div', class_='blog-post')
                if not article:
                    return ""

                # Get all text content, including nested elements
                content = []
                for element in article.stripped_strings:
                    content.append(element)

                return " ".join(content)

    async def extract_token_info(self, article_content: str) -> List[tuple[str, str, str]]:
        """Use ChatGPT to extract token information from article"""
        prompt = f"""
        Analyze this Coinbase listing announcement and extract all tokens mentioned with their details.
        For each token mentioned, provide:
        1. Token symbol
        2. Token name
        3. Token address (if mentioned)

        Only include tokens that have Solana addresses (starting with a base58 string).

        Article content:
        {article_content}

        Format your response like this for each token:
        symbol: token_symbol
        name: token_name
        address: solana_address

        Separate multiple tokens with '---'
        If no Solana tokens are found, respond with 'no_solana_tokens'
        """

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )

            result = response.choices[0].message.content
            if not result or 'no_solana_tokens' in result.lower():
                return []

            tokens = []
            for token_info in result.split('---'):
                if not token_info.strip():
                    continue

                lines = token_info.strip().split('\n')
                if len(lines) < 3:
                    continue

                symbol = lines[0].split('symbol:')[1].strip()
                name = lines[1].split('name:')[1].strip()
                address = lines[2].split('address:')[1].strip()

                # Verify address with dexscreener if needed
                if not address or address.lower() == 'none':
                    address = get_information_from_dexscreener(symbol)

                if address:
                    tokens.append((symbol, name, address))

            return tokens
        except Exception as e:
            print(f"Error extracting token info: {str(e)}")
            return []

    async def get_latest_listings(self) -> List[Dict[str, Any]]:
        """Get latest listings from Coinbase"""
        async with aiohttp.ClientSession() as session:
            async with session.get(self.listing_url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')

                announcements = []
                # Get all blog post links
                blog_links = soup.find_all(
                    'a', href=lambda x: x and '/blog/' in x)

                for link in blog_links:
                    title = link.text.strip()
                    if not ('listing' in title.lower() or 'support' in title.lower()):
                        continue

                    full_url = f"{self.base_url}{link['href']}" if not link['href'].startswith(
                        'http') else link['href']
                    print(f"Processing article: {title}")

                    # Get full article content
                    article_content = await self.get_article_content(full_url)
                    if not article_content:
                        print(f"Could not get content for {full_url}")
                        continue

                    # Extract token information
                    tokens = await self.extract_token_info(article_content)

                    for symbol, name, address in tokens:
                        print(
                            f"Found Solana token: {name} ({symbol}) - {address}")
                        announcements.append({
                            "type": "new_coin",
                            "listing_type": "listing",
                            "message": f"{name} ({symbol}) has been listed on Coinbase!",
                            "currency": {
                                "symbol": symbol.upper(),
                                "name": name.title(),
                                "address": address
                            },
                            "exchange": {
                                "name": "Coinbase",
                                "trading_pair_url": full_url
                            },
                            "blockchain": "Solana",
                            "alert_condition_id": 2040394
                        })

                return announcements
