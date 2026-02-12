import sqlite3
import os

db_path = 'database.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check alugueis columns
    cursor.execute('PRAGMA table_info(alugueis)')
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'valor_pago' not in columns:
        print("Adding 'valor_pago' column to 'alugueis' table...")
        cursor.execute('ALTER TABLE alugueis ADD COLUMN valor_pago REAL DEFAULT 0.0')
        # Initialize valor_pago with valor_sinal for existing rentals
        cursor.execute('UPDATE alugueis SET valor_pago = valor_sinal')
    
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("Database file not found.")
