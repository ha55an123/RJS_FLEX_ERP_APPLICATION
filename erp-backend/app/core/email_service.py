import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_otp_email(to_email: str, otp_code: str):
    subject = "Your Forest ERP Login OTP"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#1e1b4b;margin-bottom:8px">Forest ERP</h2>
      <p style="color:#64748b;margin-bottom:24px">Your one-time password for login:</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#4f46e5">
        {otp_code}
      </div>
      <p style="color:#64748b;margin-top:24px;font-size:13px">This OTP expires in <strong>5 minutes</strong>. Do not share it.</p>
    </div>
    """
    _send(to_email, subject, html)


def send_reset_otp_email(to_email: str, otp_code: str):
    subject = "Forest ERP — Password Reset OTP"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#1e1b4b;margin-bottom:8px">Forest ERP</h2>
      <p style="color:#64748b;margin-bottom:24px">You requested a password reset. Use this OTP:</p>
      <div style="background:#fef2f2;border-radius:8px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#dc2626">
        {otp_code}
      </div>
      <p style="color:#64748b;margin-top:24px;font-size:13px">This OTP expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
    </div>
    """
    _send(to_email, subject, html)


def _send(to_email: str, subject: str, html: str):

    if not settings.SMTP_USER or not settings.SMTP_PASS:
        print(f"[DEV] Email to {to_email} | Subject: {subject} | OTP in html above")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
