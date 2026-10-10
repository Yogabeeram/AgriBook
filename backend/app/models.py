from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from .database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False, index=True)
    village = Column(String, nullable=False)
    district = Column(String, nullable=False)
    password = Column(String, nullable=False)
    farmer_id = Column(String, unique=True, nullable=False, index=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    variety = Column(String, nullable=False)
    quantity_kg = Column(Integer, nullable=False)
    expected_price = Column(Integer, nullable=False)
    status = Column(String, default="Registered")
    created_at = Column(DateTime, default=datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    booking_code = Column(String, unique=True, nullable=False, index=True)
    queue_number = Column(Integer, nullable=False)
    estimated_wait_minutes = Column(Integer, nullable=False)
    token_status = Column(String, default="Queued")
    payment_status = Column(String, default="Pending")
    procurement_status = Column(String, default="Awaiting arrival")
    created_at = Column(DateTime, default=datetime.utcnow)
