from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.firefox import GeckoDriverManager
from typing import Optional
import time


class BaseScraper:
    def __init__(self):
        self.options = Options()
        self.options.add_argument('--headless')
        self.options.add_argument('--width=1920')
        self.options.add_argument('--height=1080')

        # Add headers
        self.options.set_preference(
            'general.useragent.override',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
        )

    def _get_firefox_driver(self):
        """Get Firefox driver"""
        try:
            service = Service(GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=self.options)
            return driver
        except Exception as e:
            print(f"Error creating Firefox driver: {str(e)}")
            raise

    def get_rendered_content(self, url: str, selector: Optional[str] = None, wait_time: int = 10) -> str:
        """Get content from page using Selenium"""
        print(f"\nFetching content from: {url}")

        driver = None
        try:
            driver = self._get_firefox_driver()

            driver.get(url)
            print("Page loaded, waiting for content...")

            # Wait for initial page load
            time.sleep(3)

            if selector:
                try:
                    print(f"Looking for selector: {selector}")
                    element = WebDriverWait(driver, wait_time).until(
                        EC.presence_of_element_located(
                            (By.CSS_SELECTOR, selector))
                    )
                    content = element.text
                    print(
                        f"Found element with selector, content length: {len(content)}")
                except Exception as e:
                    print(
                        f"Error finding selector: {str(e)}, getting full page content")
                    content = driver.page_source
                    print(f"Got full page content, length: {len(content)}")
            else:
                content = driver.page_source
                print(f"Got full page content, length: {len(content)}")

            if content:
                print(f"First 500 chars of content: {content[:500]}")

            return content

        except Exception as e:
            print(f"Error getting content: {str(e)}")
            return ""

        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
