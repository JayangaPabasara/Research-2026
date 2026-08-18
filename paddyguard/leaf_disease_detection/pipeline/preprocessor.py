"""Image preprocessing for CNN input."""
from torchvision import transforms

IMAGE_SIZE = 300  # efficientnet_b3 default input resolution

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                          std=[0.229, 0.224, 0.225]),
])

def preprocess_image(pil_image):
    """Resize, tensorize, and normalize a PIL image for CNN inference."""
    return transform(pil_image).unsqueeze(0)
