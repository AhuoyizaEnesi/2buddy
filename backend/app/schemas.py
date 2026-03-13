from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class ProblemOut(BaseModel):
    id: str
    subject: str
    title: str
    description: str
    difficulty: str

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    subject: str


class SessionOut(BaseModel):
    id: str
    room_code: str
    subject: str
    status: str
    created_at: datetime
    problem: Optional[ProblemOut] = None

    class Config:
        from_attributes = True


class AIHintOut(BaseModel):
    id: str
    trigger_type: str
    hint_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionHistoryOut(BaseModel):
    id: str
    room_code: str
    subject: str
    status: str
    created_at: datetime
    ended_at: Optional[datetime]
    problem: Optional[ProblemOut]
    hints: List[AIHintOut]

    class Config:
        from_attributes = True