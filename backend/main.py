import os
import re
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Body
from fastapi.responses import FileResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from datetime import datetime, timedelta
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from fastapi_utils.tasks import repeat_every
from fastapi import Path
from fastapi import Query
from PIL import Image
from dotenv import load_dotenv

# --- Database setup ---
DATABASE_URL = "sqlite:///./uo_me.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

USERNAME_REGEX = re.compile(r"^[A-Za-z0-9_-]{1,16}$")

# --- Models ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    email = Column(String, unique=True, index=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    profile_picture = Column(String, nullable=True)  # Add this line

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    payer_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    total_amount = Column(Float)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    expired = Column(Integer, default=0)  # 0 = active, 1 = expired
    due_date = Column(String, nullable=True)  # Optional due date

class Share(Base):
    __tablename__ = "shares"
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"))
    owed_by_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    fulfilled = Column(Integer, default=0)  # 0 = not fulfilled, 1 = fulfilled
    accepted = Column(Integer, default=0)  # 0 = pending, 1 = accepted
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Friendship(Base):
    __tablename__ = "friendships"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    friend_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    status = Column(String)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

Base.metadata.create_all(bind=engine)

# --- Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr

class UserLogin(BaseModel):
    username: str
    password: str

class UserProfileUpdate(BaseModel):
    username: Optional[str]
    email: Optional[EmailStr]

class PaymentShare(BaseModel):
    user_id: int
    amount: float

class PaymentCreate(BaseModel):
    title: str
    description: str
    total_amount: float
    shares: List[PaymentShare]
    due_date: Optional[str]

class PaymentOut(BaseModel):
    id: int
    description: str
    total_amount: float
    created_at: str
    shares: List[PaymentShare]
    all_fulfilled: bool
    expired: bool
class ShareAccept(BaseModel):
    share_id: int
class ShareFulfill(BaseModel):
    share_id: int

class FriendRequest(BaseModel):
    friend_id: int

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Auth/JWT setup ---
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")  # Fallback for dev
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def validate_username(username: str):
    if not USERNAME_REGEX.fullmatch(username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 1-16 characters and contain only letters, numbers, dashes, or underscores."
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def user_exists(user_id: int, db: Session) -> bool:
    return db.query(User).filter(User.id == user_id).first() is not None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- FastAPI app ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://uo-me.giuli.cat"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.options("/{rest_of_path:path}", include_in_schema=False)
async def preflight_handler(rest_of_path: str):
    return Response()

# --- Static files for profile pictures ---
PROFILE_PICS_DIR = "static/profile_pics"
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

@app.get("/static/profile_pics/{filename}")
def serve_profile_pic(filename: str):
    file_path = os.path.join(PROFILE_PICS_DIR, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # Serve placeholder if not found
    placeholder_path = os.path.join("static", "placeholderpic.png")
    return FileResponse(placeholder_path)

# --- Profile Picture Upload ---
@app.post("/api/users/profile-picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"user_{current_user.id}{ext}"
    file_path = os.path.join(PROFILE_PICS_DIR, filename)

    # Save uploaded file temporarily
    temp_path = file_path + ".tmp"
    with open(temp_path, "wb") as buffer:
        buffer.write(file.file.read())

    # Open and resize image
    with Image.open(temp_path) as img:
        img = img.convert("RGB")
        img = img.resize((200, 200))
        img.save(file_path, format="JPEG", quality=90)

    os.remove(temp_path)

    # Save the relative path or URL in the user record
    current_user.profile_picture = f"{PROFILE_PICS_DIR}/{filename}"
    db.commit()
    return {"url": current_user.profile_picture}

@app.get("/api/users/profile-picture")
def get_profile_picture(current_user: User = Depends(get_current_user)):
    if not current_user.profile_picture:
        raise HTTPException(status_code=404, detail="No profile picture set")
    return {"url": current_user.profile_picture}

# --- Auth Endpoints ---
@app.post("/api/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    validate_username(user.username)
    if db.query(User).filter((User.username == user.username) | (User.email == user.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already exists")
    db_user = User(
        username=user.username,
        password=get_password_hash(user.password),
        email=user.email
    )
    db.add(db_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login", response_model=Token)
def login(response: Response, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(
        data={"sub": db_user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=True,
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "User logged out successfully"}

# --- User Management ---
@app.get("/api/users/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "profile_picture": current_user.profile_picture
    }

@app.get("/api/users/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "username": user.username}

@app.put("/api/users/profile")
def update_profile(update: UserProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if update.username:
        validate_username(update.username)
        current_user.username = update.username
    if update.email:
        current_user.email = update.email
    db.commit()
    return {"message": "User profile updated successfully"}

@app.delete("/api/users/profile")
def delete_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "User account deleted successfully"}

# --- Payments ---
@app.post("/api/payments/create")
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate shares sum
    total_share = sum(share.amount for share in payment.shares)
    if abs(total_share - payment.total_amount) > 1e-6:
        raise HTTPException(status_code=400, detail="Shares must sum up to total_amount")

    # Get payer's friends (accepted friendships)
    friends = db.query(Friendship.friend_id).filter(
        Friendship.user_id == current_user.id,
        Friendship.status == "accepted"
    ).all()
    friend_ids = {fid for (fid,) in friends}
    allowed_user_ids = friend_ids | {current_user.id}

    # Validate all share user_ids
    for share in payment.shares:
        if share.user_id not in allowed_user_ids:
            raise HTTPException(
                status_code=400,
                detail=f"User {share.user_id} is not the payer or a friend of the payer"
            )

    # Validate due_date format if provided (ISO 8601)
    due_date_str = None
    if payment.due_date:
        try:
            # Accept both date and datetime strings
            parsed_due_date = datetime.fromisoformat(payment.due_date)
            due_date_str = parsed_due_date.isoformat()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid due_date format. Use ISO 8601 format.")

    # Create payment
    db_payment = Payment(
        payer_id=current_user.id,
        title=payment.title,
        description=payment.description,
        total_amount=payment.total_amount,
        created_at=datetime.utcnow().isoformat(),
        due_date=due_date_str
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    # Create shares
    for share in payment.shares:
        is_payer = share.user_id == current_user.id
        db_share = Share(
            payment_id=db_payment.id,
            owed_by_id=share.user_id,
            amount=share.amount,
            fulfilled=1 if is_payer else 0,
            accepted=1 if is_payer else 0,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(db_share)
    db.commit()

    return {"message": "Payment and shares created successfully", "payment_id": db_payment.id}

@app.delete("/api/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.payer_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Delete all shares associated with this payment
    db.query(Share).filter(Share.payment_id == payment_id).delete()
    db.delete(payment)
    db.commit()
    return {"message": "Payment and associated shares deleted successfully"}

@app.get("/api/payments", response_model=List[PaymentOut])
def get_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payments = db.query(Payment).filter(Payment.payer_id == current_user.id).all()
    result = []
    for p in payments:
        shares = db.query(Share).filter(Share.payment_id == p.id).all()
        share_objs = [PaymentShare(user_id=s.owed_by_id, amount=s.amount) for s in shares]
        all_fulfilled = all(s.fulfilled for s in shares) if shares else False
        result.append(PaymentOut(
            id=p.id,
            description=p.description,
            total_amount=p.total_amount,
            created_at=p.created_at,
            shares=share_objs,
            all_fulfilled=all_fulfilled,
            expired=bool(p.expired)
        ))
    return result

@app.get("/api/payments/{payment_id}")
def get_payment_by_id(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Only allow access if the user is the payer or is involved in the shares
    user_involved = (
        payment.payer_id == current_user.id or
        db.query(Share).filter(Share.payment_id == payment.id, Share.owed_by_id == current_user.id).first() is not None
    )
    if not user_involved:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    shares = db.query(Share).filter(Share.payment_id == payment.id).all()
    share_objs = [PaymentShare(user_id=s.owed_by_id, amount=s.amount) for s in shares]
    all_fulfilled = all(s.fulfilled for s in shares) if shares else False
    return {
        "id": payment.id,
        "title": payment.title,
        "payer_id": payment.payer_id,
        "description": payment.description,
        "total_amount": payment.total_amount,
        "created_at": payment.created_at,
        "due_date": payment.due_date,
        "shares": share_objs,
        "all_fulfilled": all_fulfilled,
        "expired": bool(payment.expired),
        "shares": [
            {
                "id": s.id,
                "user_id": s.owed_by_id,
                "amount": s.amount,
                "fulfilled": bool(s.fulfilled),
                "accepted": bool(s.accepted)
    }
            for s in shares
        ]
    }


@app.get("/api/shares/owed-by-me")
def get_unfulfilled_shares_owed_by_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    shares = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(
            Share.owed_by_id == current_user.id,
            Payment.payer_id != current_user.id,
            Share.fulfilled == 0
        )
        .all()
    )
    return [
        {
            "id": s.id,
            "payment_id": s.payment_id,
            "user_id": s.owed_by_id,
            "amount": s.amount,
            "accepted": bool(s.accepted),
            "fulfilled": bool(s.fulfilled)
        }
        for s in shares
    ]

# --- Expire Payments ---
@app.on_event("startup")
@repeat_every(seconds=60)  # Check every minute
def expire_payments_task():
    db = SessionLocal()
    now = datetime.utcnow()
    payments = db.query(Payment).filter(Payment.expired == 0).all()
    for payment in payments:
        created_at = datetime.fromisoformat(payment.created_at)
        if (now - created_at).total_seconds() > 86400:  # 24 hours
            shares = db.query(Share).filter(Share.payment_id == payment.id).all()
            if any(share.accepted == 0 for share in shares):
                payment.expired = 1
    db.commit()
    db.close()

# --- Shares ---
@app.get("/api/shares")
def get_shares(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    shares = db.query(Share).filter(Share.owed_by_id == current_user.id).all()
    result = [{ 
        "id": s.id,
        "payment_id": s.payment_id,
        "user_id": s.owed_by_id,
        "amount": s.amount,
        "status": "fulfilled" if s.fulfilled else "pending",
        "accepted": bool(s.accepted)
    } for s in shares]
    print(result)
    return [
        {
            "id": s.id,
            "payment_id": s.payment_id,
            "user_id": s.owed_by_id,
            "amount": s.amount,
            "status": "fulfilled" if s.fulfilled else "pending",
            "accepted": bool(s.accepted)
        } for s in shares
    ]

@app.post("/api/shares/accept")
def accept_share(
    accept: ShareAccept,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    share = db.query(Share).filter(Share.id == accept.share_id, Share.owed_by_id == current_user.id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.accepted:
        return {"message": "Share already accepted"}
    share.accepted = 1
    db.commit()

    # --- New logic: auto-accept and fulfill payer's share if all others are accepted ---
    payment = db.query(Payment).filter(Payment.id == share.payment_id).first()
    if payment:
        shares = db.query(Share).filter(Share.payment_id == payment.id).all()
        payer_share = db.query(Share).filter(
            Share.payment_id == payment.id,
            Share.owed_by_id == payment.payer_id
        ).first()
        non_payer_shares = [s for s in shares if s.owed_by_id != payment.payer_id]
        if non_payer_shares and all(s.accepted for s in non_payer_shares):
            if payer_share and not payer_share.accepted:
                payer_share.accepted = 1
                payer_share.fulfilled = 1
                db.commit()

    return {"message": "Share accepted"}

@app.post("/api/shares/fulfill")
def fulfill_share(fulfill: ShareFulfill, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    share = db.query(Share).filter(Share.id == fulfill.share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    payment = db.query(Payment).filter(Payment.id == share.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Only the owner (payer) of the payment can fulfill the share
    if payment.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the payment owner can fulfill this share")
    if share.fulfilled:
        return {"message": "Share already fulfilled"}
    share.fulfilled = 1
    db.commit()
    return {"message": "Share fulfilled successfully"}

@app.get("/api/shares/owed-to-me")
def get_unfulfilled_shares_owed_to_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    shares = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(
            Payment.payer_id == current_user.id,
            Share.owed_by_id != current_user.id,
            Share.fulfilled == 0,
            Share.accepted == 1
        )
        .all()
    )
    return [
        {
            "id": s.id,
            "payment_id": s.payment_id,
            "user_id": s.owed_by_id,
            "amount": s.amount,
            "accepted": bool(s.accepted),
            "fulfilled": bool(s.fulfilled)
        }
        for s in shares
    ]

# --- Friendships ---
@app.post("/api/friendships/request")
def send_friend_request(
    req: FriendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    if not user_exists(req.friend_id, db):
        raise HTTPException(status_code=400, detail="User does not exist")

    # Check if already friends
    existing_friendship = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == req.friend_id,
        Friendship.status == "accepted"
    ).first()
    if existing_friendship:
        raise HTTPException(status_code=400, detail="You are already friends")

    # Check if request already sent
    already_sent = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == req.friend_id,
        Friendship.status == "pending"
    ).first()
    if already_sent:
        raise HTTPException(status_code=400, detail="Request already sent")

    # Check if there is an incoming pending request from the target user
    incoming = db.query(Friendship).filter(
        Friendship.user_id == req.friend_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).first()
    if incoming:
        # Accept both friendships directly
        incoming.status = "accepted"
        # Create reverse friendship as accepted if not exists
        reverse = db.query(Friendship).filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == req.friend_id
        ).first()
        if not reverse:
            new_friendship = Friendship(
                user_id=current_user.id,
                friend_id=req.friend_id,
                status="accepted"
            )
            db.add(new_friendship)
        else:
            reverse.status = "accepted"
        db.commit()
        return {"message": "Friend request mutually accepted"}

    # Otherwise, create a new pending request
    friendship = Friendship(user_id=current_user.id, friend_id=req.friend_id, status="pending")
    db.add(friendship)
    db.commit()
    return {"message": "Friend request sent successfully"}

@app.post("/api/friendships/requests/{sender_id}/accept")
def accept_friend_request(
    sender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the pending request where current_user is the recipient and sender_id is the sender
    friendship = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == sender_id,
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending"
        )
        .first()
    )
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found.")

    # Accept the request
    friendship.status = "accepted"
    db.commit()

    # Check if reverse friendship exists
    reverse = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == sender_id
        )
        .first()
    )
    if not reverse:
        # Create reverse friendship
        new_friendship = Friendship(
            user_id=current_user.id,
            friend_id=sender_id,
            status="accepted"
        )
        db.add(new_friendship)
        db.commit()

    return {"detail": "Friend request accepted."}

@app.post("/api/friendships/reject")
def reject_friend_request(req: FriendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.query(Friendship).filter(Friendship.user_id == req.friend_id, Friendship.friend_id == current_user.id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    db.delete(friendship)
    db.commit()
    return {"message": "Friend request rejected successfully"}

@app.get("/api/friendships")
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendships = db.query(Friendship).filter(Friendship.user_id == current_user.id, Friendship.status == "accepted").all()
    friends = [db.query(User).filter(User.id == f.friend_id).first() for f in friendships]
    result = [{"id": friend.id, "username": friend.username} for friend in friends]
    print(result)
    return [{"id": friend.id, "username": friend.username} for friend in friends]

@app.get("/api/friendships/requests")
def get_incoming_friend_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only show requests where the current user is the recipient and not the sender
    requests = (
        db.query(Friendship)
        .filter(
            Friendship.friend_id == current_user.id,
            Friendship.user_id != current_user.id,
            Friendship.status == "pending"
        )
        .all()
    )
    result = []
    for req in requests:
        sender = db.query(User).filter(User.id == req.user_id).first()
        if sender:
            result.append({
                "id": sender.id,
                "username": sender.username,
                "status": req.status
            })
    return result


@app.post("/api/users/search")
def search_users(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = data.get("query", "")
    if not query or len(query) < 1:
        return []

    # Example: filter out self, friends, and pending requests
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{query}%"))
        .filter(User.id != current_user.id)
        .all()
    )

    # Exclude users who are already friends or have pending requests
    friendships = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) | (Friendship.friend_id == current_user.id))
    ).all()
    exclude_ids = set()
    for f in friendships:
        exclude_ids.add(f.user_id)
        exclude_ids.add(f.friend_id)
    exclude_ids.discard(current_user.id)
    filtered_users = [u for u in users if u.id not in exclude_ids]

    return [
        {"id": u.id, "username": u.username}
        for u in filtered_users
    ]

@app.delete("/api/friendships/{friend_id}")
def unfriend(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Delete both friendship rows (in both directions)
    friendships = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == current_user.id))
    ).all()

    if not friendships:
        raise HTTPException(status_code=404, detail="Friendship not found.")

    for friendship in friendships:
        db.delete(friendship)
    db.commit()

    return {"detail": "Friendship removed."}

@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Payments created by the user
    payments = db.query(Payment).filter(Payment.payer_id == current_user.id).all()
    total_created = len(payments)
    total_created_amount = sum(p.total_amount for p in payments)

    # Shares owed by the user (not fulfilled), EXCLUDE shares where user owes themselves
    shares_owed = db.query(Share).filter(
        Share.owed_by_id == current_user.id
    ).join(Payment, Share.payment_id == Payment.id).filter(
        Payment.payer_id != current_user.id
    ).all()
    total_owed = sum(s.amount for s in shares_owed if not s.fulfilled)
    total_owed_count = sum(1 for s in shares_owed if not s.fulfilled)

    # Shares owed to the user (user is payer, not fulfilled), EXCLUDE shares where user owes themselves
    shares_owed_to_me = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(
            Payment.payer_id == current_user.id,
            Share.owed_by_id != current_user.id,
            Share.fulfilled == 0
        )
        .all()
    )
    total_owed_to_me = sum(s.amount for s in shares_owed_to_me)
    total_owed_to_me_count = len(shares_owed_to_me)

    # Shares fulfilled for the user (user is payer, fulfilled), EXCLUDE shares where user owes themselves
    shares_fulfilled_to_me = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(
            Payment.payer_id == current_user.id,
            Share.owed_by_id != current_user.id,
            Share.fulfilled == 1
        )
        .all()
    )
    total_fulfilled_to_me = sum(s.amount for s in shares_fulfilled_to_me)
    total_fulfilled_to_me_count = len(shares_fulfilled_to_me)

    return {
        "payments_created": {
            "count": total_created,
            "total_amount": total_created_amount
        },
        "shares_owed": {
            "count": total_owed_count,
            "total_amount": total_owed
        },
        "shares_owed_to_me": {
            "count": total_owed_to_me_count,
            "total_amount": total_owed_to_me
        },
        "shares_fulfilled_to_me": {
            "count": total_fulfilled_to_me_count,
            "total_amount": total_fulfilled_to_me
        }
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to the UO-ME API!"}