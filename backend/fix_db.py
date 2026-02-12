import sqlite3
import os

db_path = 'database.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check alugueis columns
    cursor.execute('PRAGMA table_info(alugueis)')
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'avarias' not in columns:
        print("Adding 'avarias' column to 'alugueis' table...")
        cursor.execute('ALTER TABLE alugueis ADD COLUMN avarias TEXT')
    
    # Check vestidos columns
    cursor.execute('PRAGMA table_info(vestidos)')
    columns = [row[1] for row in cursor.fetchall()]
    # Assuming vestidos is fine, but just in case
    
    conn.commit()
    conn.close()
    print("Database schema synchronization complete.")
else:
    print("Database file not found. Nothing to skip.")
