from datetime import date
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.branch import Branch
from app.models.gym_member import GymMember, MemberStatus
from app.models.membership import MembershipPlan, PlanDuration
from app.routers.gym.memberships import (
    SubscriptionCreate,
    create_subscription,
    list_subscriptions,
)


def test_created_subscription_is_committed_and_returned_by_list():
    """Protect the POST → database → GET contract used by MembershipsPage."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    try:
        branch = Branch(name="Main", code="MAIN", is_active=True)
        session.add(branch)
        session.flush()
        member = GymMember(
            member_code="MEM-001",
            branch_id=branch.id,
            first_name="Ada",
            last_name="Lovelace",
            status=MemberStatus.PENDING.value,
        )
        plan = MembershipPlan(
            name="Monthly",
            duration_type=PlanDuration.MONTHLY,
            price=2500,
            joining_fee=500,
            is_active=True,
        )
        session.add_all([member, plan])
        session.commit()

        created = create_subscription(
            SubscriptionCreate(
                member_id=member.id,
                plan_id=plan.id,
                branch_id=branch.id,
                start_date=date(2026, 9, 13),
                payment_status="paid",
            ),
            db=session,
            current_user=SimpleNamespace(id=None),
        )
        listed = list_subscriptions(page=1, page_size=20, db=session, _=None)

        assert created["id"]
        assert created["member_name"] == "Ada Lovelace"
        assert created["plan_name"] == "Monthly"
        assert listed["total"] == 1
        assert listed["items"] == [created]
        assert session.get(GymMember, member.id).status == MemberStatus.ACTIVE.value
    finally:
        session.close()
        Base.metadata.drop_all(engine)
