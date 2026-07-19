import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
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


def _safe_invoice_date_str(invoice) -> str:
    # Prefer invoice.invoice_date if present; fallback to created_at.
    dt = getattr(invoice, "invoice_date", None)
    if dt is None:
        dt = getattr(invoice, "created_at", None)
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return str(dt)


def _resolve_logo_path() -> str | None:
    # Robust path resolution regardless of current working directory.
    # pdf_service.py is at: app/services/pdf_service.py
    # logo is at: app/assets/logo.png
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.abspath(os.path.join(base_dir, "..", "assets", "logo.png"))
    return candidate if os.path.exists(candidate) else None


def generate_invoice_pdf(
    invoice,
    items=None,
    company=None,
    customer=None,
    file_path="invoice.pdf",
):
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

    ###########################################################
    # COMPANY LOGO
    ###########################################################

    logo_path = _resolve_logo_path()
    if logo_path:
        logo = Image(logo_path)
        logo.drawWidth = 45 * mm
        logo.drawHeight = 20 * mm
        story.append(logo)


    ###########################################################
    # COMPANY NAME
    ###########################################################

    title = styles["Title"]
    title.alignment = TA_CENTER

    story.append(Paragraph("<b>FOREST GARMENTS ERP</b>", title))

    story.append(
        Paragraph(
            "Industrial Area Lahore<br/>"
            "Phone: +92-300-1234567<br/>"
            "Email: info@forestgarments.com",
            styles["Normal"],
        )
    )

    # Provide a minimal, safe invoice context object if needed.


    story.append(Spacer(1, 8))

    ###########################################################
    # INVOICE TITLE
    ###########################################################

    story.append(Paragraph("<b>INVOICE</b>", styles["Heading1"]))

    story.append(Spacer(1, 8))

    ###########################################################
    # INVOICE INFORMATION
    ###########################################################

    invoice_table = Table(
        [
            ["Invoice No", getattr(invoice, "invoice_number", "")],
            [
                "Date",
                _safe_invoice_date_str(invoice),
            ],
            [
                "Status",
                getattr(invoice, "status", ""),
            ],
        ],
        colWidths=[45 * mm, 110 * mm],
    )


    invoice_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    story.append(invoice_table)

    story.append(Spacer(1, 12))

    ###########################################################
    # CUSTOMER INFORMATION
    ###########################################################

    if customer:

        story.append(Paragraph("<b>Bill To</b>", styles["Heading2"]))

        customer_table = Table(
            [
                ["Customer", customer.name],
                ["Phone", customer.phone],
                ["Email", customer.email],
                ["Address", customer.address],
            ],
            colWidths=[45 * mm, 110 * mm],
        )

        customer_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )

        story.append(customer_table)

        story.append(Spacer(1, 12))

    ###########################################################
    # PRODUCT TABLE
    ###########################################################

    data = [
        [
            "SKU",
            "Product",
            "Qty",
            "Unit Price",
            "Total",
        ]
    ]

    # If items are not provided, caller can pass invoice.order.items.
    # Our OrderItem model fields: sku, quantity, price.
    if items:
        for item in items:
            sku = getattr(item, "sku", "")
            product_name = getattr(item, "product_name", None) or getattr(item, "name", None) or sku
            quantity = getattr(item, "quantity", 0)
            unit_price = getattr(item, "unit_price", None)
            if unit_price is None:
                unit_price = getattr(item, "price", 0)
            total = getattr(item, "total", None)
            if total is None:
                total = float(unit_price or 0) * float(quantity or 0)

            data.append(
                [
                    sku,
                    product_name,
                    quantity,
                    f"{float(unit_price or 0):,.2f}",
                    f"{float(total or 0):,.2f}",
                ]
            )
    else:
        data.append(["-", "No items available", "-", "-", "-"])


    table = Table(
        data,
        colWidths=[
            25 * mm,
            70 * mm,
            20 * mm,
            35 * mm,
            35 * mm,
        ],
    )

    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0057b7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (2, 1), (-1, -1), "CENTER"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ]
        )
    )

    story.append(table)

    story.append(Spacer(1, 12))

    ###########################################################
    # TOTALS
    ###########################################################

    total_table = Table(
        [
            [
                "",
                "Subtotal",
                Paragraph(f"PKR {invoice.total_amount:,.2f}", styles["Normal"]),
            ],
            [
                "",
                "Tax",
                "0.00",
            ],
            [
                "",
                "Discount",
                "0.00",
            ],
            [
                "",
                Paragraph("<b>Grand Total</b>", styles["Normal"]),
                Paragraph(f"<b>PKR {invoice.total_amount:,.2f}</b>", styles["Normal"]),
            ],
        ],
        colWidths=[90 * mm, 40 * mm, 40 * mm],
    )

    total_table.setStyle(
        TableStyle(
            [
                ("GRID", (1, 0), (-1, -1), 0.4, colors.grey),
                ("BACKGROUND", (1, 3), (-1, 3), colors.HexColor("#d9edf7")),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )

    story.append(total_table)

    story.append(Spacer(1, 20))

    ###########################################################
    # FOOTER
    ###########################################################

    story.append(
        Paragraph(
            "<b>Thank you for your business!</b>",
            styles["Heading3"],
        )
    )

    story.append(
        Paragraph(
            "Generated by Forest ERP",
            styles["Normal"],
        )
    )

    ###########################################################
    # BUILD PDF
    ###########################################################

    doc.build(story)

    return file_path