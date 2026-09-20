from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class MuscleGroup(str, enum.Enum):
    CHEST       = "chest"
    BACK        = "back"
    SHOULDERS   = "shoulders"
    BICEPS      = "biceps"
    TRICEPS     = "triceps"
    LEGS        = "legs"
    GLUTES      = "glutes"
    CORE        = "core"
    CARDIO      = "cardio"
    FULL_BODY   = "full_body"
    OTHER       = "other"


class DifficultyLevel(str, enum.Enum):
    BEGINNER     = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED     = "advanced"


class Exercise(Base):
    __tablename__ = "exercises"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False, index=True)
    description     = Column(Text, nullable=True)
    muscle_group    = Column(
        SAEnum(MuscleGroup, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    difficulty      = Column(
        SAEnum(DifficultyLevel, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    equipment_needed = Column(String, nullable=True)
    image_url       = Column(String, nullable=True)
    video_url       = Column(String, nullable=True)
    instructions    = Column(Text, nullable=True)
    calories_per_min = Column(Float, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    plan_exercises  = relationship("WorkoutPlanExercise", back_populates="exercise")


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    description     = Column(Text, nullable=True)
    trainer_id      = Column(Integer, ForeignKey("gym_staff.id"), nullable=True)
    duration_weeks  = Column(Integer, nullable=True)
    difficulty      = Column(
        SAEnum(DifficultyLevel, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    goal            = Column(String, nullable=True)   # weight_loss | muscle_gain | endurance | flexibility
    is_template     = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exercises       = relationship("WorkoutPlanExercise", back_populates="plan")
    assignments     = relationship("MemberWorkoutPlan", back_populates="plan")


class WorkoutPlanExercise(Base):
    __tablename__ = "workout_plan_exercises"

    id              = Column(Integer, primary_key=True, index=True)
    plan_id         = Column(Integer, ForeignKey("workout_plans.id"), nullable=False, index=True)
    exercise_id     = Column(Integer, ForeignKey("exercises.id"), nullable=False, index=True)
    day_number      = Column(Integer, nullable=False)   # 1-7 for weekly
    sets            = Column(Integer, nullable=True)
    reps            = Column(String, nullable=True)     # "10-12" or "15"
    rest_seconds    = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    notes           = Column(Text, nullable=True)
    order_index     = Column(Integer, default=0)

    plan            = relationship("WorkoutPlan", back_populates="exercises")
    exercise        = relationship("Exercise", back_populates="plan_exercises")


class MemberWorkoutPlan(Base):
    __tablename__ = "member_workout_plans"

    id              = Column(Integer, primary_key=True, index=True)
    member_id       = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    plan_id         = Column(Integer, ForeignKey("workout_plans.id"), nullable=False, index=True)
    trainer_id      = Column(Integer, ForeignKey("gym_staff.id"), nullable=True)
    start_date      = Column(Date, nullable=False)
    end_date        = Column(Date, nullable=True)
    is_active       = Column(Boolean, default=True)
    trainer_notes   = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    plan            = relationship("WorkoutPlan", back_populates="assignments")


class WorkoutProgress(Base):
    __tablename__ = "workout_progress"

    id              = Column(Integer, primary_key=True, index=True)
    member_id       = Column(Integer, ForeignKey("gym_members.id"), nullable=False, index=True)
    exercise_id     = Column(Integer, ForeignKey("exercises.id"), nullable=False, index=True)
    log_date        = Column(Date, nullable=False, index=True)
    sets_completed  = Column(Integer, nullable=True)
    reps_completed  = Column(String, nullable=True)
    weight_kg       = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    calories_burned = Column(Float, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
