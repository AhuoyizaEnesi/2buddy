from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("SessionParticipant", back_populates="user")
    history = Column(Text, nullable=True)


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String, primary_key=True, default=generate_uuid)
    subject = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, default="medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_code = Column(String, unique=True, nullable=False, index=True)
    subject = Column(String, nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=True)
    status = Column(String, default="waiting")
    canvas_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    problem = relationship("Problem")
    participants = relationship("SessionParticipant", back_populates="session")
    hints = relationship("AIHint", back_populates="session")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    color = Column(String, default="#7F77DD")

    session = relationship("Session", back_populates="participants")
    user = relationship("User", back_populates="sessions")


class AIHint(Base):
    __tablename__ = "ai_hints"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    trigger_type = Column(String, nullable=False)
    hint_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="hints")