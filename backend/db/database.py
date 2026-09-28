import sqlite3
import os
from contextlib import contextmanager

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, 'medibuddy.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    """Context manager to ensure connections are safely committed, rolled back on error, and closed."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin')),
                first_name TEXT,
                last_name TEXT,
                phone_number TEXT,
                specialty TEXT DEFAULT 'General Practitioner'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS medical_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                description TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(patient_id) REFERENCES users(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(patient_id) REFERENCES users(id),
                FOREIGN KEY(doctor_id) REFERENCES users(id),
                UNIQUE(patient_id, doctor_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                room_name TEXT,
                FOREIGN KEY(patient_id) REFERENCES users(id),
                FOREIGN KEY(doctor_id) REFERENCES users(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS call_recordings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                recording_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY(appointment_id) REFERENCES appointments(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                patient_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(appointment_id) REFERENCES appointments(id),
                FOREIGN KEY(doctor_id) REFERENCES users(id),
                FOREIGN KEY(patient_id) REFERENCES users(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prescriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_id INTEGER,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(patient_id) REFERENCES users(id),
                FOREIGN KEY(doctor_id) REFERENCES users(id),
                FOREIGN KEY(appointment_id) REFERENCES appointments(id)
            )
        ''')

        for col in ['first_name', 'last_name', 'phone_number', 'specialty']:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                pass

        for col in ['created_at', 'room_name']:
            try:
                cursor.execute(f"ALTER TABLE appointments ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                pass

        cursor.execute("INSERT OR IGNORE INTO users (email, password, role, first_name, last_name, phone_number, specialty) VALUES ('patient@test.com', '1234', 'patient', 'John', 'Doe', '1234567890', NULL)")
        cursor.execute("INSERT OR IGNORE INTO users (email, password, role, first_name, last_name, phone_number, specialty) VALUES ('doctor@test.com', '1234', 'doctor', 'Patrick', 'Jane', '0987654321', 'General Practitioner')")
        cursor.execute("INSERT OR IGNORE INTO users (email, password, role, first_name, last_name, phone_number, specialty) VALUES ('admin@test.com', '1234', 'admin', 'System', 'Admin', '1122334455', NULL)")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)