# ==============================================================================
# Medibuddy/backend/models/user_model.py
# ==============================================================================

import sqlite3
from db.database import get_db_connection

class UserModel:
    def get_user_by_email(self, email):
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()

        return dict(user) if user else None

    def create_user(self, email, password, role='patient', first_name='', last_name='', phone_number=''):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (email, password, role, first_name, last_name, phone_number)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (email, password, role, first_name, last_name, phone_number))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return user_id