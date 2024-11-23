from pydantic import BaseModel, HttpUrl


class ExchangeBase(BaseModel):
    name: str
    url: HttpUrl


class ExchangeResponse(ExchangeBase):
    id: str
