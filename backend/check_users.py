import sqlite3
from db.database import get_db_connection

conn = get_db_connection()
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT id, email, first_name, last_name, phone_number FROM users")
users = cursor.fetchall()

print("\n--- DATABASE USERS ---")
for user in users:
    print(dict(user))
print("----------------------\n")

conn.close()