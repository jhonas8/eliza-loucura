import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Union
import openai
from utils.get_env_var import get_env_var
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener


class BinanceScraper:
    def __init__(self):
        self.base_url = "https://www.binance.com"
        self.listing_url = f"{self.base_url}/en/support/announcement/new-cryptocurrency-listing"
        self.openai = openai.AsyncOpenAI(api_key=get_env_var('OPENAI_API_KEY'))

    async def get_article_content(self, url: str) -> str:
        """Get article content from URL"""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')

                # Find the main article content
                article = soup.find('article')
                if not article:
                    return ""

                # Get all text content, including nested elements
                content = []
                for element in article.stripped_strings:
                    content.append(element)

                return " ".join(content)

    async def extract_token_info(self, article_content: str) -> tuple[bool, Union[str, None], Union[str, None], Union[str, None]]:
        """Use ChatGPT to extract token information from article"""
        prompt = f"""
        Analyze this Binance announcement and extract the following information:
        1. Is this about a Solana network token? (yes/no)
        2. What is the token symbol?
        3. What is the token name?
        4. What is the Solana token address? (return 'none' if not found)

        Article content:
        {article_content}

        Format your response exactly like this:
        is_solana: yes/no
        symbol: token_symbol
        name: token_name
        address: token_address_or_none
        """

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )

            result = response.choices[0].message.content
            if not result:
                return False, None, None, None

            lines = result.lower().split('\n')
            is_solana = 'yes' in lines[0].split('is_solana:')[1].strip()
            symbol = lines[1].split('symbol:')[1].strip()
            name = lines[2].split('name:')[1].strip()
            address = lines[3].split('address:')[1].strip()

            if address == 'none':
                address = None

            return is_solana, symbol, name, address
        except Exception as e:
            print(f"Error extracting token info: {str(e)}")
            return False, None, None, None

    async def get_latest_listings(self) -> List[Dict[str, Any]]:
        """Get latest listings from Binance"""
        async with aiohttp.ClientSession() as session:
            async with session.get(self.listing_url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')

                announcements = []
                for article in soup.find_all('article'):
                    title = article.find(
                        'h3').text if article.find('h3') else ""
                    link = article.find(
                        'a')['href'] if article.find('a') else ""

                    if not (title and link and ('listing' in title.lower() or 'launches' in title.lower())):
                        continue

                    full_url = f"{self.base_url}{link}" if not link.startswith(
                        'http') else link
                    print(f"Processing article: {title}")

                    # Get full article content
                    article_content = await self.get_article_content(full_url)
                    if not article_content:
                        print(f"Could not get content for {full_url}")
                        continue

                    # Extract token information
                    is_solana, symbol, name, address = await self.extract_token_info(article_content)

                    if not (is_solana and symbol and name):
                        print(
                            f"Not a Solana token or missing information: {title}")
                        continue

                    # If no address found in article, try dexscreener
                    if not address:
                        print(
                            f"No address found in article, trying dexscreener for {symbol}")
                        address = get_information_from_dexscreener(symbol)

                    if not address:
                        print(f"Could not find address for {symbol}")
                        continue

                    print(f"Found Solana token: {name} ({symbol}) - {address}")
                    announcements.append({
                        "type": "new_coin",
                        "listing_type": "listing",
                        "message": title,
                        "currency": {
                            "symbol": symbol.upper(),
                            "name": name.title(),
                            "address": address
                        },
                        "exchange": {
                            "name": "Binance",
                            "trading_pair_url": full_url
                        },
                        "blockchain": "Solana",
                        "alert_condition_id": 2040394
                    })

                return announcements
