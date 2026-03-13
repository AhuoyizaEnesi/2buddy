from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from typing import List

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/{subject}", response_model=List[schemas.ProblemOut])
def get_problems_by_subject(
    subject: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    problems = db.query(models.Problem).filter(
        models.Problem.subject == subject.lower()
    ).all()

    if not problems:
        raise HTTPException(status_code=404, detail="No problems found for this subject")

    return problems


@router.get("/single/{problem_id}", response_model=schemas.ProblemOut)
def get_problem(
    problem_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem