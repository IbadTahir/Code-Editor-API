# Interactive Python Test Script
print("Welcome to the interactive code editor!")

# Get user's name
name = input("What's your name? ")
print(f"Hello, {name}! Nice to meet you.")

# Get user's age
age = input("How old are you? ")
print(f"Wow, {age} years old! That's awesome.")

# Simple calculation
num1 = input("Enter first number: ")
num2 = input("Enter second number: ")

try:
    result = int(num1) + int(num2)
    print(f"The sum of {num1} and {num2} is: {result}")
except ValueError:
    print("Please enter valid numbers!")

print("Thanks for using the interactive code editor!")
