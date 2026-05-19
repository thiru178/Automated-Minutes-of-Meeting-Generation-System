# 🏆 MoM AI System 
## Automated Minutes of Meeting Generation System
MoM AI System is a smart web application that automatically generates structured Minutes of Meeting (MoM) from raw discussion notes using AI. It simplifies documentation, saves time, and improves meeting productivity.


---

## 📁 Project Structure

```
mom_system/
├── app.py                  ← Flask Backend (API + Database)
├── requirements.txt        ← Python Dependencies
├── mom_database.db         ← SQLite Database (auto-created)
├── templates/
│   └── index.html          ← Frontend HTML
└── static/
    ├── css/
    │   └── style.css       ← Styles
    └── js/
        └── app.js          ← Frontend JavaScript
```

---

## ⚙️ Setup Instructions

### Step 1 — Install Python packages
```bash
pip install -r requirements.txt
```

### Step 2 — Set your Anthropic API Key

**Windows:**
```cmd
set ANTHROPIC_API_KEY=your_api_key_here
```

**Mac/Linux:**
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### Step 3 — Run the app
```bash
python app.py
```

### Step 4 — Open in browser
```
http://localhost:5000
```

---

## 🚀 How to Use

1. Click **"+ New Meeting"**
2. Fill: Title, Date, Participants, Discussion Notes
3. Click **"⭐ Generate MoM"** — AI processes in seconds
4. View the full MoM → Export as .txt file
5. Check **Dashboard** for stats
6. Check **Tasks** tab for all action items

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend | Python Flask |
| AI Engine | Anthropic Claude (NLP) |
| Database | SQLite |
| API | REST API |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | Get all meetings |
| POST | `/api/meetings` | Create + AI generate MoM |
| GET | `/api/meetings/<id>` | Get one meeting |
| DELETE | `/api/meetings/<id>` | Delete meeting |
| GET | `/api/stats` | Dashboard statistics |

---

