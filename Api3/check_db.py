import sqlite3
import os

db_path = 'edu_platform.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print('Tables:', [t[0] for t in tables])
    
    # Check evaluators
    try:
        cursor.execute('SELECT COUNT(*) FROM evaluators;')
        count = cursor.fetchone()[0]
        print(f'Evaluators count: {count}')
        
        if count > 0:
            cursor.execute('SELECT id, title, type, quiz_type FROM evaluators LIMIT 5;')
            evals = cursor.fetchall()
            print('Sample evaluations:', evals)
    except Exception as e:
        print('Error querying evaluators:', e)
    
    # Check submissions
    try:
        cursor.execute('SELECT COUNT(*) FROM submissions;')
        count = cursor.fetchone()[0]
        print(f'Submissions count: {count}')
    except Exception as e:
        print('Error querying submissions:', e)
    
    conn.close()
else:
    print('Database file not found')
