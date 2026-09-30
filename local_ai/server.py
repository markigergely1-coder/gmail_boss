from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import json
import torch
import os

from model import NeuralNet
from nltk_utils import bag_of_words, tokenize

app = FastAPI()

# Engedélyezzük a CORS-t, hogy a frontend tudjon kommunikálni vele
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Mivel ez lokális, minden engedélyezett
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Modell betöltése
FILE = "data.pth"
if not os.path.exists(FILE):
    print("VIGYÁZAT: data.pth nem található. Futtasd a train.py-t először!")
    
try:
    with open('intents.json', 'r', encoding='utf-8') as json_data:
        intents = json.load(json_data)
        
    data = torch.load(FILE)

    input_size = data["input_size"]
    hidden_size = data["hidden_size"]
    output_size = data["output_size"]
    all_words = data['all_words']
    tags = data['tags']
    model_state = data["model_state"]

    model = NeuralNet(input_size, hidden_size, output_size).to(device)
    model.load_state_dict(model_state)
    model.eval()
    print("Modell sikeresen betöltve!")
except Exception as e:
    print(f"Hiba a modell betöltésekor: {e}")
    model = None

bot_name = "Brain"

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Modell nem lett betöltve. Futtattad a train.py-t?")
        
    sentence = req.message
    sentence = tokenize(sentence)
    X = bag_of_words(sentence, all_words)
    X = X.reshape(1, X.shape[0])
    X = torch.from_numpy(X).to(device)
    
    output = model(X)
    _, predicted = torch.max(output, dim=1)
    
    tag = tags[predicted.item()]
    
    probs = torch.softmax(output, dim=1)
    prob = probs[0][predicted.item()]
    
    if prob.item() > 0.75:
        for intent in intents['intents']:
            if tag == intent["tag"]:
                return {"reply": random.choice(intent['responses'])}
    
    return {"reply": "Ezt sajnos nem értem. Kérlek taníts még!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
