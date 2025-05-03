import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models from main.py
from main import Base, User, Payment, Share, Friendship, DATABASE_URL, get_password_hash

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def reset_db():
    # Drop and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def create_users():
    users = [
        {"username": "alice", "password": "alicepass", "email": "alice@example.com"},
        {"username": "bob", "password": "bobpass", "email": "bob@example.com"},
        {"username": "carol", "password": "carolpass", "email": "carol@example.com"},
        {"username": "dave", "password": "davepass", "email": "dave@example.com"},
    ]
    user_objs = []
    for u in users:
        user = User(
            username=u["username"],
            password=get_password_hash(u["password"]),
            email=u["email"],
            created_at=datetime.utcnow().isoformat()
        )
        db.add(user)
        user_objs.append(user)
    db.commit()
    for user in user_objs:
        db.refresh(user)
    return user_objs

def create_friendships(users):
    # Make everyone friends with everyone else
    for u in users:
        for f in users:
            if u.id != f.id:
                db.add(Friendship(user_id=u.id, friend_id=f.id, status="accepted", created_at=datetime.utcnow().isoformat()))
    db.commit()

def create_payments_and_shares(users):
    now = datetime.utcnow()
    # Existing 3 payments
    payment1 = Payment(
        payer_id=users[0].id,
        title="Dinner at Italian Place",
        description="Shared dinner bill",
        total_amount=90.0,
        created_at=now.isoformat(),
        due_date=(now + timedelta(days=3)).isoformat(),
        expired=0
    )
    db.add(payment1)
    db.commit()
    db.refresh(payment1)
    shares1 = [
        Share(payment_id=payment1.id, owed_by_id=users[0].id, amount=30.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment1.id, owed_by_id=users[1].id, amount=30.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment1.id, owed_by_id=users[2].id, amount=30.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares1)

    payment2 = Payment(
        payer_id=users[1].id,
        title="Movie Tickets",
        description="Avengers: Endgame",
        total_amount=48.0,
        created_at=(now - timedelta(days=1)).isoformat(),
        due_date=(now + timedelta(days=2)).isoformat(),
        expired=0
    )
    db.add(payment2)
    db.commit()
    db.refresh(payment2)
    shares2 = [
        Share(payment_id=payment2.id, owed_by_id=users[1].id, amount=16.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment2.id, owed_by_id=users[0].id, amount=16.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment2.id, owed_by_id=users[3].id, amount=16.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares2)

    payment3 = Payment(
        payer_id=users[2].id,
        title="Concert Tickets",
        description="Rock concert",
        total_amount=200.0,
        created_at=(now - timedelta(days=2)).isoformat(),
        due_date=(now + timedelta(days=5)).isoformat(),
        expired=0
    )
    db.add(payment3)
    db.commit()
    db.refresh(payment3)
    shares3 = [
        Share(payment_id=payment3.id, owed_by_id=users[2].id, amount=50.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment3.id, owed_by_id=users[0].id, amount=50.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment3.id, owed_by_id=users[1].id, amount=50.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
        Share(payment_id=payment3.id, owed_by_id=users[3].id, amount=50.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares3)

    payment4 = Payment(
        payer_id=users[3].id,
        title="Brunch at Cafe",
        description="Sunday brunch",
        total_amount=60.0,
        created_at=(now - timedelta(days=3)).isoformat(),
        due_date=(now + timedelta(days=1)).isoformat(),
        expired=0
    )
    db.add(payment4)
    db.commit()
    db.refresh(payment4)
    shares4 = [
        Share(payment_id=payment4.id, owed_by_id=users[3].id, amount=15.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment4.id, owed_by_id=users[0].id, amount=15.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment4.id, owed_by_id=users[1].id, amount=15.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
        Share(payment_id=payment4.id, owed_by_id=users[2].id, amount=15.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares4)

    payment5 = Payment(
        payer_id=users[0].id,
        title="Taxi Ride",
        description="Late night taxi",
        total_amount=36.0,
        created_at=(now - timedelta(days=4)).isoformat(),
        due_date=(now + timedelta(days=2)).isoformat(),
        expired=0
    )
    db.add(payment5)
    db.commit()
    db.refresh(payment5)
    shares5 = [
        Share(payment_id=payment5.id, owed_by_id=users[0].id, amount=12.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment5.id, owed_by_id=users[2].id, amount=12.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment5.id, owed_by_id=users[3].id, amount=12.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares5)

    payment6 = Payment(
        payer_id=users[1].id,
        title="Board Game Night",
        description="Snacks and drinks",
        total_amount=40.0,
        created_at=(now - timedelta(days=5)).isoformat(),
        due_date=(now + timedelta(days=4)).isoformat(),
        expired=0
    )
    db.add(payment6)
    db.commit()
    db.refresh(payment6)
    shares6 = [
        Share(payment_id=payment6.id, owed_by_id=users[1].id, amount=10.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment6.id, owed_by_id=users[0].id, amount=10.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment6.id, owed_by_id=users[2].id, amount=10.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
        Share(payment_id=payment6.id, owed_by_id=users[3].id, amount=10.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares6)

    payment7 = Payment(
        payer_id=users[2].id,
        title="Picnic Supplies",
        description="Food and drinks for park picnic",
        total_amount=80.0,
        created_at=(now - timedelta(days=6)).isoformat(),
        due_date=(now + timedelta(days=3)).isoformat(),
        expired=0
    )
    db.add(payment7)
    db.commit()
    db.refresh(payment7)
    shares7 = [
        Share(payment_id=payment7.id, owed_by_id=users[2].id, amount=20.0, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment7.id, owed_by_id=users[0].id, amount=20.0, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment7.id, owed_by_id=users[1].id, amount=20.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
        Share(payment_id=payment7.id, owed_by_id=users[3].id, amount=20.0, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares7)

    payment8 = Payment(
        payer_id=users[3].id,
        title="Pizza Night",
        description="Ordered pizza for everyone",
        total_amount=50.0,
        created_at=(now - timedelta(days=7)).isoformat(),
        due_date=(now + timedelta(days=2)).isoformat(),
        expired=0
    )
    db.add(payment8)
    db.commit()
    db.refresh(payment8)
    shares8 = [
        Share(payment_id=payment8.id, owed_by_id=users[3].id, amount=12.5, fulfilled=1, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment8.id, owed_by_id=users[0].id, amount=12.5, fulfilled=0, accepted=1, created_at=now.isoformat()),
        Share(payment_id=payment8.id, owed_by_id=users[1].id, amount=12.5, fulfilled=0, accepted=0, created_at=now.isoformat()),
        Share(payment_id=payment8.id, owed_by_id=users[2].id, amount=12.5, fulfilled=0, accepted=0, created_at=now.isoformat()),
    ]
    db.add_all(shares8)

    db.commit()

def main():
    print("Resetting and populating database with sample data...")
    reset_db()
    users = create_users()
    create_friendships(users)
    create_payments_and_shares(users)
    print("Done.")

if __name__ == "__main__":
    main()