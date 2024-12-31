from playwright.async_api import async_playwright
import json


async def find_possible_selectors(url: str):
    """Helper function to find possible selectors on a page"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            await page.goto(url, wait_until='networkidle')

            # Get all elements with their text content
            elements = await page.evaluate("""
                () => {
                    const results = [];
                    function processElement(element, depth = 0) {
                        const text = element.innerText;
                        if (text && text.trim()) {
                            results.push({
                                tag: element.tagName.toLowerCase(),
                                classes: Array.from(element.classList),
                                id: element.id,
                                text: text.substring(0, 100),
                                depth: depth
                            });
                        }
                        for (const child of element.children) {
                            processElement(child, depth + 1);
                        }
                    }
                    processElement(document.body);
                    return results;
                }
            """)

            print("\nPossible content containers:")
            for elem in elements:
                selector = elem['tag']
                if elem['classes']:
                    selector += '.' + '.'.join(elem['classes'])
                if elem['id']:
                    selector += f'#{elem["id"]}'
                print(f"\nDepth {elem['depth']}:")
                print(f"Selector: {selector}")
                print(f"Sample text: {elem['text'][:100]}...")

        finally:
            await browser.close()
