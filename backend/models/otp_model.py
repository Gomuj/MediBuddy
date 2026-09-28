# ==============================================================================
# Medibuddy/backend/models/otp_model.py
# ==============================================================================

from db.database import get_db

class OTPModel:
    def __init__(self):
        self._init_otp_table()

    def _init_otp_table(self):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS otps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    otp_code TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL
                )
            ''')

    def save_otp(self, email, otp_code):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM otps WHERE email = ?", (email,))
            cursor.execute("""
                INSERT INTO otps (email, otp_code, expires_at)
                VALUES (?, ?, datetime('now', '+5 minutes'))
            """, (email, str(otp_code)))

    def verify_otp(self, email, otp_code):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id FROM otps 
                WHERE email = ? AND otp_code = ? AND datetime('now') <= datetime(expires_at)
            """, (email, str(otp_code)))
            record = cursor.fetchone()
            
            if record:
                cursor.execute("DELETE FROM otps WHERE id = ?", (record['id'],))
                return True
            return False