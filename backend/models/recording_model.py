# ==============================================================================
# Medibuddy/backend/models/recording_model.py
# ==============================================================================

from db.database import get_db_connection

def create_recording(appointment_id, recording_url, created_at_str, expires_at_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO call_recordings (appointment_id, recording_url, created_at, expires_at)
        VALUES (?, ?, ?, ?)
    ''', (appointment_id, recording_url, created_at_str, expires_at_str))
    conn.commit()
    conn.close()

def get_expired_recordings(now_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, recording_url FROM call_recordings WHERE expires_at <= ?', (now_str,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_expired_recordings_db(now_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM call_recordings WHERE expires_at <= ?', (now_str,))
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count

def fetch_latest_recording(appointment_id, now_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT recording_url, expires_at 
        FROM call_recordings 
        WHERE appointment_id = ? AND expires_at > ?
        ORDER BY id DESC LIMIT 1
    ''', (appointment_id, now_str))

    recording = cursor.fetchone()
    conn.close()
    return dict(recording) if recording else None