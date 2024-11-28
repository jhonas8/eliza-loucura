from pydantic import BaseModel, HttpUrl


class WebhookEndpointCreate(BaseModel):
    url: HttpUrl
    description: str


class WebhookEndpointResponse(WebhookEndpointCreate):
    id: str
