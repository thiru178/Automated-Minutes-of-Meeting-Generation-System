from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime
import anthropic

app = Flask(__name__)
CORS(app)

# ─── Database Setup ────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect("mom_database.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            meeting_type TEXT,
            participants TEXT,
            agenda TEXT,
            discussion TEXT,
            summary TEXT,
            decisions TEXT,
            action_items TEXT,
            highlights TEXT,
            next_meeting TEXT,
            status TEXT DEFAULT 'done',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# ─── AI Generation ─────────────────────────────────────────────────────────────
def generate_mom_ai(title, date, meeting_type, participants, agenda, discussion):
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    system_prompt = """You are an expert meeting secretary AI. Generate a professional Minutes of Meeting (MoM).
Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "summary": "2-3 sentence meeting summary",
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {"task": "task description", "owner": "person name", "deadline": "date or day", "priority": "high|medium|low"}
  ],
  "highlights": ["key point 1", "key point 2", "key point 3"],
  "nextMeeting": "suggested next meeting note or null"
}"""

    user_msg = f"""Meeting Type: {meeting_type}
Title: {title}
Date: {date}
Participants: {participants}
Agenda: {agenda}
Discussion Notes: {discussion}

Generate the MoM JSON."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_msg}]
    )

    raw = message.content[0].text
    clean = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)

# ─── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/meetings", methods=["GET"])
def get_meetings():
    conn = get_db()
    meetings = conn.execute("SELECT * FROM meetings ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for m in meetings:
        result.append({
            "id": m["id"],
            "title": m["title"],
            "date": m["date"],
            "meeting_type": m["meeting_type"],
            "participants": m["participants"],
            "agenda": m["agenda"],
            "discussion": m["discussion"],
            "summary": m["summary"],
            "decisions": json.loads(m["decisions"] or "[]"),
            "action_items": json.loads(m["action_items"] or "[]"),
            "highlights": json.loads(m["highlights"] or "[]"),
            "next_meeting": m["next_meeting"],
            "status": m["status"],
            "created_at": m["created_at"],
        })
    return jsonify(result)

@app.route("/api/meetings", methods=["POST"])
def create_meeting():
    data = request.json
    title = data.get("title", "")
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    meeting_type = data.get("meeting_type", "Project Discussion")
    participants = data.get("participants", "")
    agenda = data.get("agenda", "")
    discussion = data.get("discussion", "")

    if not title or not participants or not discussion:
        return jsonify({"error": "Title, Participants, and Discussion are required"}), 400

    try:
        mom = generate_mom_ai(title, date, meeting_type, participants, agenda, discussion)
    except Exception as e:
        return jsonify({"error": f"AI generation failed: {str(e)}"}), 500

    conn = get_db()
    conn.execute("""
        INSERT INTO meetings (title, date, meeting_type, participants, agenda, discussion,
            summary, decisions, action_items, highlights, next_meeting, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done')
    """, (
        title, date, meeting_type, participants, agenda, discussion,
        mom.get("summary", ""),
        json.dumps(mom.get("decisions", [])),
        json.dumps(mom.get("actionItems", [])),
        json.dumps(mom.get("highlights", [])),
        mom.get("nextMeeting", ""),
    ))
    conn.commit()
    meeting_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()

    return jsonify({"success": True, "id": meeting_id, "mom": mom}), 201

@app.route("/api/meetings/<int:meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    conn = get_db()
    m = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    conn.close()
    if not m:
        return jsonify({"error": "Meeting not found"}), 404
    return jsonify({
        "id": m["id"], "title": m["title"], "date": m["date"],
        "meeting_type": m["meeting_type"], "participants": m["participants"],
        "agenda": m["agenda"], "discussion": m["discussion"],
        "summary": m["summary"],
        "decisions": json.loads(m["decisions"] or "[]"),
        "action_items": json.loads(m["action_items"] or "[]"),
        "highlights": json.loads(m["highlights"] or "[]"),
        "next_meeting": m["next_meeting"],
        "status": m["status"], "created_at": m["created_at"],
    })

@app.route("/api/meetings/<int:meeting_id>", methods=["DELETE"])
def delete_meeting(meeting_id):
    conn = get_db()
    conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/stats", methods=["GET"])
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM meetings").fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM meetings WHERE status='done'").fetchone()[0]
    all_meetings = conn.execute("SELECT action_items FROM meetings").fetchall()
    conn.close()
    total_tasks = sum(len(json.loads(m["action_items"] or "[]")) for m in all_meetings)
    return jsonify({
        "total_meetings": total,
        "completed": done,
        "pending": total - done,
        "total_tasks": total_tasks,
    })

if __name__ == "__main__":
    init_db()
    print("\n[OK] MoM AI System Running!")
    print("[INFO] Open: http://localhost:5000\n")
    app.run(debug=True, port=5000)
