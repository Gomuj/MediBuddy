# ==============================================================================
# Medibuddy/backend/models/doctor_model.py
# ==============================================================================

from db.database import get_db_connection

def fetch_all_doctors():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id AS user_id, first_name, last_name, email, role, phone_number, specialty 
        FROM users 
        WHERE LOWER(role) = 'doctor'
    """)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]