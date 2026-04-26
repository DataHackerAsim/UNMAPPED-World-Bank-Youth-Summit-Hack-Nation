import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from models.schemas import Token, UserCreate
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token({"sub": user.username}))


@router.get("/users/me")
async def whoami(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's identity and admin flag."""
    return {"username": current_user.username, "is_admin": current_user.is_admin}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Identity probe alias used by the frontend AuthContext.

    Returns the same shape as `/users/me`; kept as a separate route so the
    frontend can adopt the simpler URL without rippling changes through
    callers that already speak to `/users/me`.
    """
    return {"username": current_user.username, "is_admin": current_user.is_admin}


@router.post("/users", status_code=201)
async def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username taken")
    db.add(
        User(
            username=body.username,
            hashed_password=hash_password(body.password),
            is_admin=body.is_admin,
        )
    )
    db.commit()
    return {"username": body.username, "is_admin": body.is_admin}


@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """List all login accounts. Admin only.

    These are authentication accounts (rows in the `users` table), distinct
    from the worker skill profiles served by `/profiles` — the two are not
    related, despite both having "user" in the name.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    return [{"id": u.id, "username": u.username, "is_admin": u.is_admin} for u in users]
