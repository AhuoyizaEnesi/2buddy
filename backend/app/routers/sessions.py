from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app import models, schemas, auth
from typing import List
import random
import string

router = APIRouter(prefix="/sessions", tags=["sessions"])


def generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/join", response_model=schemas.SessionOut)
def join_or_create_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    existing_participation = db.query(models.SessionParticipant).join(
        models.Session
    ).filter(
        models.SessionParticipant.user_id == current_user.id,
        models.Session.status.in_(["waiting", "active"])
    ).first()

    if existing_participation:
        return existing_participation.session

    waiting_session = db.query(models.Session).filter(
        models.Session.subject == data.subject.lower(),
        models.Session.status == "waiting"
    ).first()

    colors = ["#7F77DD", "#1D9E75", "#D85A30", "#378ADD", "#D4537E"]

    if waiting_session:
        existing_participants = db.query(models.SessionParticipant).filter(
            models.SessionParticipant.session_id == waiting_session.id
        ).all()
        used_colors = [p.color for p in existing_participants]
        available_colors = [c for c in colors if c not in used_colors]
        color = available_colors[0] if available_colors else colors[1]

        participant = models.SessionParticipant(
            session_id=waiting_session.id,
            user_id=current_user.id,
            color=color
        )
        db.add(participant)

        problem = db.query(models.Problem).filter(
            models.Problem.subject == data.subject.lower()
        ).order_by(func.random()).first()

        waiting_session.status = "active"
        if problem:
            waiting_session.problem_id = problem.id

        db.commit()
        db.refresh(waiting_session)
        return waiting_session

    room_code = generate_room_code()
    while db.query(models.Session).filter(models.Session.room_code == room_code).first():
        room_code = generate_room_code()

    new_session = models.Session(
        room_code=room_code,
        subject=data.subject.lower(),
        status="waiting"
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
    sessions = db.query(models.Session).filter(
        models.Session.id.in_(session_ids),
        models.Session.status == "completed"
    ).order_by(models.Session.ended_at.desc()).all()

    return sessions


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/end")
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from sqlalchemy.sql import func
    session.status = "completed"
    session.ended_at = func.now()
    db.commit()
    return {"message": "Session ended"}