"""Adaptive follow-up question logic for low-confidence diagnoses."""

FOLLOWUP_QUESTIONS = {
    "Bacterial Blight": [
        "Are the leaf margins turning yellow or developing wavy yellow stripes?",
        "Can you see milky drops on the lesion early in the morning?",
        "Have the seedlings wilted suddenly with grayish-green rolled leaves?",
    ],
    "Leaf Blast": [
        "Do the spots have a diamond or spindle shape, pointed at both ends?",
        "Are the spots gray or white in the center with a brown or red border?",
        "Have the spots appeared after a cool or rainy period?",
    ],
    "Brown Spot": [
        "Are the spots round or oval with a brownish color and a yellow ring?",
        "Is the soil in your field nutrient-deficient or unflooded?",
        "Are the grains discolored or showing spotting?",
    ],
}

def get_followup_question(disease_prediction: str, question_index: int = 0) -> str:
    questions = FOLLOWUP_QUESTIONS.get(disease_prediction, [
        "Can you describe more symptoms of your paddy plant?"
    ])
    return questions[min(question_index, len(questions) - 1)]
