# ==============================================================================
# Medibuddy/backend/controllers/auth_controller.py
# ==============================================================================

import random
from models.user_model import UserModel
from models.otp_model import OTPModel
from utils.email_service import send_otp_email

class AuthController:
    def __init__(self):
        self.user_model = UserModel()
        self.otp_model = OTPModel()

    def login(self, email, password):
        user = self.user_model.get_user_by_email(email)
        if not user or user.get('password') != password:
            return {"status": "error", "message": "Invalid email or password"}, 401

        first_name = user.get('first_name') or ''
        last_name = user.get('last_name') or ''
        full_name = f"{first_name} {last_name}".strip()

        return {
            "status": "success",
            "user": {
                "id": user.get('id'),
                "email": user.get('email'),
                "role": user.get('role'),
                "first_name": first_name,
                "last_name": last_name,
                "name": full_name
            }
        }, 200

    def send_otp(self, email):
        if not email:
            return {"status": "error", "message": "Email is required"}, 400

        otp_code = f"{random.randint(100000, 999999)}"
        self.otp_model.save_otp(email, otp_code)
        
        send_otp_email(email, otp_code)
        return {"status": "success", "message": "OTP sent to email. Valid for 5 minutes."}, 200

    def signup(self, data):
        email = data.get('email')
        otp_code = data.get('otp')
        password = data.get('password')

        role = 'patient'
        
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        phone_number = data.get('phone_number', '')

        if not email or not password or not otp_code:
            return {"status": "error", "message": "Missing email, password, or OTP code"}, 400

        is_valid = self.otp_model.verify_otp(email, otp_code)
        if not is_valid:
            return {"status": "error", "message": "Invalid or expired OTP code (5-minute limit)"}, 400

        existing_user = self.user_model.get_user_by_email(email)
        if existing_user:
            return {"status": "error", "message": "Email is already registered"}, 400

        user_id = self.user_model.create_user(
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number
        )

        return {
            "status": "success",
            "user": {
                "id": user_id,
                "email": email,
                "role": role,
                "first_name": first_name,
                "last_name": last_name,
                "name": f"{first_name} {last_name}".strip()
            }
        }, 201