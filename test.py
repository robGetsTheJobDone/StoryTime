import webvtt
from datetime import datetime, timedelta
import re

def timestamp_to_seconds(timestamp):
    h, m, s = map(float, timestamp.split(':'))
    return timedelta(hours=h, minutes=m, seconds=s).total_seconds()

# Parse VTT file
vtt = webvtt.read('/Users/robertseares/mommyandme/audio_transcriptions/audio_20230708224317/audio.vtt')

# Define the maximum duration for each chunk (in seconds)
max_duration = 1  # example value

# Initialize variables
chunks = []
current_chunk = ''
current_start_time = None

for caption in vtt:
    print(caption)
    # Extract the words and their timestamps
    words_and_timestamps = re.findall(r'(\S+)<(\S+)>', caption.text.strip())
    
    for word, timestamp in words_and_timestamps:
        time_in_seconds = timestamp_to_seconds(timestamp)

        if current_start_time is None:
            current_start_time = time_in_seconds

        # Add the word to the current_chunk
        current_chunk += ' ' + word

        # Check if adding the next word would exceed the max_duration
        if (time_in_seconds - current_start_time) > max_duration:
            # If it would, add the current_chunk to chunks and start a new chunk
            chunks.append(current_chunk)
            current_chunk = ''
            current_start_time = time_in_seconds

# Don't forget to add the last chunk
if current_chunk:
    chunks.append(current_chunk.strip())

# Print chunks
for i, chunk in enumerate(chunks, 1):
    print(f'Chunk {i}: {chunk}\n')
