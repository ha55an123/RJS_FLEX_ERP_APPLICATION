#!/usr/bin/env python3
"""Migrate existing member codes from MEM-XXXXXX to RJS-XXXXXX format."""

import sys
import os
import re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.gym_member import GymMember
from app.services.member_code_service import parse_member_sequence, format_member_code, MEMBER_CODE_PREFIX

MEM_PATTERN = re.compile(r"^MEM-(\d{6})$")

def migrate_member_codes():
    """Migrate existing MEM-XXXXXX codes to RJS-XXXXXX format."""
    db = next(get_db())
    
    try:
        # Find all members with MEM- prefix codes
        members_with_mem = db.query(GymMember).filter(
            GymMember.deleted_at.is_(None),
            GymMember.member_code.ilike("MEM-%")
        ).all()
        
        print(f"Found {len(members_with_mem)} members with MEM- prefix codes")
        
        if not members_with_mem:
            print("No migration needed.")
            return
        
        # Get the highest existing RJS sequence number
        rjs_codes = db.query(GymMember.member_code).filter(
            GymMember.member_code.ilike(f"{MEMBER_CODE_PREFIX}-%")
        ).all()
        max_seq = 0
        for (code,) in rjs_codes:
            seq = parse_member_sequence(code)
            if seq is not None:
                max_seq = max(max_seq, seq)
        
        print(f"Current max RJS sequence: {max_seq}")
        
        # Migrate each MEM code to RJS
        for i, member in enumerate(members_with_mem, 1):
            old_code = member.member_code
            mem_match = MEM_PATTERN.match(old_code.strip().upper())
            
            if mem_match:
                mem_seq = int(mem_match.group(1))
                # Use the next available RJS sequence
                max_seq += 1
                new_code = format_member_code(max_seq)
                
                # Update the member
                member.member_code = new_code
                member.barcode = new_code
                member.qr_code = new_code
                
                print(f"{i}. {member.first_name} {member.last_name}: {old_code} -> {new_code}")
            else:
                print(f"{i}. Skipping {member.first_name} {member.last_name}: {old_code} (not MEM format)")
        
        db.commit()
        print(f"\nSuccessfully migrated {len(members_with_mem)} member codes")
        
        # Verify migration
        remaining_mem = db.query(GymMember).filter(
            GymMember.deleted_at.is_(None),
            GymMember.member_code.ilike("MEM-%")
        ).count()
        print(f"Members still with MEM- prefix: {remaining_mem}")
        
        # Show sample of new codes
        sample = db.query(GymMember).filter(GymMember.deleted_at.is_(None)).limit(5).all()
        print("\nSample member codes after migration:")
        for m in sample:
            print(f"  {m.first_name} {m.last_name}: {m.member_code}")
            
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_member_codes()
