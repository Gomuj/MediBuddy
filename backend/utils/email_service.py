# ==============================================================================
# Medibuddy/backend/utils/email_service.py
# ==============================================================================

import os
import smtplib
from email.mime.text import MIMEText

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", 587))
        self.sender_email = os.environ.get("SENDER_EMAIL", "")
        self.sender_password = os.environ.get("SENDER_PASSWORD", "")

    def send_otp_email(self, to_email: str, otp_code: str) -> bool:
        """
        Generates and sends time-bound OTP to user's email.
        Serves as a helper for the AuthController layer.
        """
        body = (
            f"Hello,\n\n"
            f"Your MediBuddy OTP code is: {otp_code}\n"
            f"This code is valid for 5 minutes only.\n\n"
            f"Thank you!"
        )

        print(f"\n==========================================")
        print(f"[OTP DISPATCH] Email: {to_email} | OTP: {otp_code}")
        print(f"==========================================\n")

        if self.sender_email and self.sender_password:
            try:
                msg = MIMEText(body)
                msg['Subject'] = 'Your MediBuddy Verification Code'
                msg['From'] = self.sender_email
                msg['To'] = to_email

                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, [to_email], msg.as_string())
                return True
            except Exception as e:
                print(f"Failed to send email via SMTP: {e}")
                return False

        return True

def send_otp_email(to_email: str, otp_code: str) -> bool:
    service = EmailService()
    return service.send_otp_email(to_email, otp_code)