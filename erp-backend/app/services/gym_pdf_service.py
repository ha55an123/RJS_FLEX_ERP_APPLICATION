"""
Gym-specific PDF report generation service
Adapts the existing PDF infrastructure for gym management reports
"""

import os
from datetime import datetime
from typing import List, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)

styles = getSampleStyleSheet()


def _resolve_logo_path() -> str | None:
    """Resolve path to gym logo"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.abspath(os.path.join(base_dir, "..", "assets", "gym_logo.png"))
    if os.path.exists(candidate):
        return candidate
    # Fallback to existing logo
    candidate = os.path.abspath(os.path.join(base_dir, "..", "assets", "logo.png"))
    return candidate if os.path.exists(candidate) else None


def _build_header(story, gym_name: str = "Gym ERP", gym_address: str = "", gym_phone: str = "", gym_email: str = ""):
    """Build standard gym header for PDF reports"""
    logo_path = _resolve_logo_path()
    if logo_path:
        logo = Image(logo_path)
        logo.drawWidth = 45 * mm
        logo.drawHeight = 20 * mm
        story.append(logo)

    title = styles["Title"]
    title.alignment = TA_CENTER
    story.append(Paragraph(f"<b>{gym_name}</b>", title))

    contact_info = gym_address or "Main Branch, Lahore"
    if gym_phone:
        contact_info += f"<br/>Phone: {gym_phone}"
    else:
        contact_info += "<br/>Phone: +92-300-1234567"
    if gym_email:
        contact_info += f"<br/>Email: {gym_email}"
    else:
        contact_info += "<br/>Email: info@gym.com"

    story.append(Paragraph(contact_info, styles["Normal"]))
    story.append(Spacer(1, 8))


def generate_membership_invoice_pdf(
    member,
    subscription,
    file_path="membership_invoice.pdf",
    gym_name: str = "Gym ERP",
):
    """Generate PDF invoice for membership subscription"""
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    story = []
    _build_header(story, gym_name)

    story.append(Paragraph("<b>MEMBERSHIP INVOICE</b>", styles["Heading1"]))
    story.append(Spacer(1, 8))

    # Invoice details
    invoice_table = Table(
        [
            ["Invoice No", getattr(subscription, "id", "")],
            ["Date", datetime.utcnow().strftime("%Y-%m-%d")],
            ["Status", getattr(subscription, "status", "active")],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    invoice_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(invoice_table)
    story.append(Spacer(1, 12))

    # Member information
    story.append(Paragraph("<b>Bill To</b>", styles["Heading2"]))

    member_table = Table(
        [
            ["Member", f"{member.first_name} {member.last_name}"],
            ["Member Code", getattr(member, "member_code", "")],
            ["Phone", getattr(member, "phone", "")],
            ["Email", getattr(member, "email", "")],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    member_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )

    story.append(member_table)
    story.append(Spacer(1, 12))

    # Subscription details
    data = [
        ["Description", "Details", "Amount"],
        ["Membership Plan", getattr(subscription, "plan_name", "Standard"), f"PKR {getattr(subscription, 'amount', 0):,.2f}"],
        ["Duration", f"{getattr(subscription, 'duration_months', 1)} months", ""],
        ["Start Date", getattr(subscription, "start_date", ""), ""],
        ["End Date", getattr(subscription, "end_date", ""), ""],
    ]

    table = Table(data, colWidths=[70 * mm, 45 * mm, 40 * mm])

    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0057b7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ])
    )

    story.append(table)
    story.append(Spacer(1, 12))

    # Totals
    amount = getattr(subscription, "amount", 0)
    total_table = Table(
        [
            ["", "Subtotal", Paragraph(f"PKR {amount:,.2f}", styles["Normal"])],
            ["", "Tax", "0.00"],
            ["", "Discount", "0.00"],
            ["", Paragraph("<b>Grand Total</b>", styles["Normal"]), Paragraph(f"<b>PKR {amount:,.2f}</b>", styles["Normal"])],
        ],
        colWidths=[90 * mm, 40 * mm, 40 * mm],
    )

    total_table.setStyle(
        TableStyle([
            ("GRID", (1, 0), (-1, -1), 0.4, colors.grey),
            ("BACKGROUND", (1, 3), (-1, 3), colors.HexColor("#d9edf7")),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )

    story.append(total_table)
    story.append(Spacer(1, 20))

    # Non-refundable notice
    non_refundable_style = styles["Heading3"]
    non_refundable_style.alignment = TA_CENTER
    story.append(Paragraph("<b>ALL FUNDS ARE NON REFUNDABLE</b>", non_refundable_style))
    story.append(Spacer(1, 15))

    # Footer
    story.append(Paragraph("<b>Thank you for choosing our gym!</b>", styles["Heading3"]))
    story.append(Paragraph("Generated by Gym ERP", styles["Normal"]))

    doc.build(story)
    return file_path


def generate_attendance_report_pdf(
    attendance_records: List,
    start_date: str,
    end_date: str,
    file_path="attendance_report.pdf",
    gym_name: str = "Gym ERP",
):
    """Generate PDF attendance report for a date range"""
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    story = []
    _build_header(story, gym_name)

    story.append(Paragraph("<b>ATTENDANCE REPORT</b>", styles["Heading1"]))
    story.append(Spacer(1, 8))

    # Report details
    report_table = Table(
        [
            ["Period", f"{start_date} to {end_date}"],
            ["Total Records", str(len(attendance_records))],
            ["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M")],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    report_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )

    story.append(report_table)
    story.append(Spacer(1, 12))

    # Attendance table
    data = [["Date", "Member", "Member Code", "Check In", "Check Out", "Status"]]

    for record in attendance_records:
        data.append([
            getattr(record, "date", ""),
            f"{getattr(record, 'member_first_name', '')} {getattr(record, 'member_last_name', '')}",
            getattr(record, "member_code", ""),
            getattr(record, "check_in_time", ""),
            getattr(record, "check_out_time", "-"),
            getattr(record, "status", "present"),
        ])

    table = Table(data, colWidths=[30 * mm, 50 * mm, 30 * mm, 30 * mm, 30 * mm, 30 * mm])

    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0057b7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ])
    )

    story.append(table)
    story.append(Spacer(1, 20))

    # Footer
    story.append(Paragraph("Generated by Gym ERP", styles["Normal"]))

    doc.build(story)
    return file_path


def generate_payment_receipt_pdf(
    payment,
    member,
    file_path="payment_receipt.pdf",
    gym_name: str = "Gym ERP",
):
    """Generate PDF receipt for payment"""
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    story = []
    _build_header(story, gym_name)

    story.append(Paragraph("<b>PAYMENT RECEIPT</b>", styles["Heading1"]))
    story.append(Spacer(1, 8))

    # Payment details
    payment_table = Table(
        [
            ["Receipt No", f"PAY-{getattr(payment, 'id', '')}"],
            ["Date", getattr(payment, "payment_date", datetime.utcnow().strftime("%Y-%m-%d"))],
            ["Method", getattr(payment, "payment_method", "cash").capitalize()],
            ["Status", getattr(payment, "status", "completed").capitalize()],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    payment_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )

    story.append(payment_table)
    story.append(Spacer(1, 12))

    # Member information
    story.append(Paragraph("<b>Received From</b>", styles["Heading2"]))

    member_table = Table(
        [
            ["Member", f"{member.first_name} {member.last_name}"],
            ["Member Code", getattr(member, "member_code", "")],
            ["Phone", getattr(member, "phone", "")],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    member_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )

    story.append(member_table)
    story.append(Spacer(1, 12))

    # Payment details
    amount = getattr(payment, "amount", 0)
    payment_type = getattr(payment, "payment_type", "membership")

    data = [
        ["Description", "Details", "Amount"],
        [payment_type.capitalize(), getattr(payment, "notes", "Membership payment"), f"PKR {amount:,.2f}"],
    ]

    table = Table(data, colWidths=[70 * mm, 45 * mm, 40 * mm])

    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0057b7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ])
    )

    story.append(table)
    story.append(Spacer(1, 12))

    # Total
    total_table = Table(
        [
            ["", Paragraph("<b>Total Received</b>", styles["Normal"]), Paragraph(f"<b>PKR {amount:,.2f}</b>", styles["Normal"])],
        ],
        colWidths=[90 * mm, 40 * mm, 40 * mm],
    )

    total_table.setStyle(
        TableStyle([
            ("GRID", (1, 0), (-1, -1), 0.4, colors.grey),
            ("BACKGROUND", (1, 0), (-1, -1), colors.HexColor("#d9edf7")),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ])
    )

    story.append(total_table)
    story.append(Spacer(1, 20))

    # Non-refundable notice
    non_refundable_style = styles["Heading3"]
    non_refundable_style.alignment = TA_CENTER
    story.append(Paragraph("<b>ALL FUNDS ARE NON REFUNDABLE</b>", non_refundable_style))
    story.append(Spacer(1, 15))

    # Footer
    story.append(Paragraph("<b>Payment received successfully!</b>", styles["Heading3"]))
    story.append(Paragraph("Generated by Gym ERP", styles["Normal"]))

    doc.build(story)
    return file_path


def generate_workout_progress_pdf(
    member,
    workout_plan,
    progress_records: List,
    file_path="workout_progress.pdf",
    gym_name: str = "Gym ERP",
):
    """Generate PDF report for member workout progress"""
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    story = []
    _build_header(story, gym_name)

    story.append(Paragraph("<b>WORKOUT PROGRESS REPORT</b>", styles["Heading1"]))
    story.append(Spacer(1, 8))

    # Member details
    member_table = Table(
        [
            ["Member", f"{member.first_name} {member.last_name}"],
            ["Member Code", getattr(member, "member_code", "")],
            ["Workout Plan", getattr(workout_plan, "name", "Custom Plan")],
            ["Start Date", getattr(workout_plan, "start_date", "")],
        ],
        colWidths=[45 * mm, 110 * mm],
    )

    member_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )

    story.append(member_table)
    story.append(Spacer(1, 12))

    # Progress table
    data = [["Date", "Exercise", "Sets", "Reps", "Weight (kg)", "Notes"]]

    for record in progress_records:
        data.append([
            getattr(record, "date", ""),
            getattr(record, "exercise_name", ""),
            getattr(record, "sets", ""),
            getattr(record, "reps", ""),
            getattr(record, "weight", ""),
            getattr(record, "notes", ""),
        ])

    table = Table(data, colWidths=[25 * mm, 40 * mm, 20 * mm, 20 * mm, 30 * mm, 35 * mm])

    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0057b7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ])
    )

    story.append(table)
    story.append(Spacer(1, 20))

    # Footer
    story.append(Paragraph("Keep up the great work!", styles["Heading3"]))
    story.append(Paragraph("Generated by Gym ERP", styles["Normal"]))

    doc.build(story)
    return file_path
