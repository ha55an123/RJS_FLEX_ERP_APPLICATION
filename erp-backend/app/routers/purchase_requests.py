from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
import io, csv, os, shutil, uuid

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user, require_role
from app.models.accounting import PurchaseRequest
from app.models.user import User, UserRole
from app.schemas.accounting import PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestAction, PurchaseRequestOut

router = APIRouter(prefix="/purchase-requests", tags=["Purchase Requests"])

ADMIN_MANAGER = ["admin", "company_manager"]
ALL_ROLES = ["admin", "company_manager", "outlet_staff"]
UPLOAD_DIR = "uploads/purchase_requests"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _next_number(db: Session) -> str:
    count = db.query(func.count(PurchaseRequest.id)).scalar() or 0
    return f"PR-{count + 1:05d}"


def _enrich(pr: PurchaseRequest) -> dict:
    d = {c.name: getattr(pr, c.name) for c in pr.__table__.columns}
    emp = pr.employee
    d["employee_name"] = emp.username if emp else None
    return d


@router.get("/summary")
def pr_summary(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    pending = db.query(func.count(PurchaseRequest.id)).filter(PurchaseRequest.status == "Pending").scalar() or 0
    approved = db.query(func.count(PurchaseRequest.id)).filter(PurchaseRequest.status == "Admin Approved").scalar() or 0
    rejected = db.query(func.count(PurchaseRequest.id)).filter(PurchaseRequest.status == "Rejected").scalar() or 0
    return {"pending": pending, "approved": approved, "rejected": rejected}


@router.get("/")
def list_requests(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(PurchaseRequest)
    # Employees only see their own requests
    if user.role == UserRole.OUTLET_STAFF:
        q = q.filter(PurchaseRequest.employee_id == user.id)
    if status:
        q = q.filter(PurchaseRequest.status == status)
    if priority:
        q = q.filter(PurchaseRequest.priority == priority)
    if department:
        q = q.filter(PurchaseRequest.department == department)
    if search:
        q = q.filter(PurchaseRequest.item_name.ilike(f"%{search}%"))
    requests = q.order_by(PurchaseRequest.id.desc()).offset(skip).limit(limit).all()
    return [_enrich(r) for r in requests]


@router.post("/")
def create_request(
    data: PurchaseRequestCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pr = PurchaseRequest(
        **data.model_dump(),
        request_number=_next_number(db),
        employee_id=user.id,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return _enrich(pr)


@router.get("/{pr_id}")
def get_request(pr_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if user.role == UserRole.OUTLET_STAFF and pr.employee_id != user.id:
        raise HTTPException(403, "Access denied")
    return _enrich(pr)


@router.put("/{pr_id}")
def update_request(
    pr_id: int,
    data: PurchaseRequestUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if user.role == UserRole.OUTLET_STAFF:
        if pr.employee_id != user.id:
            raise HTTPException(403, "Access denied")
        if pr.status != "Pending":
            raise HTTPException(400, "Cannot edit an approved/rejected request")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(pr, k, v)
    db.commit()
    db.refresh(pr)
    return _enrich(pr)


@router.post("/{pr_id}/manager-approve")
def manager_approve(
    pr_id: int,
    body: PurchaseRequestAction,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if pr.status != "Pending":
        raise HTTPException(400, f"Cannot approve a {pr.status} request")
    pr.status = "Manager Approved"
    pr.manager_comments = body.comments
    db.commit()
    return {"message": "Manager approved"}


@router.post("/{pr_id}/admin-approve")
def admin_approve(
    pr_id: int,
    body: PurchaseRequestAction,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if pr.status != "Manager Approved":
        raise HTTPException(400, "Request must be manager-approved first")
    pr.status = "Admin Approved"
    pr.admin_comments = body.comments
    pr.approved_date = date.today()
    db.commit()
    return {"message": "Admin approved"}


@router.post("/{pr_id}/reject")
def reject_request(
    pr_id: int,
    body: PurchaseRequestAction,
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if pr.status in ("Rejected", "Cancelled", "Purchased"):
        raise HTTPException(400, f"Cannot reject a {pr.status} request")
    pr.status = "Rejected"
    pr.admin_comments = body.comments
    db.commit()
    return {"message": "Request rejected"}


@router.post("/{pr_id}/cancel")
def cancel_request(
    pr_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if user.role == UserRole.OUTLET_STAFF and pr.employee_id != user.id:
        raise HTTPException(403, "Access denied")
    if pr.status not in ("Pending",):
        raise HTTPException(400, "Only pending requests can be cancelled")
    pr.status = "Cancelled"
    db.commit()
    return {"message": "Request cancelled"}


@router.delete("/{pr_id}")
def delete_request(
    pr_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    db.delete(pr)
    db.commit()
    return {"message": "Request deleted"}


@router.post("/{pr_id}/upload")
def upload_attachment(
    pr_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(404, "Request not found")
    if user.role == UserRole.OUTLET_STAFF and pr.employee_id != user.id:
        raise HTTPException(403, "Access denied")
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    pr.attachment = path
    db.commit()
    return {"attachment": path}


@router.get("/export/csv")
def export_requests_csv(
    db: Session = Depends(get_db),
    _=Depends(require_role(ADMIN_MANAGER)),
):
    requests = db.query(PurchaseRequest).order_by(PurchaseRequest.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Number", "Item", "Qty", "Est. Price", "Priority", "Status", "Department", "Request Date", "Required Date"])
    for r in requests:
        writer.writerow([r.request_number, r.item_name, r.quantity, r.estimated_price or "",
                         r.priority, r.status, r.department or "", r.request_date, r.required_date or ""])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=purchase_requests.csv"},
    )
