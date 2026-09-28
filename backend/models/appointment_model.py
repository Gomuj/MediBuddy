# ==============================================================================
# Medibuddy/backend/models/appointment_model.py
# ==============================================================================

from datetime import datetime
from db.database import get_db_connection

def expire_pending_appointments(cutoff_time_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE appointments 
        SET status = 'Expired' 
        WHERE LOWER(status) = 'pending' AND created_at <= ?
    """, (cutoff_time_str,))
    updated_rows = cursor.rowcount
    conn.commit()
    conn.close()
    return updated_rows

def create_appointment(patient_id, doctor_id, appointment_date, appointment_time):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute("""
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, created_at)
        VALUES (?, ?, ?, ?, 'Pending', ?)
    """, (patient_id, doctor_id, appointment_date, appointment_time, created_at))
    
    appt_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return appt_id

def get_appointments_by_patient(patient_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, a.status, a.room_name,
               u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, u.specialty
        FROM appointments a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
    """, (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_appointments_by_doctor(doctor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, a.status, a.room_name,
               u.first_name AS patient_first_name, u.last_name AS patient_last_name, u.email AS patient_email
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
    """, (doctor_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_appointment_by_id(appointment_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_appointment_status(appointment_id, status, room_name=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if room_name:
        cursor.execute("UPDATE appointments SET status = ?, room_name = ? WHERE id = ?", (status, room_name, appointment_id))
    else:
        cursor.execute("UPDATE appointments SET status = ? WHERE id = ?", (status, appointment_id))
        
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

def update_appointment_room(appointment_id, room_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE appointments SET room_name = ? WHERE id = ?", (room_name, appointment_id))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated