import argparse
import json
import logging
import os
import shutil
import sys
import time
import requests
from datetime import datetime
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, models, transforms
from pymongo import MongoClient

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

CLASS_NAMES = ["Bacterial_Blight", "Brown_Spot", "Healthy", "Leaf_Blast"]
CLASS_TO_IDX = {name: idx for idx, name in enumerate(CLASS_NAMES)}

def update_job_status(mongodb_uri, job_id, status, error=None, log_tail=None, decision=None):
    try:
        db_name = "paddyguard"
        from urllib.parse import urlparse
        try:
            parsed = urlparse(mongodb_uri)
            if parsed.path and parsed.path.strip("/"):
                db_name = parsed.path.strip("/")
        except Exception:
            pass
            
        client = MongoClient(mongodb_uri)
        db = client[db_name]
        now = datetime.utcnow().isoformat()
        
        updates = {"status": status}
        if status == "TRAINING":
            updates["started_at"] = now
        if status in ["COMPLETED", "FAILED"]:
            updates["completed_at"] = now
        if error:
            updates["error_message"] = error
        if log_tail:
            updates["log_tail"] = log_tail
        if decision:
            updates["decision"] = decision
            
        db["training_jobs"].update_one({"job_id": job_id}, {"$set": updates})
        client.close()
    except Exception as e:
        logger.error(f"Failed to update job status in DB: {e}")

def update_job_metrics(mongodb_uri, job_id, updates_dict):
    try:
        db_name = "paddyguard"
        from urllib.parse import urlparse
        try:
            parsed = urlparse(mongodb_uri)
            if parsed.path and parsed.path.strip("/"):
                db_name = parsed.path.strip("/")
        except Exception:
            pass
            
        client = MongoClient(mongodb_uri)
        db = client[db_name]
        
        db["training_jobs"].update_one({"job_id": job_id}, {"$set": updates_dict})
        client.close()
    except Exception as e:
        logger.error(f"Failed to update job metrics in DB: {e}")

class FineTuneDataset(Dataset):
    def __init__(self, samples, img_dir, transform=None):
        self.samples = samples
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        img_name = sample['image_name']
        label_str = sample['label']
        
        img_path = os.path.join(self.img_dir, img_name)
        image = Image.open(img_path).convert("RGB")
        
        if self.transform:
            image = self.transform(image)
            
        label = CLASS_TO_IDX[label_str]
        return image, label

def get_db_samples(mongodb_uri, job_id):
    db_name = "paddyguard"
    from urllib.parse import urlparse
    try:
        parsed = urlparse(mongodb_uri)
        if parsed.path and parsed.path.strip("/"):
            db_name = parsed.path.strip("/")
    except Exception:
        pass
        
    client = MongoClient(mongodb_uri)
    db = client[db_name]
    cursor = db["prediction_cases"].find({"consumed_by_job_id": job_id})
    
    samples = []
    for doc in cursor:
        samples.append({
            "image_name": doc.get("image_name"),
            "image_url": doc.get("image_url"),
            "label": doc.get("expert_validated_disease")
        })
    client.close()
    return samples

def calculate_metrics(y_true, y_pred):
    """Calculate accuracy and macro F1 using pure numpy"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    accuracy = np.mean(y_true == y_pred)
    
    # Macro F1
    classes = np.unique(np.concatenate((y_true, y_pred)))
    f1_scores = []
    for c in classes:
        tp = np.sum((y_true == c) & (y_pred == c))
        fp = np.sum((y_true != c) & (y_pred == c))
        fn = np.sum((y_true == c) & (y_pred != c))
        
        if tp + fp + fn == 0:
            f1 = 0.0
        else:
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            if precision + recall == 0:
                f1 = 0.0
            else:
                f1 = 2 * (precision * recall) / (precision + recall)
        f1_scores.append(f1)
        
    macro_f1 = np.mean(f1_scores) if f1_scores else 0.0
    return accuracy, macro_f1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--mongodb-uri", required=True)
    parser.add_argument("--test-dir", required=True)
    parser.add_argument("--base-model", required=True)
    parser.add_argument("--epochs", type=int, default=10)
    args = parser.parse_args()

    job_id = args.job_id
    mongodb_uri = args.mongodb_uri
    epochs = args.epochs
    
    logger.info(f"Starting Training Job: {job_id}")
    update_job_status(mongodb_uri, job_id, "PREPARING")
    
    temp_dir = None
    try:
        # 1. Load Data from DB
        samples = get_db_samples(mongodb_uri, job_id)
        if not samples:
            raise ValueError("No samples found for this job ID")
            
        update_job_metrics(mongodb_uri, job_id, {"source_sample_count": len(samples)})
        logger.info(f"Found {len(samples)} training samples")

        # 2. Setup temporary workspace and download Cloudinary images
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        temp_dir = os.path.join(backend_dir, "data", f"temp_training_{job_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        for s in samples:
            img_name = s["image_name"]
            img_url = s.get("image_url")
            local_dest = os.path.join(temp_dir, img_name)
            
            downloaded = False
            if img_url:
                try:
                    logger.info(f"Downloading original training image from Cloudinary: {img_url}")
                    r_img = requests.get(img_url, timeout=20)
                    if r_img.status_code == 200:
                        with open(local_dest, "wb") as f_img:
                            f_img.write(r_img.content)
                        downloaded = True
                except Exception as e:
                    logger.error(f"Cloudinary download failed for {img_name}: {e}")
                    
            if not downloaded:
                # Fallback to local uploads directory (original backups)
                local_backup = os.path.join(backend_dir, "data", "uploads", img_name)
                if os.path.exists(local_backup):
                    logger.info(f"Copying local backup image {img_name} to training workspace")
                    shutil.copy2(local_backup, local_dest)
                else:
                    raise FileNotFoundError(f"Training image {img_name} not found on Cloudinary or locally")

        # 3. Setup transforms
        IMAGE_SIZE = 300
        train_transform = transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        val_transform = transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        train_dataset = FineTuneDataset(samples, temp_dir, train_transform)
        train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True)

        if not os.path.exists(args.test_dir):
            raise FileNotFoundError(f"Test dataset not found at {args.test_dir}")
            
        test_dataset = datasets.ImageFolder(args.test_dir, transform=val_transform)
        test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False)
        logger.info(f"Found {len(test_dataset)} test samples")

        # 4. Load Model
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")
        
        model = models.efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, len(CLASS_NAMES))
        )
        
        logger.info(f"Loading base model: {args.base_model}")
        checkpoint = torch.load(args.base_model, map_location=device)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]
        else:
            state_dict = checkpoint
            
        model.load_state_dict(state_dict)
        model = model.to(device)

        # Evaluate baseline
        update_job_status(mongodb_uri, job_id, "EVALUATING", log_tail="Evaluating baseline model...")
        model.eval()
        all_preds = []
        all_labels = []
        with torch.no_grad():
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                
        base_acc, base_f1 = calculate_metrics(all_labels, all_preds)
        update_job_metrics(mongodb_uri, job_id, {
            "baseline_accuracy": float(base_acc),
            "baseline_macro_f1": float(base_f1)
        })
        logger.info(f"Baseline: Acc={base_acc:.4f}, F1={base_f1:.4f}")

        # 5. Training
        update_job_status(mongodb_uri, job_id, "TRAINING", log_tail="Starting training phase")
        criterion = nn.CrossEntropyLoss()
        
        # Phase 1: Train only head
        for param in model.features.parameters():
            param.requires_grad = False
            
        optimizer = optim.AdamW(model.classifier.parameters(), lr=1e-3)
        warmup_epochs = min(2, epochs)
        
        for epoch in range(warmup_epochs):
            model.train()
            for inputs, labels in train_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
            
            update_job_metrics(mongodb_uri, job_id, {"epochs_completed": epoch + 1})
            logger.info(f"Warmup Epoch {epoch+1}/{warmup_epochs} complete")

        # Phase 2: Train all
        if epochs > warmup_epochs:
            for param in model.features.parameters():
                param.requires_grad = True
                
            optimizer = optim.AdamW(model.parameters(), lr=1e-4)
            scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs-warmup_epochs)
            
            for epoch in range(warmup_epochs, epochs):
                model.train()
                for inputs, labels in train_loader:
                    inputs, labels = inputs.to(device), labels.to(device)
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                scheduler.step()
                update_job_metrics(mongodb_uri, job_id, {"epochs_completed": epoch + 1})
                logger.info(f"Fine-tune Epoch {epoch+1}/{epochs} complete")

        # 6. Evaluate Candidate
        update_job_status(mongodb_uri, job_id, "EVALUATING", log_tail="Evaluating candidate model...")
        model.eval()
        all_preds = []
        all_labels = []
        with torch.no_grad():
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                
        cand_acc, cand_f1 = calculate_metrics(all_labels, all_preds)
        
        # Save candidate checkpoint
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        candidate_name = f"candidate_{timestamp}_{job_id[:8]}.pth"
        candidates_dir = os.path.join(backend_dir, "models", "candidates")
        os.makedirs(candidates_dir, exist_ok=True)
        candidate_path = os.path.join(candidates_dir, candidate_name)
        
        torch.save({"model_state_dict": model.state_dict()}, candidate_path)
        
        acc_delta = cand_acc - base_acc
        f1_delta = cand_f1 - base_f1
        
        is_better = (cand_acc > base_acc) and (cand_f1 >= base_f1)
        decision = "ELIGIBLE_FOR_PROMOTION" if is_better else "REJECTED_BY_METRICS"
        
        update_job_metrics(mongodb_uri, job_id, {
            "candidate_checkpoint": candidate_path,
            "candidate_accuracy": float(cand_acc),
            "candidate_macro_f1": float(cand_f1),
            "accuracy_delta": float(acc_delta),
            "f1_delta": float(f1_delta)
        })
        
        update_job_status(mongodb_uri, job_id, "COMPLETED", log_tail=f"Candidate Acc: {cand_acc:.4f}, F1: {cand_f1:.4f}", decision=decision)
        logger.info(f"Training completed. Decision: {decision}")
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        update_job_status(mongodb_uri, job_id, "FAILED", error=str(e), log_tail=f"Error: {str(e)}")
        sys.exit(1)
        
    finally:
        # Clean up temporary training directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temporary workspace folder: {temp_dir}")
            except Exception as e:
                logger.error(f"Failed to clean temporary workspace: {e}")

if __name__ == "__main__":
    main()
