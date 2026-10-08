import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
import os
import time

from model import NeuralNet
from nltk_utils import bag_of_words, tokenize, stem

app = FastAPI(title="Gmail Boss Neural Net Brain API")

# Engedélyezzük a CORS-t
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
FILE = "data.pth"
INTENTS_FILE = "intents.json"

# Globális állapot
model = None
all_words = []
tags = []
intents_data = {"intents": []}
training_stats = {
    "last_trained": None,
    "last_loss": None,
    "epochs": 1000,
    "patterns_count": 0,
    "tags_count": 0,
    "vocab_size": 0,
    "loss_history": []
}

def load_model_and_intents():
    global model, all_words, tags, intents_data, training_stats
    
    # 1. Intents betöltése
    if os.path.exists(INTENTS_FILE):
        try:
            with open(INTENTS_FILE, 'r', encoding='utf-8') as f:
                intents_data = json.load(f)
        except Exception as e:
            print(f"Hiba az intents.json olvasásakor: {e}")
            intents_data = {"intents": []}
    
    # 2. Modell betöltése
    if os.path.exists(FILE):
        try:
            data = torch.load(FILE, map_location=device)
            input_size = data["input_size"]
            hidden_size = data["hidden_size"]
            output_size = data["output_size"]
            all_words = data['all_words']
            tags = data['tags']
            model_state = data["model_state"]

            model = NeuralNet(input_size, hidden_size, output_size).to(device)
            model.load_state_dict(model_state)
            model.eval()
            print("[OK] PyTorch modell sikeresen betoltve!")
            
            # Statisztikák frissítése
            patterns_count = sum(len(i.get('patterns', [])) for i in intents_data.get('intents', []))
            training_stats["patterns_count"] = patterns_count
            training_stats["tags_count"] = len(tags)
            training_stats["vocab_size"] = len(all_words)
        except Exception as e:
            print(f"Hiba a modell betöltésekor: {e}")
            model = None
    else:
        print("⚠️ data.pth nem található még.")
        model = None

# Kezdeti betöltés szerver indulásakor
load_model_and_intents()

class ChatRequest(BaseModel):
    message: str

class IntentItem(BaseModel):
    tag: str
    patterns: List[str]
    responses: List[str]

class IntentsList(BaseModel):
    intents: List[IntentItem]

@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "device": str(device),
        "training_stats": training_stats
    }

@app.get("/intents")
async def get_intents():
    if os.path.exists(INTENTS_FILE):
        with open(INTENTS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    return {"intents": []}

@app.post("/intents")
async def save_intents(payload: IntentsList):
    global intents_data
    data_dict = payload.model_dump()
    with open(INTENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data_dict, f, ensure_ascii=False, indent=2)
    intents_data = data_dict
    return {"status": "success", "message": "Intents sikeresen mentve!"}

@app.delete("/intents/{tag}")
async def delete_intent(tag: str):
    global intents_data
    filtered = [i for i in intents_data.get('intents', []) if i.get('tag') != tag]
    intents_data['intents'] = filtered
    with open(INTENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(intents_data, f, ensure_ascii=False, indent=2)
    return {"status": "success", "message": f"{tag} törölve!"}

@app.post("/train")
async def train_model():
    """
    Újratanítja a PyTorch hálózatot a meglévő intents.json-ból,
    és automatikusan frissíti a futó modellt a memóriában.
    """
    global training_stats
    if not os.path.exists(INTENTS_FILE):
        raise HTTPException(status_code=400, detail="intents.json nem található!")

    with open(INTENTS_FILE, 'r', encoding='utf-8') as f:
        current_intents = json.load(f)

    all_w = []
    t_list = []
    xy = []

    for intent in current_intents['intents']:
        tag = intent['tag']
        t_list.append(tag)
        for pattern in intent['patterns']:
            w = tokenize(pattern)
            all_w.extend(w)
            xy.append((w, tag))

    ignore_words = ['?', '!', '.', ',']
    all_w = [stem(w) for w in all_w if w not in ignore_words]
    all_w = sorted(set(all_w))
    t_list = sorted(set(t_list))

    if len(xy) == 0:
        raise HTTPException(status_code=400, detail="Nincsenek tanítási minták az intents.json-ban!")

    X_train = []
    y_train = []
    for (pattern_sentence, tag) in xy:
        bag = bag_of_words(pattern_sentence, all_w)
        X_train.append(bag)
        label = t_list.index(tag)
        y_train.append(label)

    X_train = np.array(X_train)
    y_train = np.array(y_train)

    # Paraméterek
    num_epochs = 1000
    batch_size = min(8, len(X_train))
    learning_rate = 0.001
    input_size = len(X_train[0])
    hidden_size = 8
    output_size = len(t_list)

    class FastDataset(Dataset):
        def __init__(self):
            self.n_samples = len(X_train)
            self.x_data = X_train
            self.y_data = y_train
        def __getitem__(self, index):
            return self.x_data[index], self.y_data[index]
        def __len__(self):
            return self.n_samples

    dataset = FastDataset()
    train_loader = DataLoader(dataset=dataset, batch_size=batch_size, shuffle=True, num_workers=0)

    train_model_instance = NeuralNet(input_size, hidden_size, output_size).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(train_model_instance.parameters(), lr=learning_rate)

    loss_history = []
    start_time = time.time()

    for epoch in range(num_epochs):
        for (words, labels) in train_loader:
            words = words.to(device)
            labels = labels.to(dtype=torch.long).to(device)
            
            outputs = train_model_instance(words)
            loss = criterion(outputs, labels)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
        if (epoch + 1) % 50 == 0:
            loss_history.append({
                "epoch": epoch + 1,
                "loss": round(float(loss.item()), 5)
            })

    duration = round(time.time() - start_time, 2)
    final_loss = round(float(loss.item()), 5)

    save_data = {
        "model_state": train_model_instance.state_dict(),
        "input_size": input_size,
        "hidden_size": hidden_size,
        "output_size": output_size,
        "all_words": all_w,
        "tags": t_list
    }
    torch.save(save_data, FILE)

    # Frissítjük a memóriában lévő modellt
    load_model_and_intents()

    training_stats = {
        "last_trained": time.strftime("%Y-%m-%d %H:%M:%S"),
        "last_loss": final_loss,
        "epochs": num_epochs,
        "patterns_count": len(xy),
        "tags_count": len(t_list),
        "vocab_size": len(all_w),
        "duration_seconds": duration,
        "loss_history": loss_history
    }

    return {
        "status": "success",
        "message": f"Modell sikeresen betanítva {duration} másodperc alatt!",
        "stats": training_stats
    }

@app.post("/chat")
async def chat(req: ChatRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Modell nem lett betöltve. Futtass tanítást először!")
        
    sentence = req.message
    tokens = tokenize(sentence)
    X = bag_of_words(tokens, all_words)
    X = X.reshape(1, X.shape[0])
    X = torch.from_numpy(X).to(device)
    
    output = model(X)
    _, predicted = torch.max(output, dim=1)
    
    tag = tags[predicted.item()]
    
    probs = torch.softmax(output, dim=1)
    prob = probs[0][predicted.item()].item()
    
    confidence_pct = round(prob * 100, 1)
    
    if prob > 0.65:
        for intent in intents_data.get('intents', []):
            if tag == intent["tag"]:
                return {
                    "reply": random.choice(intent['responses']),
                    "tag": tag,
                    "confidence": confidence_pct
                }
    
    return {
        "reply": "Ezt sajnos még nem tanultam meg biztosan. Bővítsd az adatbázisomat a Tanító Stúdióban, majd kattints az 'Újratanítás' gombra!",
        "tag": "unknown",
        "confidence": confidence_pct
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
