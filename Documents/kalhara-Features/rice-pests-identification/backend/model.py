import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from utils import get_transform
from PIL import Image

# device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 🔥 Load model
model = models.resnet50(weights=None)

model.fc = nn.Sequential(
    nn.Linear(model.fc.in_features, 256),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(256, 5)
)

# load trained weights
model.load_state_dict(torch.load("best_model.pth", map_location=device))

model.to(device)
model.eval()

# 🔥 IMPORTANT: class order (same as training)
classes = [
    "Brown Planthopper",
    "Rice Gall Midge",
    "Rice Hispa",
    "Rice Leaf Folder",
    "Rice Stem Borer"
]

transform = get_transform()

# 🔥 FINAL PREDICT FUNCTION (SMART OOD)
def predict_image(image: Image.Image):
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        probs = F.softmax(outputs, dim=1)

    confidence, predicted = torch.max(probs, 1)

    confidence = confidence.item()
    predicted_class = classes[predicted.item()]

    # 🔥 SMART LOGIC
    if confidence < 0.5:
        return {
            "prediction": "Unknown Pest",
            "confidence": confidence
        }

    elif confidence < 0.7:
        return {
            "prediction": f"Maybe: {predicted_class}",
            "confidence": confidence
        }

    else:
        return {
            "prediction": predicted_class,
            "confidence": confidence
        }