from fastapi import FastAPI, UploadFile, HTTPException, File
from datetime import datetime
from diffusers import DiffusionPipeline
import stable_whisper
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
import torch
from pydantic import BaseModel
from elevenlabs import generate, play,set_api_key,save
import soundfile as sf
import json
from typing import Dict
from typing import List, Dict, Any
import webvtt
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from langchain.llms import OpenAI




load_dotenv()

CHUNK_SIZE = os.getenv("CHUNK_SIZE")
XI_API_KEY = os.getenv("XI_API_KEY")
VOICE_ID = os.getenv("VOICE_ID")
IMAGE_CHUNK_SIZE = os.getenv("IMAGE_CHUNK_SIZE")
origin = os.getenv("ORIGIN")
torch_device = os.getenv("TOURCH_DEVICE")

open_ai_key = os.getenv("OPENAI_API_KEY")
llm = OpenAI(openai_api_key=open_ai_key)

CHUNK_SIZE = 1024
XI_API_KEY = "94814ea92158af7989e2bde172377d12"  # replace with your key
VOICE_ID = "PP25Ki5ExjnfHJfyO72Y"  # replace with the voice ID
app = FastAPI()
IMAGE_CHUNK_SIZE = 10

origins = [
    "http://localhost:3000",  # Assuming your frontend runs on localhost:3000
    # Add other origins if needed
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



set_api_key(XI_API_KEY)
# Load the StableDiffusionPipeline
model_id = "runwayml/stable-diffusion-v1-5"
pipe = DiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4")
pipe = pipe.to("mps")
pipe.enable_attention_slicing()


model = stable_whisper.load_model('large')

# Mount the static file directory for FastAPI to serve
app.mount("/audio_transcriptions", StaticFiles(directory="audio_transcriptions"), name="audio_transcriptions")



class TranscriptionInput(BaseModel):
    text: str
    ai_magic: bool = True

def text_to_speech(text: str,timestamp:str) -> str:
    audio = generate(
    
    text=text,
    voice="Bella",
    model='eleven_monolingual_v1'
)
#  save 
    output_filename = f'audio_transcriptions/audio_{timestamp}.mp3'

    save(audio, output_filename)
    return output_filename
    # play(audio)

def vtt_to_lyrics(vtt_file_path: str) -> Dict[str, Any]:
    vtt = webvtt.read(vtt_file_path)

    lyrics = []
    for caption in vtt:
        # Convert time to seconds
        start_time = sum(float(x) * 60 ** i for i, x in enumerate(reversed(caption.start.split(":"))))
        end_timestamp = sum(float(x) * 60 ** i for i, x in enumerate(reversed(caption.end.split(":"))))
        lyrics.append({
            "start": start_time,
            "end": end_timestamp,
            "text": caption.text.strip()
        })

    return {
        "lyrics": lyrics,
        "audioSrc": f'http://localhost:8000/{vtt_file_path.replace(".vtt", ".mp3").replace("/audio.mp3",".mp3")}'
    }


def read_srt(srt_path: str, chunk_size: int) -> List[Dict[str, Any]]:
    vtt_content = webvtt.read(srt_path)

    chunks = []

    for caption in vtt_content:
        text = caption.text  # Get the text from each subtitle
        words = text.split(' ')
        for i in range(0, len(words), chunk_size):  # Break the text into chunks
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append({
                "text": chunk,
                "start": caption.start,
                "end": caption.end
            })
    
    return chunks

def generate_images_for_chunks(chunks: List[Dict[str, Any]], image_folder: str):
    images = []
    images_info = []
    for i, chunk in enumerate(chunks):
        try:
            image = pipe("4k HD Cartoon style for a childrens book" + chunk["text"]).images[0] 
            image_path = f'{image_folder}/image_{i}.png'
            image.save(image_path)
            images.append(image_path)
            images_info.append({
                "path": image_path,
                "start": chunk["start"],
                "end": chunk["end"]
            })
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail="Error generating image.")
    
    # Write image info to json
    with open(f'{image_folder}/image_info.json', 'w') as f:
        json.dump(images_info, f)

    return images

async def ai_maigc(input):
    f = llm.predict(f"Create a short story from ${input}")
    return f


@app.post("/transcribe/")
async def transcribe_audio(input: TranscriptionInput):
    try:
       
        input.text = await ai_maigc(input.text)

        print(input.text)   
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        audio_file_path = text_to_speech(input.text,timestamp)

    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Error reading file.")

    try:
        result = model.transcribe(audio_file_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail="Error transcribing file.")

    directory = f'audio_transcriptions/audio_{timestamp}'
    urls: Dict[str, str] = {}

    try:
        os.makedirs(directory, exist_ok=True)
        result.to_srt_vtt(f'{directory}/audio.vtt')
        result.to_tsv(f'{directory}/audio.tsv')
        urls['vtt'] = f'http://localhost:8000/{directory}/audio.vtt'

    except Exception as e:
        raise HTTPException(status_code=500, detail="Error writing VTT file.")

    try:
        # Read srt and create chunks
        chunks = read_srt(f'{directory}/audio.vtt', CHUNK_SIZE)
        print(chunks)
        
        # Generate images for chunks and save them
        image_folder = f'{directory}/images'
        os.makedirs(image_folder, exist_ok=True)
        images = generate_images_for_chunks(chunks, image_folder)
        urls['images'] = [f'http://localhost:8000/{img}' for img in images]

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Error generating image.")

    urls['audio'] = f'http://localhost:8000/{audio_file_path}'

    with open(f'{directory}/info.json', 'w') as f:
        json.dump(urls, f)

    return {"message": "File transcribed, saved and processed successfully.", "timestamp": timestamp}


@app.get("/retrieve/{timestamp}")
async def retrieve_files(timestamp: str):
    # Define the directory
    directory = f'audio_transcriptions/audio_{timestamp}'

    # Check if the directories exist and prepare the URLs
    urls = {}

    if os.path.exists(f'{directory}/audio.srt'):
        urls['srt'] = f'http://localhost:8000/{directory}/audio.srt'

    # Check for images in the directory
    if os.path.exists(f'{directory}/images'):
        image_files = os.listdir(f'{directory}/images')
        urls['images'] = [f'http://localhost:8000/{directory}/images/{img}' for img in image_files]

    return urls

@app.get("/files/{filename:path}")
async def get_file(filename: str):
    # Make sure filename is secure
    filename = Path(filename).name
    
    # Check if file exists
    if not os.path.isfile(f'audio_transcriptions/{filename}'):
        raise HTTPException(status_code=404, detail="File not found.")
    
    return FileResponse(f'audio_transcriptions/{filename}', media_type='application/octet-stream')

@app.get("/list_files/")
async def list_files():
    root_dir = 'audio_transcriptions'
    files_info = []

    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".json"):
                file_path = os.path.join(root, file)
                with open(file_path, 'r') as json_file:
                    json_info = json.load(json_file)
                files_info.append({"filename": file, "info": json_info})

    return files_info


@app.get("/convert_vtt/{timestamp}")
async def convert_vtt(timestamp: str):
    directory = f'audio_transcriptions/audio_{timestamp}'

    if os.path.exists(f'{directory}/audio.vtt'):
        vtt_file_path = f'{directory}/audio.vtt'
        karaoke_props = vtt_to_lyrics(vtt_file_path)
        
        # Check for images in the directory and add to karaoke_props
        image_directory = f'{directory}/images'
        if os.path.exists(image_directory):
            image_files = os.listdir(image_directory)
            karaoke_props['images'] = [f'http://localhost:8000/{image_directory}/{img}' for img in image_files if img != 'image_info.json']
            
            # Load and add image-to-time mapping
            with open(f'{image_directory}/image_info.json', 'r') as f:
                image_info = json.load(f)
                karaoke_props['image_info'] = [{'start': info['start'], 'end': info['end'], 'path': f"http://localhost:8000/{info['path']}"} for info in image_info]

        return karaoke_props
    else:
        raise HTTPException(status_code=404, detail="VTT file not found.")
