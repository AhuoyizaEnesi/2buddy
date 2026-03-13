from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)

problems = [
    {
        "subject": "mathematics",
        "title": "Quadratic Equation",
        "description": "Solve for x: 2x^2 - 4x - 6 = 0. Show all your working on the board including the discriminant.",
        "difficulty": "medium"
    },
    {
        "subject": "mathematics",
        "title": "Integration by Parts",
        "description": "Evaluate the integral of x * e^x dx. Use the integration by parts formula and show each step clearly.",
        "difficulty": "hard"
    },
    {
        "subject": "mathematics",
        "title": "Systems of Equations",
        "description": "Solve the system: 3x + 2y = 12 and x - y = 1. Use either substitution or elimination and show your working.",
        "difficulty": "easy"
    },
    {
        "subject": "physics",
        "title": "Projectile Motion",
        "description": "A ball is launched at 30 degrees above the horizontal with an initial speed of 20 m/s. Find the maximum height and the total horizontal range. Use g = 9.8 m/s^2.",
        "difficulty": "medium"
    },
    {
        "subject": "physics",
        "title": "Ohm's Law Circuit",
        "description": "A circuit has a 12V battery with three resistors in series: 2 ohms, 4 ohms, and 6 ohms. Find the total resistance, total current, and voltage drop across each resistor.",
        "difficulty": "easy"
    },
    {
        "subject": "physics",
        "title": "Conservation of Momentum",
        "description": "A 2kg ball moving at 5 m/s collides with a stationary 3kg ball. After collision the 2kg ball moves at 1 m/s. Find the velocity of the 3kg ball after collision.",
        "difficulty": "medium"
    },
    {
        "subject": "computer science",
        "title": "Binary Search",
        "description": "Trace through a binary search on the sorted array [2, 5, 8, 12, 16, 23, 38, 45, 67, 89] looking for the value 23. Show each step including the low, mid, and high indices.",
        "difficulty": "easy"
    },
    {
        "subject": "computer science",
        "title": "Recursion Tree",
        "description": "Draw the recursion tree for fibonacci(5). Label each node with its function call and return value. Count the total number of function calls made.",
        "difficulty": "medium"
    },
    {
        "subject": "computer science",
        "title": "Big O Analysis",
        "description": "Analyze the time complexity of bubble sort. Write out the pseudocode on the board and explain why the worst case is O(n^2) using the nested loop structure.",
        "difficulty": "medium"
    },
    {
        "subject": "chemistry",
        "title": "Balancing Equations",
        "description": "Balance the following chemical equation: Fe + O2 -> Fe2O3. Show your working by counting atoms on each side at each step.",
        "difficulty": "easy"
    },
    {
        "subject": "chemistry",
        "title": "Molar Mass Calculation",
        "description": "Calculate the molar mass of glucose (C6H12O6). Then find how many moles are in 90 grams of glucose. Show all working.",
        "difficulty": "medium"
    },
    {
        "subject": "chemistry",
        "title": "pH Calculation",
        "description": "Calculate the pH of a 0.01 M solution of HCl. Then calculate the pH of a 0.001 M solution of NaOH. Show all steps.",
        "difficulty": "hard"
    }
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(models.Problem).first()
        if existing:
            print("Problems already seeded.")
            return

        for p in problems:
            problem = models.Problem(**p)
            db.add(problem)

        db.commit()
        print(f"Seeded {len(problems)} problems successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()