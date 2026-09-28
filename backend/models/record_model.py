# ==============================================================================
# Medibuddy/backend/models/record_model.py
# ==============================================================================

from db.database import get_db

def save_medical_record(patient_id, file_name, file_path, description):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medical_records (patient_id, file_name, file_path, description) VALUES (?, ?, ?, ?)",
            (patient_id, file_name, file_path, description)
        )

def get_medical_records(patient_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, patient_id, file_name, file_path, description, uploaded_at FROM medical_records WHERE patient_id = ?",
            (patient_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

def get_medical_record_by_id(record_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, file_name, file_path, description FROM medical_records WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def delete_medical_record(record_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medical_records WHERE id = ?", (record_id,))
        return cursor.rowcount > 0

def save_prescription(patient_id, doctor_id, appointment_id, file_name, file_path, notes):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, file_name, file_path, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (patient_id, doctor_id, appointment_id, file_name, file_path, notes))

def get_prescriptions_by_patient(patient_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.file_name, p.notes, p.created_at,
                   u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, u.email AS doctor_email 
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        """, (patient_id,))
        return [dict(row) for row in cursor.fetchall()]