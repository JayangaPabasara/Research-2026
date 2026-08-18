"""
Grad-CAM visualization for CNN predictions.
Highlights the image regions that most influenced the classification.
"""
import torch, numpy as np
from PIL import Image
from pipeline.preprocessor import preprocess_image
from pipeline.classifier import _model, _device

_activations = None
_gradients   = None

def _forward_hook(module, input, output):
    global _activations
    _activations = output

def _backward_hook(module, grad_input, grad_output):
    global _gradients
    _gradients = grad_output[0]

def generate_gradcam(pil_image: Image.Image, label_id: int) -> Image.Image:
    """Generate a Grad-CAM heatmap overlay for the given label."""
    target_layer = _model.features[-1]
    fh = target_layer.register_forward_hook(_forward_hook)
    bh = target_layer.register_full_backward_hook(_backward_hook)

    tensor = preprocess_image(pil_image).to(_device)
    tensor.requires_grad_(True)

    logits = _model(tensor)
    _model.zero_grad()
    logits[0, label_id].backward()

    fh.remove()
    bh.remove()

    weights = _gradients.mean(dim=(2, 3), keepdim=True)
    cam     = torch.relu((weights * _activations).sum(dim=1)).squeeze().detach().cpu().numpy()
    cam     = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    heatmap = Image.fromarray(np.uint8(cam * 255)).resize(pil_image.size).convert("L")
    overlay = Image.blend(pil_image.convert("RGB"), heatmap.convert("RGB"), alpha=0.4)
    return overlay
