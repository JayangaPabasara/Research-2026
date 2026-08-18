# backend/pipeline/question_bank.py

"""
PaddyGuard AI — Follow-up Question Bank
Triggered when classifier confidence is between τ_ood(0.40) and τ_followup(0.70)
Questions are chosen based on the TOP 2 confused classes.
"""

# Structure:
# "ClassA_vs_ClassB" : {
#     "question_en" : English question
#     "question_si" : Sinhala question (spoken by TTS to farmer)
#     "yes_boosts"  : which class gets boosted if farmer says YES
#     "no_boosts"   : which class gets boosted if farmer says NO
#     "boost_amount": how much to shift probability (0.0 to 0.3)
# }

QUESTION_BANK = {

    # ── Bacterial Blight vs Leaf Blast ──────────────────────────────
    "Bacterial Blight_vs_Leaf Blast": [
        {
            "question_en"  : "Are the spots along the leaf edge or margin?",
            "question_si"  : "ලකුණු කොළ ආන්තරේ ද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Leaf Blast",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Is the leaf tip turning yellow or white?",
            "question_si"  : "කොළ ළාව කහ හෝ සුදු වෙනවාද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Leaf Blast",
            "boost_amount" : 0.20
        },
        {
            "question_en"  : "When you cut the stem and put it in water, do you see white liquid?",
            "question_si"  : "ගහේ කද කපලා වතුරේ දැම්මම සුදු දිය ගලනවාද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Leaf Blast",
            "boost_amount" : 0.30
        },
    ],

    # ── Bacterial Blight vs Brown Spot ──────────────────────────────
    "Bacterial Blight_vs_Brown Spot": [
        {
            "question_en"  : "Are the spots like a stripe running along the leaf?",
            "question_si"  : "ලකුණු කොළ දිගේ රේඛාවක් වගේ ද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Brown Spot",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Are there many small round dots scattered all over the leaf?",
            "question_si"  : "කොළ ගාව පොඩි රවුම් ඩොට් ගොඩාක් ඇද්ද?",
            "yes_boosts"   : "Brown Spot",
            "no_boosts"    : "Bacterial Blight",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Is the yellowing starting from the leaf tip?",
            "question_si"  : "කහ පාට ගෑම කොළ ළාවෙන් ආරම්භ වෙනවාද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Brown Spot",
            "boost_amount" : 0.20
        },
    ],

    # ── Leaf Blast vs Brown Spot ─────────────────────────────────────
    "Leaf Blast_vs_Brown Spot": [
        {
            "question_en"  : "Are the spots diamond or spindle shaped?",
            "question_si"  : "ලකුණු ඩයිමන්ඩ් හෝ දිගටි හැඩ ද?",
            "yes_boosts"   : "Leaf Blast",
            "no_boosts"    : "Brown Spot",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Does the center of the spot look grey or ash coloured?",
            "question_si"  : "ලකුණුවල මැද අළු පාටද?",
            "yes_boosts"   : "Leaf Blast",
            "no_boosts"    : "Brown Spot",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Are the spots very small like tiny dots all over the leaf?",
            "question_si"  : "ලකුණු කොළ ගාව ගොඩාක් පොඩිද?",
            "yes_boosts"   : "Brown Spot",
            "no_boosts"    : "Leaf Blast",
            "boost_amount" : 0.20
        },
    ],

    # ── Bacterial Blight vs Healthy ──────────────────────────────────
    "Bacterial Blight_vs_Healthy": [
        {
            "question_en"  : "Do you see any yellow or white marks on the leaf edges?",
            "question_si"  : "කොළ ආන්තරේ කහ හෝ සුදු ලකුණු ඇද්ද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.30
        },
        {
            "question_en"  : "Is the plant growing shorter than normal?",
            "question_si"  : "ශාකය සාමාන්‍යයට වඩා කොටද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.20
        },
        {
            "question_en"  : "Do the roots smell bad?",
            "question_si"  : "මූල ගද ගහනවාද?",
            "yes_boosts"   : "Bacterial Blight",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.25
        },
    ],

    # ── Leaf Blast vs Healthy ────────────────────────────────────────
    "Leaf Blast_vs_Healthy": [
        {
            "question_en"  : "Do you see any spots or lesions on the leaf blade?",
            "question_si"  : "කොළ ගාව ලකුණු ඇද්ද?",
            "yes_boosts"   : "Leaf Blast",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.30
        },
        {
            "question_en"  : "Is the neck of the panicle turning brown or rotting?",
            "question_si"  : "කරල් ගෙල දුඹුරු වෙනවාද?",
            "yes_boosts"   : "Leaf Blast",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.25
        },
        {
            "question_en"  : "Are you growing BG-307 variety paddy?",
            "question_si"  : "ඔයා BG-307 ප්‍රබේදය ගොවි කරනවාද?",
            "yes_boosts"   : "Leaf Blast",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.15
        },
    ],

    # ── Brown Spot vs Healthy ────────────────────────────────────────
    "Brown Spot_vs_Healthy": [
        {
            "question_en"  : "Do you see many small brown or black dots on the leaves?",
            "question_si"  : "කොළ ගාව පොඩි දුඹුරු හෝ කළු ඩොට් ගොඩාක් ඇද්ද?",
            "yes_boosts"   : "Brown Spot",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.30
        },
        {
            "question_en"  : "Are the dots oval or circular in shape?",
            "question_si"  : "ඩොට් රවුම් හෝ ඔවල් හැඩ ද?",
            "yes_boosts"   : "Brown Spot",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.20
        },
        {
            "question_en"  : "Do the spots have a yellow ring around them?",
            "question_si"  : "ලකුණු වටේ කහ වළල්ලක් ඇද්ද?",
            "yes_boosts"   : "Brown Spot",
            "no_boosts"    : "Healthy",
            "boost_amount" : 0.20
        },
    ],
}

# Farmer answer keywords
# These map spoken farmer answers to yes/no
YES_KEYWORDS = [
    "yes", "yeah", "yep", "correct", "right", "true",
    "ow", "owu", "oo", "aan", "haa",           # Sinhala yes variants
    "ඔව්", "ඔවු", "හා", "ඇත", "ඉතින්"
]

NO_KEYWORDS = [
    "no", "nope", "not", "nah", "negative", "wrong",
    "naa", "nehe", "ne",                        # Sinhala no variants
    "නෑ", "නැත", "නෙමෙ", "නොමැත"
]