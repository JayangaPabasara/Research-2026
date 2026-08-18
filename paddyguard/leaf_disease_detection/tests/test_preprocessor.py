from PIL import Image

def test_preprocess_image_shape():
    from pipeline.preprocessor import preprocess_image
    img = Image.new("RGB", (500, 500))
    tensor = preprocess_image(img)
    assert tensor.shape == (1, 3, 300, 300)
