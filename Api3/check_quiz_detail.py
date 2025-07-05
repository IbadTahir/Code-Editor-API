import sqlite3
import json

conn = sqlite3.connect('edu_platform.db')
cursor = conn.cursor()

# Check if quiz_data is actually stored correctly
cursor.execute('SELECT id, title, quiz_data FROM evaluators WHERE id = 1;')
result = cursor.fetchone()

if result:
    print(f'ID: {result[0]}')
    print(f'Title: {result[1]}')
    print(f'Quiz Data (raw): {result[2]}')
    print(f'Quiz Data (type): {type(result[2])}')
    
    if result[2]:
        try:
            parsed_data = json.loads(result[2])
            print(f'Parsed Quiz Data: {parsed_data}')
        except json.JSONDecodeError:
            print('Failed to parse quiz data as JSON')
    else:
        print('Quiz data is None or empty')
else:
    print('No evaluator found with ID 1')

conn.close()
