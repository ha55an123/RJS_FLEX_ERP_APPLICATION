from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from app.core.database import get_db
from app.core.auth_dependencies import require_role
from app.models.diet import MealPlan, MealPlanItem, MemberDietPlan, NutritionLog

router = APIRouter(prefix="/diet", tags=["Diet"])

TRAINER_ROLES = ["super_admin", "gym_owner", "manager", "trainer"]
STAFF_ROLES   = ["super_admin", "gym_owner", "manager", "receptionist", "trainer"]


class MealItemCreate(BaseModel):
    meal_type: str
    food_name: str
    quantity: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    notes: Optional[str] = None
    order_index: int = 0


class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trainer_id: Optional[int] = None
    goal: Optional[str] = None
    total_calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    water_liters: Optional[float] = None
    is_template: bool = False
    items: list[MealItemCreate] = []


class AssignDiet(BaseModel):
    member_id: int
    meal_plan_id: int
    trainer_id: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None
    supplement_plan: Optional[str] = None
    notes: Optional[str] = None


class NutritionLogCreate(BaseModel):
    member_id: int
    log_date: date
    meal_type: Optional[str] = None
    food_name: str
    quantity: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    water_ml: Optional[float] = None
    notes: Optional[str] = None


@router.get("/plans")
def list_plans(
    trainer_id: Optional[int] = None,
    is_template: Optional[bool] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(MealPlan).filter(MealPlan.is_active == True)  # noqa: E712
    if trainer_id:
        q = q.filter(MealPlan.trainer_id == trainer_id)
    if is_template is not None:
        q = q.filter(MealPlan.is_template == is_template)
    return q.order_by(MealPlan.name).all()


@router.get("/plans/{plan_id}")
def get_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    return plan


@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(data: MealPlanCreate, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    items = data.items
    plan = MealPlan(**data.model_dump(exclude={"items"}))
    db.add(plan)
    db.flush()
    for item in items:
        db.add(MealPlanItem(meal_plan_id=plan.id, **item.model_dump()))
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    plan.is_active = False
    plan.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Plan deactivated"}


@router.post("/assign", status_code=status.HTTP_201_CREATED)
def assign_diet(data: AssignDiet, db: Session = Depends(get_db), _=Depends(require_role(TRAINER_ROLES))):
    db.query(MemberDietPlan).filter(
        MemberDietPlan.member_id == data.member_id,
        MemberDietPlan.is_active == True,  # noqa: E712
    ).update({"is_active": False})
    assignment = MemberDietPlan(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/member/{member_id}/plan")
def member_diet(member_id: int, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    return db.query(MemberDietPlan).filter(
        MemberDietPlan.member_id == member_id,
        MemberDietPlan.is_active == True,  # noqa: E712
    ).first()


@router.post("/nutrition-log", status_code=status.HTTP_201_CREATED)
def log_nutrition(data: NutritionLogCreate, db: Session = Depends(get_db), _=Depends(require_role(STAFF_ROLES))):
    log = NutritionLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/nutrition-log/{member_id}")
def get_nutrition_log(
    member_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(STAFF_ROLES)),
):
    q = db.query(NutritionLog).filter(NutritionLog.member_id == member_id)
    if from_date:
        q = q.filter(NutritionLog.log_date >= from_date)
    if to_date:
        q = q.filter(NutritionLog.log_date <= to_date)
    total = q.count()
    items = q.order_by(NutritionLog.log_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}
