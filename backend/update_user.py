#===========================================================================================
# DO NOT CHANGE ANYTHING HERE UNLESS YOU NEED TO ALTER THE DATABASE. ASK AREEB BEFORE YOU DO.
#===========================================================================================

import os
from db.database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

for column in ['first_name', 'last_name', 'phone_number', 'specialty']:
    try:
        cursor.execute(f"ALTER TABLE users ADD COLUMN {column} TEXT")
        conn.commit() 
    except Exception:
        pass  

users_to_update = [
    ('John', 'Doe', '1234567890', 'patient@test.com'),
    ('Patrick', 'Jane', '0987654321', 'doctor@test.com'),
    ('Daemon', 'Targaryen', '1122334455', 'admin@test.com')
]

cursor.executemany('''
    UPDATE users 
    SET first_name = ?, last_name = ?, phone_number = ? 
    WHERE email = ?
''', users_to_update)

new_users = [
    ('Teresa', 'Lisbon', 'lisbon@test.com', '1234', '5550192837', 'doctor', 'Cardiologist'),
    ('Kimble', 'Cho', 'cho@test.com', '1234', '5550192838', 'doctor', 'Neurologist')
]

cursor.executemany('''
    INSERT OR IGNORE INTO users (first_name, last_name, email, password, phone_number, role, specialty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
''', new_users)

conn.commit()

cursor.execute("SELECT first_name, last_name, role, phone_number, specialty FROM users WHERE LOWER(role) = 'doctor'")
doctors = cursor.fetchall()

print("Current doctors in DB:")
for doc in doctors:
    print(dict(doc))

conn.close()