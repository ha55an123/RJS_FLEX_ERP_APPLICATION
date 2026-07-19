from pydantic import BaseModel
from typing import List


class OrderItemCreate(BaseModel):
    sku: str
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
