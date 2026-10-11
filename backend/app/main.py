from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Booking, Crop, Farmer
from .schemas import (
    BookingCreate,
    BookingStatusUpdate,
    ChatRequest,
    CropCreate,
    FarmerCreate,
    FarmerLogin,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="కిషన్ కనెక్ట్ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       
        "https://agri-book-blr3.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_farmer_id():
    return f"FRM-{datetime.utcnow().strftime('%d%m%y')}-{abs(hash(datetime.utcnow().strftime('%H%M%S%f'))) % 10000:04d}"


def generate_booking_code():
    return f"TOK-{datetime.utcnow().strftime('%d%m%y')}-{abs(hash(datetime.utcnow().strftime('%H%M%S%f'))) % 10000:04d}"


def farmer_payload(farmer: Farmer):
    return {
        "id": farmer.id,
        "full_name": farmer.full_name,
        "phone": farmer.phone,
        "village": farmer.village,
        "district": farmer.district,
        "farmer_id": farmer.farmer_id,
        "is_admin": farmer.is_admin,
        "created_at": farmer.created_at.isoformat(),
    }


def crop_payload(crop: Crop):
    return {
        "id": crop.id,
        "farmer_id": crop.farmer_id,
        "crop_name": crop.crop_name,
        "variety": crop.variety,
        "quantity_kg": crop.quantity_kg,
        "expected_price": crop.expected_price,
        "status": crop.status,
        "created_at": crop.created_at.isoformat(),
    }


def booking_payload(booking: Booking, farmer_name: str | None = None, crop_name: str | None = None):
    return {
        "id": booking.id,
        "farmer_id": booking.farmer_id,
        "crop_id": booking.crop_id,
        "farmer_name": farmer_name,
        "crop_name": crop_name,
        "booking_code": booking.booking_code,
        "queue_number": booking.queue_number,
        "estimated_wait_minutes": booking.estimated_wait_minutes,
        "token_status": booking.token_status,
        "payment_status": booking.payment_status,
        "procurement_status": booking.procurement_status,
        "created_at": booking.created_at.isoformat(),
    }


def seed_demo_data(db: Session):
    if db.query(Farmer).count() > 0:
        return

    admin = Farmer(
        full_name="కిషన్ కనెక్ట్ అడ్మిన్",
        phone="admin@kisanconnect.in",
        village="హెడ్‌క్వార్టర్స్",
        district="హైదరాబాదు",
        password="admin123",
        farmer_id="ADM-001",
        is_admin=True,
    )
    db.add(admin)
    db.flush()

    demo_farmers = [
        ("రమేష్ యాదవ్", "9876543210", "కోథపల్లి", "వరంగల్", "password123"),
        ("శ్రావణి రెడ్డి", "9123456780", "గొల్లపల్లి", "ఖమ్మం", "password123"),
        ("అంజనేయరావు", "9988776655", "వడ్డెం", "నిజామాబాద్", "password123"),
        ("లక్ష్మీ బాయి", "9000123456", "వెల్గతుర్", "మహబూబ్‌నగర్", "password123"),
    ]

    farmers = []
    for full_name, phone, village, district, password in demo_farmers:
        farmer = Farmer(
            full_name=full_name,
            phone=phone,
            village=village,
            district=district,
            password=password,
            farmer_id=generate_farmer_id(),
            is_admin=False,
        )
        farmers.append(farmer)
        db.add(farmer)
    db.flush()

    crop_entries = [
        (farmers[0].id, "వరి", "పొన్ని", 1200, 2200),
        (farmers[1].id, "పత్తి", "బి.టి. పత్తి", 800, 7800),
        (farmers[2].id, "మసాలా", "రాజపురి", 350, 11200),
        (farmers[3].id, "వేరుశనగ", "స్పానిష్", 600, 5900),
    ]

    crops = []
    for farmer_id, crop_name, variety, quantity_kg, expected_price in crop_entries:
        crop = Crop(
            farmer_id=farmer_id,
            crop_name=crop_name,
            variety=variety,
            quantity_kg=quantity_kg,
            expected_price=expected_price,
            status="Registered",
        )
        crops.append(crop)
        db.add(crop)
    db.flush()

    bookings = [
        (farmers[0].id, crops[0].id, "Queued", "Pending", "Awaiting arrival", 1, 18),
        (farmers[1].id, crops[1].id, "Checked In", "Paid", "Weighing", 2, 30),
        (farmers[2].id, crops[2].id, "Processing", "Paid", "Quality check", 3, 52),
        (farmers[3].id, crops[3].id, "Queued", "Pending", "Awaiting arrival", 4, 70),
    ]

    for farmer_id, crop_id, token_status, payment_status, procurement_status, queue_number, estimate in bookings:
        booking = Booking(
            farmer_id=farmer_id,
            crop_id=crop_id,
            booking_code=generate_booking_code(),
            queue_number=queue_number,
            estimated_wait_minutes=estimate,
            token_status=token_status,
            payment_status=payment_status,
            procurement_status=procurement_status,
        )
        db.add(booking)

    db.commit()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "KisanConnect"}


@app.post("/api/farmers/register")
def register_farmer(payload: FarmerCreate, db: Session = Depends(get_db)):
    existing = db.query(Farmer).filter(Farmer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="ఈ ఫోన్ నంబర్‌తో రైతు ఇప్పటికే ఉన్నారు.")

    farmer = Farmer(
        full_name=payload.full_name,
        phone=payload.phone,
        village=payload.village,
        district=payload.district,
        password=payload.password,
        farmer_id=generate_farmer_id(),
        is_admin=False,
    )
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    return {"message": "రైతు నమోదు విజయవంతమైంది", "farmer": farmer_payload(farmer)}


@app.post("/api/farmers/login")
def login_farmer(payload: FarmerLogin, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.phone == payload.phone).first()
    if not farmer or farmer.password != payload.password:
        raise HTTPException(status_code=401, detail="ఫోన్ నంబర్ లేదా పాస్వర్డ్ సరికాని.")
    return {"message": "లాగిన్ విజయవంతమైంది", "farmer": farmer_payload(farmer)}


@app.get("/api/farmers")
def list_farmers(db: Session = Depends(get_db)):
    farmers = db.query(Farmer).order_by(Farmer.id.asc()).all()
    return {"farmers": [farmer_payload(farmer) for farmer in farmers]}


@app.post("/api/crops")
def create_crop(payload: CropCreate, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.id == payload.farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="రైతు కనపడలేదు.")

    crop = Crop(
        farmer_id=payload.farmer_id,
        crop_name=payload.crop_name,
        variety=payload.variety,
        quantity_kg=payload.quantity_kg,
        expected_price=payload.expected_price,
        status="Registered",
    )
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return {"message": "పంట నమోదు విజయవంతమైంది", "crop": crop_payload(crop)}


@app.get("/api/crops")
def list_crops(db: Session = Depends(get_db)):
    crops = db.query(Crop).order_by(Crop.id.desc()).all()
    return {"crops": [crop_payload(crop) for crop in crops]}


@app.post("/api/bookings")
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.id == payload.farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="రైతు కనపడలేదు.")

    crop = db.query(Crop).filter(Crop.id == payload.crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="పంట కనపడలేదు.")

    queue_number = (db.query(func.max(Booking.queue_number)).scalar() or 0) + 1
    estimated_wait_minutes = max(15, queue_number * 18)

    booking = Booking(
        farmer_id=payload.farmer_id,
        crop_id=payload.crop_id,
        booking_code=generate_booking_code(),
        queue_number=queue_number,
        estimated_wait_minutes=estimated_wait_minutes,
        token_status="Queued",
        payment_status="Pending",
        procurement_status="Awaiting arrival",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "message": "బుకింగ్ విజయవంతమైంది",
        "booking": booking_payload(booking, farmer_name=farmer.full_name, crop_name=crop.crop_name),
    }


@app.get("/api/bookings")
def list_bookings(db: Session = Depends(get_db)):
    bookings = db.query(Booking).order_by(Booking.queue_number.asc()).all()
    output = []
    for booking in bookings:
        farmer = db.query(Farmer).filter(Farmer.id == booking.farmer_id).first()
        crop = db.query(Crop).filter(Crop.id == booking.crop_id).first()
        output.append(booking_payload(booking, farmer_name=farmer.full_name if farmer else None, crop_name=crop.crop_name if crop else None))
    return {"bookings": output}


@app.get("/api/queue/summary")
def queue_summary(db: Session = Depends(get_db)):
    bookings = db.query(Booking).order_by(Booking.queue_number.asc()).all()
    active = []
    for booking in bookings:
        farmer = db.query(Farmer).filter(Farmer.id == booking.farmer_id).first()
        active.append({
            "id": booking.id,
            "booking_code": booking.booking_code,
            "farmer_name": farmer.full_name if farmer else "తెలియదు",
            "queue_number": booking.queue_number,
            "estimated_wait_minutes": booking.estimated_wait_minutes,
            "token_status": booking.token_status,
        })

    next_booking = active[0] if active else None
    avg_wait = round(sum(item["estimated_wait_minutes"] for item in active) / len(active)) if active else 0

    return {
        "total_waiting": len(active),
        "avg_wait_minutes": avg_wait,
        "next_booking": next_booking,
        "next_wait_minutes": next_booking["estimated_wait_minutes"] if next_booking else 0,
        "active_bookings": active,
    }


@app.get("/api/admin/dashboard")
def admin_dashboard(db: Session = Depends(get_db)):
    farmers = db.query(Farmer).filter(Farmer.is_admin == False).order_by(Farmer.id.asc()).all()
    crops = db.query(Crop).order_by(Crop.id.asc()).all()
    bookings = db.query(Booking).order_by(Booking.queue_number.asc()).all()

    bookings_output = []
    for booking in bookings:
        farmer = db.query(Farmer).filter(Farmer.id == booking.farmer_id).first()
        crop = db.query(Crop).filter(Crop.id == booking.crop_id).first()
        bookings_output.append({
            "id": booking.id,
            "farmer_id": booking.farmer_id,
            "crop_id": booking.crop_id,
            "farmer_name": farmer.full_name if farmer else "తెలియదు",
            "crop_name": crop.crop_name if crop else "తెలియదు",
            "booking_code": booking.booking_code,
            "queue_number": booking.queue_number,
            "estimated_wait_minutes": booking.estimated_wait_minutes,
            "token_status": booking.token_status,
            "payment_status": booking.payment_status,
            "procurement_status": booking.procurement_status,
            "created_at": booking.created_at.isoformat(),
        })

    revenue = sum(crop.quantity_kg * crop.expected_price // 100 for crop in crops)

    return {
        "stats": {
            "farmers": len(farmers),
            "bookings": len(bookings),
            "revenue": revenue,
            "queue": sum(1 for booking in bookings if booking.token_status != "Completed"),
        },
        "farmers": [farmer_payload(farmer) for farmer in farmers],
        "bookings": bookings_output,
        "crops": [crop_payload(crop) for crop in crops],
    }


@app.patch("/api/admin/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, payload: BookingStatusUpdate, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="బుకింగ్ కనపడలేదు.")

    if payload.token_status:
        booking.token_status = payload.token_status
    if payload.payment_status:
        booking.payment_status = payload.payment_status
    if payload.procurement_status:
        booking.procurement_status = payload.procurement_status

    db.commit()
    db.refresh(booking)
    return {"message": "బుకింగ్ స్థితి నవీకరించబడింది", "booking": booking_payload(booking)}


@app.post("/api/chat")
def chatbot(payload: ChatRequest, db: Session = Depends(get_db)):
    message = payload.message.strip()
    normalized = message.lower()
    queue = queue_summary(db)

    crop_aliases = {
        "rice": ["rice", "రైస్", "వరి"],
        "cotton": ["cotton", "కాటన్", "పత్తి"],
        "turmeric": ["turmeric", "మసాలా", "కుంకుమ", "అల్లం"],
        "groundnut": ["groundnut", "వేరుశనగ", "ground nut", "వేరు శనగ"],
    }

    if any(word in normalized for word in ["hello", "hi", "namaskaram", "నమస్కారం", "హాయ్", "hey"]):
        return {"reply": "నమస్కారం! నేను కిషన్ కనెక్ట్ సహాయ సిబ్బంది. క్యూ స్థితి, చెల్లింపు, టోకెన్ మరియు పంట ధరల గురించి మీకు సహాయం చేయగలను."}

    if any(word in normalized for word in ["price", "ధర", "rate", "రేటు", "cost"]):
        for crop_key, aliases in crop_aliases.items():
            if any(alias.lower() in normalized for alias in aliases):
                target = db.query(Crop).filter(Crop.crop_name.ilike(f"%{crop_key}%")).order_by(Crop.id.desc()).first()
                if crop_key == "turmeric":
                    target = db.query(Crop).filter(Crop.crop_name.ilike("%మసాలా%") | Crop.crop_name.ilike("%turmeric%")).order_by(Crop.id.desc()).first()
                if target:
                    return {"reply": f"{target.crop_name} కోసం ప్రస్తుత అంచనా ధర: ₹{target.expected_price}."}
        return {"reply": "పంట పేరు చెప్పగలిగితే నేను అంచనా ధరను చెప్పగలను. ఉదాహరణ: ‘వరి ధర ఎంత?’ లేదా ‘What is the price of rice?’"}

    if any(word in normalized for word in ["waiting", "queue", "క్యూ", "వేచి", "wait time", "how long", "how many in queue"]):
        if queue["next_booking"]:
            return {"reply": f"క్యూ స్థితి: {queue['total_waiting']} రైతులు వేచి ఉన్నారు. మీ తదుపరి అంచనా వేచిడి సుమారు {queue['next_wait_minutes']} నిమిషాలు."}
        return {"reply": "ప్రస్తుతం క్యూ ఖాళీగా ఉంది. పెద్ద వేచిడి లేదు."}

    if any(word in normalized for word in ["payment", "చెల్లింపు", "పేమెంట్", "paid", "pending"]):
        return {"reply": "చెల్లింపు స్థితిని కొనుగోలు దళం ధ్రువీకరణ తర్వాత అప్‌డేట్ చేస్తుంది. అడ్మిన్ డాష్‌బోర్డ్‌లో మీరు స్థితిని చూడవచ్చు."}

    if any(word in normalized for word in ["token", "booking", "టోకెన్", "బుకింగ్", "book"]):
        if queue["next_booking"]:
            return {"reply": f"తదుపరి బుకింగ్ టోకెన్ # {queue['next_booking']['queue_number']} మరియు అది సుమారుగా {queue['next_wait_minutes']} నిమిషాల్లో ప్రాసెస్ అవుతుంది."}
        return {"reply": "ప్రస్తుతం సక్రియ టోకెన్ లేదు. కొత్త బుకింగ్ కోసం పంటను నమోదు చేయండి."}

    if any(word in normalized for word in ["register", "crop", "పంట", "lot", "లాట్", "add crop"]):
        return {"reply": "పంటను నమోదు చేయడానికి రైతు పోర్టల్‌లో పంట పేరు, రకం, పరిమాణం మరియు అంచనా ధరను నమోదు చేయాలి. తర్వాత టోకెన్ బుక్ చేయవచ్చు."}

    if any(word in normalized for word in ["telugu", "english", "తెలుగు", "ఇంగ్లీష్", "language"]):
        return {"reply": "నేను తెలుగు మరియు English రెండింటిలో సహాయం చేయగలను. మీరు క్యూ, చెల్లింపు, టోకెన్ లేదా పంట ధరల గురించి అడగవచ్చు."}

    if any(word in normalized for word in ["help", "what can you do", "can you help", "సహాయం", "ఏం చేయగలరు"]):
        return {"reply": "నేను క్యూ స్థితి, పంట ధర, చెల్లింపు, టోకెన్ మరియు పంట నమోదు గురించి సహాయం చేయగలను. ఉదాహరణలు: ‘వరి ధర ఎంత?’, ‘నా టోకెన్ స్థితి ఏమిటి?’, ‘క్యూ ఎలా ఉంది?’"}

    if any(word in normalized for word in ["farmer", "రైతు", "district", "జిల్లా", "village", "గ్రామం"]):
        return {"reply": "రైతు వివరాలు మీ లాగిన్ చేసిన ఖాతాలో అందుబాటులో ఉన్నాయి. మీరు పేరు, ఫోన్ నంబర్, గ్రామం మరియు జిల్లా వివరాలను చెక్ చేయవచ్చు."}

    return {
        "reply": "నేను క్యూ స్థితి, పంట ధర, చెల్లింపు, టోకెన్ మరియు పంట నమోదు గురించి సహాయం చేయగలను. మీరు ‘వరి ధర ఎంత?’ లేదా ‘నా టోకెన్ స్థితి ఏమిటి?’ అని అడగండి."
    }
