# backend/pipeline/dialogue.py

"""
PaddyGuard AI — Dialogue Manager
Manages the follow-up question conversation state.
Max 3 questions per session (from your research proposal).
"""

import logging
import numpy as np
from .question_bank import QUESTION_BANK, YES_KEYWORDS, NO_KEYWORDS
from config import LABEL_MAP, CONFIDENCE_THRESHOLD, OOD_THRESHOLD

logger = logging.getLogger(__name__)

MAX_QUESTIONS = 3   # from your research proposal


class DialogueSession:
    """
    Holds the state for ONE farmer conversation session.
    Created fresh for each new diagnosis request.
    """

    def __init__(self, initial_proba: list, initial_text: str):
        self.proba          = list(initial_proba)      # current class probabilities
        self.initial_text   = initial_text             # original English text
        self.question_count = 0                        # how many questions asked so far
        self.asked_questions = []                      # prevent repeating questions
        self.conversation   = []                       # full Q&A history

    @property
    def confidence(self):
        return max(self.proba)

    @property
    def top_label_id(self):
        return int(np.argmax(self.proba))

    @property
    def top_disease(self):
        return LABEL_MAP[self.top_label_id]

    @property
    def is_resolved(self):
        """True when we are confident enough or exhausted questions."""
        return (
            self.confidence >= CONFIDENCE_THRESHOLD or
            self.question_count >= MAX_QUESTIONS
        )

    def get_top2_pair(self):
        """Return the key for the top 2 confused classes."""
        sorted_ids = sorted(range(4), key=lambda i: self.proba[i], reverse=True)
        d1 = LABEL_MAP[sorted_ids[0]]
        d2 = LABEL_MAP[sorted_ids[1]]
        # Always sort alphabetically so key matches question bank
        pair = "_vs_".join(sorted([d1, d2]))
        return pair

    def get_next_question(self):
        """Pick the next unanswered question for the top 2 confused classes."""
        pair = self.get_top2_pair()
        questions = QUESTION_BANK.get(pair, [])

        for q in questions:
            if q["question_en"] not in self.asked_questions:
                return q
        return None   # no more questions for this pair

    def apply_answer(self, question: dict, answer_text: str):
        """
        Update class probabilities based on farmer's answer.
        """
        answer_lower = answer_text.lower().strip()

        # Detect yes/no from farmer answer
        is_yes = any(kw in answer_lower for kw in YES_KEYWORDS)
        is_no  = any(kw in answer_lower for kw in NO_KEYWORDS)

        if not is_yes and not is_no:
            # Cannot parse — skip this question, don't count it
            logger.warning(f"Could not parse answer: '{answer_text}'")
            return "unclear"

        # Which class gets boosted
        boost_class = question["yes_boosts"] if is_yes else question["no_boosts"]
        boost_amt   = question["boost_amount"]

        # Find the class index to boost
        boost_id = next(
            (i for i, name in LABEL_MAP.items() if name == boost_class), None
        )
        if boost_id is None:
            return "unclear"

        # Boost the winning class, reduce others proportionally
        new_proba = list(self.proba)
        new_proba[boost_id] = min(1.0, new_proba[boost_id] + boost_amt)

        # Renormalise to sum = 1.0
        total = sum(new_proba)
        self.proba = [p / total for p in new_proba]

        # Record this question as asked
        self.asked_questions.append(question["question_en"])
        self.question_count += 1
        self.conversation.append({
            "question_en": question["question_en"],
            "question_si": question["question_si"],
            "answer"     : answer_text,
            "parsed"     : "yes" if is_yes else "no",
            "boosted"    : boost_class
        })

        logger.info(
            f"Q{self.question_count}: '{question['question_en']}' "
            f"→ '{answer_text}' → boosted '{boost_class}' "
            f"→ new confidence: {self.confidence:.3f}"
        )
        return "yes" if is_yes else "no"

    def get_result(self):
        """Return current diagnosis state."""
        return {
            "disease"        : self.top_disease,
            "label_id"       : self.top_label_id,
            "confidence"     : round(self.confidence, 4),
            "confidence_pct" : f"{self.confidence*100:.1f}%",
            "needs_followup" : not self.is_resolved,
            "questions_asked": self.question_count,
            "conversation"   : self.conversation,
            "all_scores"     : {
                LABEL_MAP[i]: round(p, 4)
                for i, p in enumerate(self.proba)
            }
        }