from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app import models, schemas, auth
from typing import List
import random
import string
import time

router = APIRouter(prefix="/sessions", tags=["sessions"])


def generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/create-direct", response_model=schemas.SessionOut)
def create_direct_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    subject = data.subject.lower().strip()

    room_code = generate_room_code()
    while db.query(models.Session).filter(
        models.Session.room_code == room_code
    ).first():
        room_code = generate_room_code()

    problem = (
        db.query(models.Problem)
        .filter(models.Problem.subject == subject)
        .order_by(func.random())
        .first()
    )

    new_session = models.Session(
        room_code=room_code,
        subject=subject,
        status="active",
        problem_id=problem.id if problem else None
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    colors = ["#7F77DD", "#1D9E75"]
    participant = models.SessionParticipant(
        session_id=new_session.id,
        user_id=current_user.id,
        color=colors[0]
    )
    db.add(participant)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.post("/join-direct/{session_id}", response_model=schemas.SessionOut)
def join_direct_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = db.query(models.SessionParticipant).filter(
        models.SessionParticipant.session_id == session_id,
        models.SessionParticipant.user_id == current_user.id
    ).first()

    if not existing:
        participant = models.SessionParticipant(
            session_id=session_id,
            user_id=current_user.id,
            color="#1D9E75"
        )
        db.add(participant)
        db.commit()

    db.refresh(session)
    return session


@router.post("/join", response_model=schemas.SessionOut)
def join_or_create_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    subject = data.subject.lower().strip()
    colors = ["#7F77DD", "#1D9E75", "#D85A30", "#378ADD", "#D4537E"]

    existing_participation = (
        db.query(models.SessionParticipant)
        .join(models.Session)
        .filter(
            models.SessionParticipant.user_id == current_user.id,
            models.Session.status.in_(["waiting", "active"])
        )
        .first()
    )

    if existing_participation:
        session = db.query(models.Session).filter(
            models.Session.id == existing_participation.session_id
        ).first()
        return session

    room_code = generate_room_code()
    while db.query(models.Session).filter(
        models.Session.room_code == room_code
    ).first():
        room_code = generate_room_code()

    problem = (
        db.query(models.Problem)
        .filter(models.Problem.subject == subject)
        .order_by(func.random())
        .first()
    )

    new_session = models.Session(
        room_code=room_code,
        subject=subject,
        status="active",
        problem_id=problem.id if problem else None
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    participant = models.SessionParticipant(
        session_id=new_session.id,
        user_id=current_user.id,
        color=colors[0]
    )
    db.add(participant)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/history", response_model=List[schemas.SessionHistoryOut])
def get_session_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    participations = db.query(models.SessionParticipant).filter(
        models.SessionParticipant.user_id == current_user.id
    ).all()

    session_ids = [p.session_id for p in participations]
    sessions = (
        db.query(models.Session)
        .filter(
            models.Session.id.in_(session_ids),
            models.Session.status == "completed"
        )
        .order_by(models.Session.ended_at.desc())
        .all()
    )
    return sessions


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/end")
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "completed"
    session.ended_at = func.now()
    db.commit()
    return {"message": "Session ended"}