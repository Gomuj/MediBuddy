# ==============================================================================
# Medibuddy/backend/models/access_request_model.py
# ==============================================================================

from db.database import get_db

def create_access_request(appointment_id, doctor_id, patient_id):
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, status FROM access_requests 
            WHERE appointment_id = ? AND doctor_id = ? AND patient_id = ?
        """, (appointment_id, doctor_id, patient_id))
        
        existing = cursor.fetchone()
        if existing:
            return {
                "id": existing["id"],
                "status": existing["status"],
                "already_exists": True
            }
 
        cursor.execute("""
            INSERT INTO access_requests (appointment_id, doctor_id, patient_id, status)
            VALUES (?, ?, ?, 'pending')
        """, (appointment_id, doctor_id, patient_id))
        
        request_id = cursor.lastrowid
        return {
            "id": request_id,
            "status": "pending",
            "already_exists": False
        }

def get_access_requests_by_patient(patient_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT ar.id, ar.appointment_id, ar.status, ar.created_at,
                   u.first_name, u.last_name
            FROM access_requests ar
            JOIN users u ON ar.doctor_id = u.id
            WHERE ar.patient_id = ?
            ORDER BY ar.created_at DESC
        """, (patient_id,))
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_access_requests_by_doctor(doctor_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT ar.id, ar.appointment_id, ar.status, ar.created_at,
                   u.first_name, u.last_name
            FROM access_requests ar
            JOIN users u ON ar.patient_id = u.id
            WHERE ar.doctor_id = ?
            ORDER BY ar.created_at DESC
        """, (doctor_id,))
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def update_access_request_status(request_id, status):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE access_requests
            SET status = ?
            WHERE id = ?
        """, (status, request_id))
        
        return cursor.rowcount > 0

def is_access_approved(doctor_id, patient_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id FROM access_requests
            WHERE doctor_id = ? AND patient_id = ? AND status = 'approved'
        """, (doctor_id, patient_id))
        return cursor.fetchone() is not None