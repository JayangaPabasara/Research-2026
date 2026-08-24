"""
OOD Detection Module — v4.1 (5-Signal Mechanism)
Prevents non-disease inputs from being misclassified.

Signal 1: Text length gate      (< 3 words -> OOD)
Signal 2: Blocklist check       (non-disease topic words)
Signal 3: Vocabulary check      (< 2 symptom words AND no strong bigram)
Signal 4: Confidence + Entropy  (< 0.50 or entropy > 1.20)
Signal 5: Margin check          (top1 - top2 < 0.10)

v4.1 changes:
- OOD_THRESHOLD lowered 0.75 → 0.50 (Brown Spot short descriptions ~56% conf)
- FOLLOWUP_THRESHOLD lowered 0.85 → 0.75
- ENTROPY_THRESHOLD raised 0.90 → 1.20 (short sentences naturally uncertain)
- MARGIN_THRESHOLD lowered 0.20 → 0.10 (BS vs LB gap is real but narrow)
- Added Brown Spot bigrams: "brown spots", "small spots", "many spots"
"""
import re

# ── Thresholds ────────────────────────────────────────────────────────
OOD_THRESHOLD      = 0.50
FOLLOWUP_THRESHOLD = 0.75
ENTROPY_THRESHOLD  = 1.20
MARGIN_THRESHOLD   = 0.10
MIN_TEXT_WORDS     = 3
MIN_SYMPTOM_WORDS  = 2

# ── Symptom vocabulary (120+ terms) ───────────────────────────────────
SYMPTOM_VOCABULARY = set([
    "leaf","leaves","paddy","rice","plant","stem","blade","margin","vein",
    "tip","node","neck","collar","sheath","panicle","grain","glume",
    "spikelet","tiller","seedling","coleoptile","internode","root","shoot",
    "blast","blight","brown","kresek","lesion","lesions","bacterial",
    "fungal","infection","disease","symptom","spot","spots","stripe",
    "yellow","yellowing","grey","gray","white","orange","straw","pale",
    "dark","discoloration","necrotic","necrosis","chlorosis","mottling",
    "oval","circular","round","diamond","spindle","elliptical","oblong",
    "wavy","halo","border","center","ring","pointed","elongated","fusiform",
    "ooze","oozing","turbid","milky","droplets","exudate","watersoaked",
    "wilting","wilt","rolled","coalesce","coalescing","magnaporthe",
    "bipolaris","pecky","brownish","scattered","dense","numerous","visible",
    "appearing","spreading","progressing","advancing","dying","dead",
    "dried","drying","rotting","distorted","curled","bent","drooping",
    "crop","field","nursery","transplant","tillering","booting","heading",
    "ripening","irrigated","lowland","upland","rainfed","flooded",
    "unflooded","silicon","nitrogen","fertilizer","goyam","kola",
    "pithu","pala","kiribath",
    # Brown Spot descriptors farmers commonly use
    "small","many","dot","dots","mark","marks","speck","specks",
    "surface","patch","patches","numerous","covered","all","over",
])

# ── Blocklist ─────────────────────────────────────────────────────────
BLOCKLIST = set([
    "going","home","bus","road","car","drive","walk","travel","market",
    "shop","store","buy","sell","child","children","mother","father",
    "family","friend","person","people","man","woman","boy","girl","baby",
    "sick","fever","pain","back","head","doctor","hospital","weather",
    "hot","cold","sun","wind","cloud","hello","morning","afternoon",
    "evening","goodbye","thanks","testing","microphone","okay","fine",
    "phone","battery","school","class","election","mountain","coconut",
    "banana","mango","sugarcane","tea","rubber","coming","eating",
    "drinking","sleeping","working","directions","festival","river",
    "broken","late",
])

# ── Strong disease bigrams ─────────────────────────────────────────────
STRONG_BIGRAMS = [
    # Existing
    "leaf spot","leaf blast","brown spot","bacterial blight","leaf margin",
    "yellow stripe","grey lesion","gray lesion","oval lesion","brown lesion",
    "diamond shaped","spindle shaped","water soaked","yellow halo",
    "milky ooze","leaf sheath","paddy leaf","rice leaf","leaf blade",
    "leaf tip","grain discoloration","paddy disease","rice disease",
    "kresek symptom","milky rice","milk rice",
    # Brown Spot additions
    "brown spots","small spots","small brown","many spots","dark spots",
    "round spots","circular spots","spots appearing","spots spreading",
    "numerous spots","scattered spots","oval spots","brown marks",
]


def check_strong_bigram(text: str) -> bool:
    t = text.lower()
    return any(bg in t for bg in STRONG_BIGRAMS)

def count_symptom_words(text: str) -> int:
    words = set(re.sub(r"[^\w\s]", " ", text.lower()).split())
    return len(words & SYMPTOM_VOCABULARY)

def count_blocklist_words(text: str) -> int:
    words = set(re.sub(r"[^\w\s]", " ", text.lower()).split())
    return len(words & BLOCKLIST)