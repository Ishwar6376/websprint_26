import asyncio
import json
import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor

import firebase_admin
from firebase_admin import credentials, db, firestore
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware # ADDED
from faster_whisper import WhisperModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
try:
    if os.getenv("K_SERVICE"): 
        cred = credentials.ApplicationDefault() # Cloud Native Auth
    else:
        cred = credentials.Certificate("serviceAccountKey.json") # Local Auth
        
    firebase_admin.initialize_app(cred, {
        'projectId': 'urbanflow-41ce2', 
        'databaseURL': 'https://urbanflow-41ce2-default-rtdb.firebaseio.com' 
    })
except ValueError:
    pass

fs_db = firestore.client()

@app.get("/")
def read_root():
    return {"status": "Sentinel Active"}



model_name = os.getenv('MODEL_TYPE', 'tiny.en')
cache_path = os.getenv('WHISPER_CACHE_DIR', None)

print(f"🚀 Loading Model: {model_name}...")

model = WhisperModel(model_name, device="cpu", compute_type="int8")
    
print("✅ Sentinel Ready!")

executor = ThreadPoolExecutor(max_workers=4) 

class ConnectionManager:
    def __init__(self):
        self.active_connections = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()
def normalize_audio(audio_bytes):
    audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
    return audio_array / 32768.0
def transcribe_audio(audio_data):
    try:
        segments, info = model.transcribe(
            audio_data, 
            beam_size=5, 
            language="en", 
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500) 
        )
        
        valid_text = []
        for segment in segments:
            if segment.avg_logprob < -1.0: 
                continue 
            text = segment.text.strip().lower()
            hallucinations = [
                "thank you", "subtitles by", "captioned by", 
                "copyright", "audio", "amara.org", "community"
            ]
            if any(h in text for h in hallucinations):
                continue
            if len(text) < 2 and text not in ["no", "go"]:
                continue
                
            valid_text.append(segment.text)

        final_transcript = " ".join(valid_text).strip()
        return final_transcript

    except Exception as e:
        print(f"Transcribe Error: {e}")
        return ""

@app.websocket("/ws/audio/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket)
    try:
        user_doc = fs_db.collection('users').document(user_id).get()
        db_keywords = user_doc.to_dict().get('safetyKeywords', [])

        if not isinstance(db_keywords, list):
            db_keywords = []

        cleaned_keywords = []
        for k in db_keywords:
            clean_word = k.replace('"', '').replace("'", "").strip()
            if clean_word:
                cleaned_keywords.append(clean_word)

        user_keywords = list(set(cleaned_keywords + ["help", "emergency", "save me"]))
        print(f" Active Keywords for {user_id}: {user_keywords}")

    except Exception as e:
        print(f"DB Error (Using defaults): {e}")
        user_keywords = ["help", "emergency", "save me"]

    # 2. Buffer Setup
    CHUNK_LIMIT = 80000 
    audio_buffer = bytearray()

    try:
        while True:
            data = await websocket.receive_bytes()
            audio_buffer.extend(data)

            if len(audio_buffer) >= CHUNK_LIMIT:
                float_audio = normalize_audio(audio_buffer)
                
                # Run AI (Non-blocking)
                loop = asyncio.get_running_loop()
                transcript = await loop.run_in_executor(executor, transcribe_audio, float_audio)
                
                if transcript:
                    print(f"User {user_id}: {transcript}")
                    
                    for word in user_keywords:
                        if word.lower() in transcript.lower():
                            print(f" MATCH: {word}")
                            
                            db.reference(f'women/alerts/{user_id}').set({
                                'type': 'CRITICAL',
                                'source': 'AUDIO_SENTINEL',
                                'keyword': word,
                                'timestamp': {'.sv': 'timestamp'},
                                'status': 'ACTIVE'
                            })
                            
                            await websocket.send_text(json.dumps({"status": "ALERT_TRIGGERED", "keyword": word}))
                            break
                
                overlap = 16000 
                audio_buffer = audio_buffer[-overlap:]

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"User {user_id} disconnected.")
    except Exception as e:
        print(f"Sentinel Error: {e}")
        manager.disconnect(websocket)