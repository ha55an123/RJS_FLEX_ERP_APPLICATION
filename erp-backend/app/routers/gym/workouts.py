from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.workout import (
    Exercise, WorkoutPlan, WorkoutPlanExercise,
    MemberWorkoutPlan, WorkoutProgress,
    MuscleGroup, DifficultyLevel
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])

TRAINER_ROLES = ["super_admin", "gym_owner", "manager", "trainer"]
STAFF_ROLES   = ["super_admin", "gym_owner", "manager", "receptionist", "trainer"]


# ── Exercises ─────────────────────────────────────────────────────────────────

class ExerciseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    muscle_group: Optional[MuscleGroup] = None
    difficulty: Optional[DifficultyLevel] = None
    equipment_needed: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    instructions: Optional[str] = None
    calories_per_min: Optional[float] = None


@router.get("/exercises")
def list_exercises(
    muscle_group: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(Exercise).filter(Exercise.is_active == True)  # noqa: E712
    if muscle_group:
        q = q.filter(Exercise.muscle_group == muscle_group)
    if difficulty:
        q = q.filter(Exercise.difficulty == difficulty)
    if search:
        q = q.filter(Exercise.name.ilike(f"%{search}%"))
    return q.order_by(Exercise.name).all()


@router.post("/exercises", status_code=status.HTTP_201_CREATED)
def create_exercise(data: ExerciseCreate, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    ex = Exercise(**data.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.put("/exercises/{exercise_id}")
def update_exercise(exercise_id: int, data: ExerciseCreate, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercise not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ex, k, v)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercise not found")
    ex.is_active = False
    db.commit()
    return {"message": "Exercise deactivated"}


# ── Workout Plans ─────────────────────────────────────────────────────────────

class PlanExerciseItem(BaseModel):
    exercise_id: int
    day_number: int
    sets: Optional[int] = None
    reps: Optional[str] = None
    rest_seconds: Optional[int] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    order_index: int = 0


class WorkoutPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trainer_id: Optional[int] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[DifficultyLevel] = None
    goal: Optional[str] = None
    is_template: bool = False
    exercises: list[PlanExerciseItem] = []


@router.get("/plans")
def list_plans(
    trainer_id: Optional[int] = None,
    is_template: Optional[bool] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(WorkoutPlan).filter(WorkoutPlan.is_active == True)  # noqa: E712
    if trainer_id:
        q = q.filter(WorkoutPlan.trainer_id == trainer_id)
    if is_template is not None:
        q = q.filter(WorkoutPlan.is_template == is_template)
    return q.order_by(WorkoutPlan.name).all()


@router.get("/plans/{plan_id}")
def get_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    return plan


@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(data: WorkoutPlanCreate, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    exercises = data.exercises
    plan_data = data.model_dump(exclude={"exercises"})
    plan = WorkoutPlan(**plan_data)
    db.add(plan)
    db.flush()
    for ex in exercises:
        db.add(WorkoutPlanExercise(plan_id=plan.id, **ex.model_dump()))
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.is_active = False
    plan.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Plan deactivated"}


# ── Member Assignments ────────────────────────────────────────────────────────

class AssignPlan(BaseModel):
    member_id: int
    plan_id: int
    trainer_id: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None
    trainer_notes: Optional[str] = None


@router.post("/assign", status_code=status.HTTP_201_CREATED)
def assign_plan(data: AssignPlan, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    # Deactivate previous active plan
    db.query(MemberWorkoutPlan).filter(
        MemberWorkoutPlan.member_id == data.member_id,
        MemberWorkoutPlan.is_active == True,  # noqa: E712
    ).update({"is_active": False})
    assignment = MemberWorkoutPlan(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/member/{member_id}/plan")
def member_plan(member_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    assignment = db.query(MemberWorkoutPlan).filter(
        MemberWorkoutPlan.member_id == member_id,
        MemberWorkoutPlan.is_active == True,  # noqa: E712
    ).first()
    if not assignment:
        return None
    
    # Get the plan with all exercises
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == assignment.plan_id).first()
    if not plan:
        return None
    
    # Get exercises grouped by day
    exercises = db.query(WorkoutPlanExercise).filter(
        WorkoutPlanExercise.plan_id == plan.id
    ).order_by(WorkoutPlanExercise.day_number, WorkoutPlanExercise.order_index).all()
    
    # Group exercises by day
    day_names = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'}
    exercises_by_day = {}
    for ex in exercises:
        day_name = day_names.get(ex.day_number, f'Day {ex.day_number}')
        if day_name not in exercises_by_day:
            exercises_by_day[day_name] = []
        exercises_by_day[day_name].append(ex)
    
    return {
        "assignment": assignment,
        "plan": plan,
        "exercises_by_day": exercises_by_day,
    }


# ── Progress Tracking ─────────────────────────────────────────────────────────

class ProgressLog(BaseModel):
    member_id: int
    exercise_id: int
    log_date: date
    sets_completed: Optional[int] = None
    reps_completed: Optional[str] = None
    weight_kg: Optional[float] = None
    duration_minutes: Optional[int] = None
    calories_burned: Optional[float] = None
    notes: Optional[str] = None


@router.post("/progress", status_code=status.HTTP_201_CREATED)
def log_progress(data: ProgressLog, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    log = WorkoutProgress(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/progress/{member_id}")
def get_progress(
    member_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(WorkoutProgress).filter(WorkoutProgress.member_id == member_id)
    if from_date:
        q = q.filter(WorkoutProgress.log_date >= from_date)
    if to_date:
        q = q.filter(WorkoutProgress.log_date <= to_date)
    total = q.count()
    items = q.order_by(WorkoutProgress.log_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}
