#!/usr/bin/env python3
"""Check existing members for missing member codes and backfill if needed."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.models.gym_member import GymMember
from app.services.member_code_service import assign_member_code

def check_and_backfill_member_codes():
    """Check all members for missing member codes and assign them."""
    db = next(get_db())
    
    try:
        # Check total members
        total_members = db.query(GymMember).filter(GymMember.deleted_at.is_(None)).count()
        print(f"Total active members: {total_members}")
        
        # Check members without member_code
        members_without_code = db.query(GymMember).filter(
            GymMember.deleted_at.is_(None),
            (GymMember.member_code.is_(None)) | (GymMember.member_code == '')
        ).all()
        
        print(f"Members without member_code: {len(members_without_code)}")
        
        if members_without_code:
            print("\nAssigning member codes to existing members...")
            for i, member in enumerate(members_without_code, 1):
                try:
                    code = assign_member_code(db, member)
                    db.commit()
                    print(f"{i}. {member.first_name} {member.last_name} -> {code}")
                except Exception as e:
                    db.rollback()
                    print(f"{i}. Failed to assign code to {member.first_name} {member.last_name}: {e}")
        
        # Verify all members have codes now
        remaining = db.query(GymMember).filter(
            GymMember.deleted_at.is_(None),
            (GymMember.member_code.is_(None)) | (GymMember.member_code == '')
        ).count()
        
        print(f"\nMembers still without member_code: {remaining}")
        
        # Show sample of member codes
        sample = db.query(GymMember).filter(GymMember.deleted_at.is_(None)).limit(5).all()
        print("\nSample member codes:")
        for m in sample:
            print(f"  {m.first_name} {m.last_name}: {m.member_code}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_and_backfill_member_codes()
