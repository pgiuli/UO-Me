import os
import re
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from datetime import datetime, timedelta

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
    description = Column(Text)
    total_amount = Column(Float)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    expired = Column(Integer, default=0)  # 0 = active, 1 = expired

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

class ShareFulfill(BaseModel):
    share_id: int
    amount: float

class FriendRequest(BaseModel):
    friend_id: int

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Auth/JWT setup ---
SECRET_KEY = "your-secret-key"  # Replace with a secure random key in production!
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
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # or ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static files for profile pictures ---
PROFILE_PICS_DIR = "profile_pics"
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="."), name="static")

# --- Profile Picture Upload ---
@app.post("/api/users/profile-picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1]
    filename = f"user_{current_user.id}{ext}"
    file_path = os.path.join(PROFILE_PICS_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    # Save the relative path or URL in the user record
    current_user.profile_picture = f"/static/{PROFILE_PICS_DIR}/{filename}"
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
        samesite="lax",
        secure=False  # Set to True in production (HTTPS)
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
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    participant_ids = [share.user_id for share in payment.shares]

    # Check all users exist
    for pid in participant_ids:
        if not user_exists(pid, db):
            raise HTTPException(status_code=400, detail=f"User {pid} does not exist")

    # Check all participants are friends with the creator (current_user)
    for pid in participant_ids:
        if pid == current_user.id:
            continue  # Allow self
        friendship = db.query(Friendship).filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == pid,
            Friendship.status == "accepted"
        ).first()
        if not friendship:
            raise HTTPException(
                status_code=400,
                detail=f"User {pid} is not your friend"
            )

    # Check that all shares sum to the total_amount
    total_shares = sum(share.amount for share in payment.shares)
    if abs(total_shares - payment.total_amount) > 0.01:
        raise HTTPException(
            status_code=400,
            detail="Sum of shares does not equal total payment amount"
        )

    db_payment = Payment(
        payer_id=current_user.id,
        description=payment.description,
        total_amount=payment.total_amount,
        created_at=datetime.utcnow().isoformat(),
        expired=0
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    for share in payment.shares:
        is_fulfilled = 1 if share.user_id == current_user.id else 0
        is_accepted = 1 if share.user_id == current_user.id else 0
        db_share = Share(
            payment_id=db_payment.id,
            owed_by_id=share.user_id,
            amount=share.amount,
            fulfilled=is_fulfilled,
            accepted=is_accepted,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(db_share)
    db.commit()
    return {"message": "Payment created successfully"}

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

# --- Expire Payments ---
from fastapi_utils.tasks import repeat_every

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
def accept_share(share_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    share = db.query(Share).filter(Share.id == share_id, Share.owed_by_id == current_user.id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.accepted:
        return {"message": "Share already accepted"}
    share.accepted = 1
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

# --- Friendships ---
@app.post("/api/friendships/request")
def send_friend_request(req: FriendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    if not user_exists(req.friend_id, db):
        raise HTTPException(status_code=400, detail="User does not exist")
    if db.query(Friendship).filter(Friendship.user_id == current_user.id, Friendship.friend_id == req.friend_id).first():
        raise HTTPException(status_code=400, detail="Request already sent")
    friendship = Friendship(user_id=current_user.id, friend_id=req.friend_id, status="pending")
    db.add(friendship)
    db.commit()
    return {"message": "Friend request sent successfully"}

@app.post("/api/friendships/accept")
def accept_friend_request(req: FriendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.query(Friendship).filter(Friendship.user_id == req.friend_id, Friendship.friend_id == current_user.id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    friendship.status = "accepted"
    db.commit()
    return {"message": "Friend request accepted successfully"}

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
    return [{"id": friend.id, "username": friend.username} for friend in friends]

@app.delete("/api/friendships")
def remove_friend(req: FriendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.query(Friendship).filter(Friendship.user_id == current_user.id, Friendship.friend_id == req.friend_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    db.delete(friendship)
    db.commit()
    return {"message": "Friend removed successfully"}

@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Payments created by the user
    payments = db.query(Payment).filter(Payment.payer_id == current_user.id).all()
    total_created = len(payments)
    total_created_amount = sum(p.total_amount for p in payments)

    # Shares owed by the user (not fulfilled)
    shares_owed = db.query(Share).filter(
        Share.owed_by_id == current_user.id
    ).all()
    total_owed = sum(s.amount for s in shares_owed if not s.fulfilled)
    total_owed_count = sum(1 for s in shares_owed if not s.fulfilled)

    # Shares owed to the user (user is payer, not fulfilled)
    shares_owed_to_me = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(Payment.payer_id == current_user.id, Share.owed_by_id != current_user.id, Share.fulfilled == 0)
        .all()
    )
    total_owed_to_me = sum(s.amount for s in shares_owed_to_me)
    total_owed_to_me_count = len(shares_owed_to_me)

    # Shares fulfilled for the user (user is payer, fulfilled)
    shares_fulfilled_to_me = (
        db.query(Share)
        .join(Payment, Share.payment_id == Payment.id)
        .filter(Payment.payer_id == current_user.id, Share.owed_by_id != current_user.id, Share.fulfilled == 1)
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