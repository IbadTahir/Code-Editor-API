import sqlite3
import json

conn = sqlite3.connect('edu_platform.db')
cursor = conn.cursor()

# Check evaluators table structure
cursor.execute("PRAGMA table_info(evaluators);")
evaluators_columns = cursor.fetchall()
print('Evaluators table structure:')
for col in evaluators_columns:
    print(f'  {col[1]} ({col[2]})')

print('\n' + '='*50 + '\n')

# Get all evaluations with details
cursor.execute('SELECT * FROM evaluators;')
evaluations = cursor.fetchall()
print(f'Found {len(evaluations)} evaluations:')

for eval_data in evaluations:
    print(f'\nID: {eval_data[0]}')
    print(f'Title: {eval_data[1]}')
    print(f'Description: {eval_data[2]}')
    print(f'Type: {eval_data[3]}')
    print(f'Submission Type: {eval_data[4]}')
    print(f'Auto Eval: {eval_data[5]}')
    print(f'Deadline: {eval_data[6]}')
    print(f'Max Attempts: {eval_data[7]}')
    print(f'Quiz Type: {eval_data[8]}')
    print(f'Quiz Data: {eval_data[9]}')
    print(f'Created By: {eval_data[10]}')
    print(f'Created At: {eval_data[11]}')

print('\n' + '='*50 + '\n')

# Check submissions table structure (it might be named differently)
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%submission%';")
submission_tables = cursor.fetchall()
print('Submission-related tables:', [t[0] for t in submission_tables])

if submission_tables:
    table_name = submission_tables[0][0]
    cursor.execute(f"PRAGMA table_info({table_name});")
    submissions_columns = cursor.fetchall()
    print(f'\n{table_name} table structure:')
    for col in submissions_columns:
        print(f'  {col[1]} ({col[2]})')
    
    cursor.execute(f'SELECT COUNT(*) FROM {table_name};')
    count = cursor.fetchone()[0]
    print(f'\n{table_name} count: {count}')
    
    if count > 0:
        cursor.execute(f'SELECT * FROM {table_name} LIMIT 3;')
        submissions = cursor.fetchall()
        print(f'Sample {table_name}:')
        for sub in submissions:
            print(f'  {sub}')

conn.close()
