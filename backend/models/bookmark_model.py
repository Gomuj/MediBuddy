# ==============================================================================
# Medibuddy/backend/models/bookmark_model.py
# ==============================================================================

from db.database import get_db_connection

def is_doctor_bookmarked(patient_id, doctor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM bookmarks WHERE patient_id = ? AND doctor_id = ?", (patient_id, doctor_id))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def add_bookmark_db(patient_id, doctor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO bookmarks (patient_id, doctor_id) VALUES (?, ?)", (patient_id, doctor_id))
    conn.commit()
    conn.close()

def get_bookmarks_by_patient(patient_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.role, u.specialty
        FROM bookmarks b
        JOIN users u ON b.doctor_id = u.id
        WHERE b.patient_id = ?
    """, (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def remove_bookmark_db(patient_id, doctor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookmarks WHERE patient_id = ? AND doctor_id = ?", (patient_id, doctor_id))
    conn.commit()
    conn.close()