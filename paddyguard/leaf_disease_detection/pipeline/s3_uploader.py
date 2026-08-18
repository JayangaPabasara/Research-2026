"""Uploads Grad-CAM heatmap images to S3 and returns a public URL."""
import boto3, io, os, uuid
from PIL import Image

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "paddyguard-images")
AWS_REGION  = os.getenv("AWS_REGION", "ap-south-1")

def upload_gradcam(image: Image.Image, original_filename: str) -> str:
    """Upload a Grad-CAM overlay image to S3 and return its URL."""
    key = f"gradcam/{uuid.uuid4().hex}_{original_filename}"
    try:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)

        s3 = boto3.client("s3", region_name=AWS_REGION)
        s3.upload_fileobj(buffer, BUCKET_NAME, key, ExtraArgs={"ContentType": "image/jpeg"})
        return f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        print(f"[s3_uploader] Upload failed: {e}")
        return None
