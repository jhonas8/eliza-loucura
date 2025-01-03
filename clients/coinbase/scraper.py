import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Union
import openai
import re
from utils.get_env_var import get_env_var
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener
from clients.base_scraper import BaseScraper


class CoinbaseScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.coinbase.com"
        self.listing_url = f"{self.base_url}/en-br/blog/increasing-transparency-for-new-asset-listings-on-coinbase"
        self.openai = openai.AsyncOpenAI(api_key=get_env_var('OPENAI_API_KEY'))

    async def get_article_content(self, url: str) -> str:
        """Get article content from URL using Selenium"""
        # Since Selenium's get_rendered_content is synchronous, we need to handle it properly
        content = self.get_rendered_content(
            url,
            selector='div.blog-post'
        )
        return content

    async def extract_solana_tokens_from_text(self, content: str) -> List[tuple[str, str, str]]:
        """Extract Solana tokens using GPT-4"""
        print("\nExtracting tokens using GPT-4...")

        # First try to find the Solana section to reduce content size
        try:
            # Find the section with Solana tokens
            solana_section_match = re.search(
                r"Assets on the Solana network.*?(?=Assets on|$)",
                content,
                re.DOTALL | re.IGNORECASE
            )

            if solana_section_match:
                content_for_gpt = solana_section_match.group(0)
                print(f"\nFound Solana section: {content_for_gpt}")
            else:
                # If no specific section found, look for any mention of Solana and surrounding text
                solana_mentions = re.finditer(
                    r"solana", content, re.IGNORECASE)
                extracted_sections = []

                for match in solana_mentions:
                    start = max(0, match.start() - 500)  # Get 500 chars before
                    # Get 500 chars after
                    end = min(len(content), match.end() + 500)
                    extracted_sections.append(content[start:end])

                content_for_gpt = "\n".join(
                    extracted_sections) if extracted_sections else content[:8000]
                print(
                    f"\nUsing extracted content around Solana mentions: {content_for_gpt[:200]}...")

            prompt = f"""
            You are a precise token information extractor. Your task is to find Solana token listings from Coinbase announcements.
            
            Extract the following information for each Solana token:
            1. Exact token name as shown
            2. Exact token symbol in parentheses
            3. Exact contract/wallet address (must be a Solana address)

            Current content:
            {content_for_gpt}

            Respond ONLY in this exact format, one token per line:
            name|symbol|address

            Rules:
            - Only include tokens that have both symbol AND address
            - Addresses must be exact matches from the text
            - Do not modify or clean addresses
            - If no valid tokens found, respond with "none"
            - Do not include any explanations or additional text
            """

            try:
                response = await self.openai.chat.completions.create(
                    model="gpt-4o",  # Using GPT-4 for better precision
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1  # Lower temperature for more precise extraction
                )

                result = response.choices[0].message.content.strip(
                ) if response.choices[0].message.content else None
                print(f"GPT-4 Response: {result}")

                if not result or result.lower() == "none":
                    return []

                tokens = []
                for line in result.split('\n'):
                    if '|' in line:
                        name, symbol, address = line.strip().split('|')
                        name = name.strip()
                        symbol = symbol.strip()
                        address = address.strip()
                        if all([name, symbol, address]):
                            print(
                                f"Found token: {name} ({symbol}) - {address}")
                            tokens.append((symbol, name, address))

                return tokens

            except Exception as e:
                print(f"Error with GPT-4 processing: {str(e)}")
                # Fallback to regex extraction if GPT fails
                return self._extract_tokens_with_regex(content_for_gpt)

        except Exception as e:
            print(f"Error in content extraction: {str(e)}")
            return []

    def _extract_tokens_with_regex(self, content: str) -> List[tuple[str, str, str]]:
        """Fallback method using regex to extract tokens"""
        print("\nFalling back to regex extraction...")
        tokens = []

        # Pattern to match token information
        pattern = r"([^()]+)\(([^)]+)\).*?(?:address|contract):\s*([a-zA-Z0-9]+)"
        matches = re.finditer(pattern, content, re.IGNORECASE)

        for match in matches:
            name = match.group(1).strip()
            symbol = match.group(2).strip()
            address = match.group(3).strip()
            if all([name, symbol, address]):
                print(f"Found token with regex: {name} ({symbol}) - {address}")
                tokens.append((symbol, name, address))

        return tokens

    async def verify_token_address(self, symbol: str, address: str) -> str:
        """Verify token address using dexscreener"""
        print(f"\nVerifying token address for {symbol}...")

        # First try with the provided address
        if address:
            dex_address = get_information_from_dexscreener(address)
            if dex_address:
                print(f"Address verified by dexscreener: {dex_address}")
                return dex_address
            print("Address not found in dexscreener using provided address")

        # Try with symbol if address verification failed
        dex_address = get_information_from_dexscreener(symbol)
        if dex_address:
            print(f"Address found by dexscreener using symbol: {dex_address}")
            return dex_address

        print(f"No address found in dexscreener for {symbol}")
        return address  # Return original address if no verification possible

    async def get_latest_listings(self) -> List[Dict[str, Any]]:
        """Get latest listings from Coinbase"""
        print("\nStarting Coinbase listings scan...")

        try:
            article_content = await self.get_article_content(self.listing_url)

            if not article_content:
                print("No article content found")
                return []

            # Extract tokens using GPT
            tokens = await self.extract_solana_tokens_from_text(article_content)
            print(f"\nFound {len(tokens)} potential Solana tokens")

            announcements = []
            for symbol, name, address in tokens:
                try:
                    print(f"\nProcessing token: {name} ({symbol})")
                    # First try with the provided address
                    verified_address = get_information_from_dexscreener(
                        address)

                    if not verified_address:
                        print(
                            f"Address not found on dexscreener, trying with symbol {symbol}")
                        verified_address = get_information_from_dexscreener(
                            symbol)

                    if not verified_address:
                        print(
                            f"Using original address for {symbol}: {address}")
                        verified_address = address

                    print(f"Final address for {symbol}: {verified_address}")

                    # Create announcement with verified information
                    announcement = {
                        "type": "new_coin",
                        "listing_type": "listing",
                        "message": f"{name} ({symbol}) has been listed on Coinbase!",
                        "currency": {
                            "symbol": symbol.upper(),
                            "name": name.strip(),
                            "address": verified_address
                        },
                        "exchange": {
                            "name": "Coinbase",
                            "trading_pair_url": self.listing_url
                        },
                        "blockchain": "Solana",
                        "alert_condition_id": 2040394
                    }

                    announcements.append(announcement)
                    print(f"Announcement created for {symbol}")
                except Exception as e:
                    print(f"Error processing token {symbol}: {str(e)}")
                    continue

            print(f"\nTotal announcements created: {len(announcements)}")
            return announcements

        except Exception as e:
            print(f"Error in get_latest_listings: {str(e)}")
            return []
