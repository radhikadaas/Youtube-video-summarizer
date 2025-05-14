from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
from transformers import pipeline
import uuid
import os
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Replace this unstable pipeline with a simple question mocker
def generate_mock_questions(text):
    sentences = text.split(". ")
    return [f"What is meant by: '{s.strip()[:30]}...'?" for s in sentences[:5] if len(s.strip()) > 20]

def seconds_to_timestamp(seconds):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02}:{secs:02}"

@app.route("/")
def health():
    return "YouTube Summarizer backend running ✅", 200

@app.route('/api/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    video_id = data.get("videoId")
    length = data.get("length", "medium")

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([entry['text'] for entry in transcript])

        max_chunk_chars = 1000
        chunks = [full_text[i:i + max_chunk_chars] for i in range(0, len(full_text), max_chunk_chars)]

        chunk_summaries = []
        for chunk in chunks[:5]:
            result = summarizer(chunk, max_length=150, min_length=50, do_sample=False)
            chunk_summaries.append(result[0]['summary_text'])

        combined_summary = "\n".join(chunk_summaries)
        keywords = list(set(word.lower() for word in combined_summary.split() if len(word) > 4))[:10]

        highlights = []
        for entry in transcript[::max(1, len(transcript) // 10)]:
            highlights.append({
                "time": seconds_to_timestamp(entry['start']),
                "text": entry['text']
            })

        questions = generate_mock_questions(combined_summary)

        return jsonify({
            "summary": combined_summary,
            "highlights": highlights,
            "keywords": keywords,
            "questions": questions
        })

    except Exception as e:
        return jsonify({"error": "Transcript not available. Try another video."}), 429

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uboktahvhxayffeneyng.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVib2t0YWh2aHhheWZmZW5leW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzAxNTUsImV4cCI6MjA2MjcwNjE1NX0.1FHeluusRaFWJZpGfM1Snn4d-2EECfix_hA1Lgr0nko")

@app.route('/api/feedback', methods=['POST'])
def feedback():
    data = request.get_json()
    payload = {
        "video_id": data.get('videoId'),
        "like_val": data.get('like'),  # <- this is the fix
        "comment": data.get('comment')
    }
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    try:
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/feedback",
            headers=headers,
            json=payload
        )
        res.raise_for_status()
        return jsonify({ "status": "ok" })
    except Exception as e:
        return jsonify({ "error": str(e) }), 500


if __name__ == "__main__":
    app.run(debug=True)
