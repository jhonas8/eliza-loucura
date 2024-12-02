import aiohttp
import asyncio
from typing import Dict, Any, List
from clients.firebase.webhook_endpoint import FirebaseWebhookEndpointClient


async def send_notification_to_endpoint(session: aiohttp.ClientSession, url: str, data: Dict[str, Any]) -> None:
    """Send notification to a single webhook endpoint"""
    try:
        async with session.post(url, json=data) as response:
            if response.status >= 400:
                print(
                    f"Failed to send notification to {url}. Status: {response.status}. Error: {response.text}")
                return

            print(f"Successfully sent notification to {url}")
    except Exception as e:
        print(f"Error sending notification to {url}: {str(e)}")


async def send_notification(notification_data: Dict[str, Any]) -> None:
    """Send notification to all registered webhook endpoints"""
    # Get all webhook endpoints
    client = FirebaseWebhookEndpointClient()
    endpoints = await client.get_all_endpoints()

    if not endpoints:
        print("No webhook endpoints registered")
        return

    # Create aiohttp session for reuse
    async with aiohttp.ClientSession() as session:
        # Create tasks for all webhook calls
        tasks = [
            send_notification_to_endpoint(
                session, endpoint['url'], notification_data)
            for endpoint in endpoints
        ]

        # Execute all tasks concurrently
        await asyncio.gather(*tasks)
