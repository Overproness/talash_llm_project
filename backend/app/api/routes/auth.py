"""Auth routes — POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.user import Token, UserCreate, UserLogin, UserPublic
from app.services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()


@router.post("/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(
    body: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new user account. Returns a JWT access token on success."""
    normalised_email = body.email.lower().strip()

    existing = await db.users.find_one({"email": normalised_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_doc = {
        "full_name": body.full_name.strip(),
        "email": normalised_email,
        "hashed_password": hash_password(body.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(
        data={"sub": normalised_email, "user_id": user_id}
    )
    return Token(access_token=access_token)


@router.post("/auth/login", response_model=Token)
async def login(
    body: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate with email and password. Returns a JWT access token."""
    normalised_email = body.email.lower().strip()

    user = await db.users.find_one({"email": normalised_email})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": normalised_email, "user_id": str(user["_id"])}
    )
    return Token(access_token=access_token)


@router.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's public profile."""
    return UserPublic(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )
