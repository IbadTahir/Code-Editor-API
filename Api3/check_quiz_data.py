import sqlite3
import json

conn = sqlite3.connect('edu_platform.db')
cursor = conn.cursor()

# Get a detailed view of one quiz with quiz_data
cursor.execute('SELECT id, title, quiz_type, quiz_data FROM evaluators WHERE type = "QUIZ" AND quiz_data IS NOT NULL LIMIT 1;')
quiz = cursor.fetchone()

if quiz:
    print(f'Quiz ID: {quiz[0]}')
    print(f'Title: {quiz[1]}')
    print(f'Quiz Type: {quiz[2]}')
    print(f'Quiz Data: {quiz[3]}')
    
    try:
        quiz_data = json.loads(quiz[3])
        print('\nParsed Quiz Data:')
        if 'questions' in quiz_data:
            for i, q in enumerate(quiz_data['questions']):
                print(f'  Question {i+1}: {q}')
        if 'correct_answers' in quiz_data:
            print(f'  Correct Answers: {quiz_data["correct_answers"]}')
    except json.JSONDecodeError:
        print('  Failed to parse quiz data as JSON')
else:
    print('No quiz with quiz_data found')

conn.close()
