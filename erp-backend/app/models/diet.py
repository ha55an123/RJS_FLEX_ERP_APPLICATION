from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    description     = Column(Text, nullable=True)
    trainer_id      = Column(Integer, ForeignKey("gym_staff.id"), nullable=True)
    goal            = Column(String, nullable=True)   # weight_loss | muscle_gain | maintenance
    total_calories  = Column(Float, nullable=True)
    protein_g       = Column(Float, nullable=True)
    carbs_g         = Column(Float, nullable=True)
    fat_g           = Column(Float, nullable=True)
    water_liters    = Column(Float, nullable=True)
    is_template     = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items           = relationship("MealPlanItem", back_populates="meal_plan")
    assignments     = relationship("MemberDietPlan", back_populates="meal_plan")


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"

    id              = Column(Integer, primary_key=True, index=True)
    meal_plan_id    = Column(Integer, ForeignKey("meal_plans.id"), nullable=False, index=True)
    meal_type       = Column(String, nullable=False)   # breakfast | lunch | dinner | snack | pre_workout | post_workout
    food_name       = Column(String, nullable=False)
    quantity        = Column(String, nullable=True)    # "200g" or "1 cup"
    calories        = Column(Float, nullable=True)
    protein_g       = Column(Float, nullable=True)
    carbs_g         = Column(Float, nullable=True)
    fat_g           = Column(Float, nullable=True)
    notes           = Column(Text, nullable=True)
    order_index     = Column(Integer, default=0)

    meal_plan       = relationship("MealPlan", back_populates="items")


class MemberDietPlan(Base):
    __tablename__ = "member_diet_plans"

    id              = Column(Integer, primary_key=True, index=True)
    member_id       = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    meal_plan_id    = Column(Integer, ForeignKey("meal_plans.id"), nullable=False, index=True)
    trainer_id      = Column(Integer, ForeignKey("gym_staff.id"), nullable=True)
    start_date      = Column(Date, nullable=False)
    end_date        = Column(Date, nullable=True)
    supplement_plan = Column(Text, nullable=True)
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    meal_plan       = relationship("MealPlan", back_populates="assignments")


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id              = Column(Integer, primary_key=True, index=True)
    member_id       = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    log_date        = Column(Date, nullable=False, index=True)
    meal_type       = Column(String, nullable=True)
    food_name       = Column(String, nullable=False)
    quantity        = Column(String, nullable=True)
    calories        = Column(Float, nullable=True)
    protein_g       = Column(Float, nullable=True)
    carbs_g         = Column(Float, nullable=True)
    fat_g           = Column(Float, nullable=True)
    water_ml        = Column(Float, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
