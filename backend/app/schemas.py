from datetime import datetime

from pydantic import BaseModel, Field


class FarmerCreate(BaseModel):
    full_name: str
    phone: str
    village: str
    district: str
    password: str


class FarmerLogin(BaseModel):
    phone: str
    password: str


class FarmerOut(BaseModel):
    id: int
    full_name: str
    phone: str
    village: str
    district: str
    farmer_id: str
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class CropCreate(BaseModel):
    farmer_id: int
    crop_name: str
    variety: str
    quantity_kg: int = Field(..., gt=0)
    expected_price: int = Field(..., gt=0)


class CropOut(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    variety: str
    quantity_kg: int
    expected_price: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    farmer_id: int
    crop_id: int


class BookingStatusUpdate(BaseModel):
    token_status: str | None = None
    payment_status: str | None = None
    procurement_status: str | None = None


class ChatRequest(BaseModel):
    message: str
