import sqlite3
import os

db_path = 'database.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Ensure valor_pago exists and is at least valor_sinal
    print("Fixing valor_pago for all rentals...")
    cursor.execute('UPDATE alugueis SET valor_pago = valor_sinal WHERE valor_pago IS NULL OR valor_pago = 0')
    
    # 2. Ensure finalizado rentals are fully paid
    print("Fixing finalized rentals to be fully paid...")
    cursor.execute('UPDATE alugueis SET valor_pago = valor_aluguel WHERE status = "finalizado"')
    
    conn.commit()
    conn.close()
    print("Data repair complete.")
else:
    print("Database not found.")
