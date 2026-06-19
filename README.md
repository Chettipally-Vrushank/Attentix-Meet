# NexusMeet 🚀

**AI-Powered Video Conferencing Platform with Real-Time Engagement Analytics & Automated Moderation**

NexusMeet is a modern video conferencing platform that combines real-time communication with AI-driven participant engagement monitoring and automated content moderation. The platform enables seamless virtual meetings while continuously analyzing user interaction, attention levels, and communication quality to provide actionable insights and maintain a healthy meeting environment.

---

## ✨ Key Features

### 🎥 Real-Time Video & Audio Communication

* Peer-to-peer video and audio streaming powered by **WebRTC**
* Low-latency communication using **WebSockets**
* JWT-based authentication and secure meeting access
* Multi-user meeting rooms with host controls

### 🧠 AI Engagement Monitoring

* Real-time participant engagement scoring
* Facial landmark analysis using **MediaPipe FaceMesh**
* Eye Aspect Ratio (EAR) and Mouth Aspect Ratio (MAR) tracking
* Head pose estimation and face presence detection
* Browser activity monitoring:

  * Tab visibility tracking
  * Window focus detection
  * Keyboard activity analysis
  * Mouse interaction monitoring

### 🔊 Automated Audio Moderation

* Live microphone audio processing
* Voice Activity Detection using **Silero VAD**
* Speech-to-text transcription using **OpenAI Whisper**
* Toxicity detection using **Toxic-BERT**
* Automatic moderation actions for policy violations
* Real-time moderation alerts

### 📊 Meeting Analytics

* Live engagement dashboards
* Participant attention tracking
* Moderation event logging
* Post-meeting engagement reports
* Historical meeting insights

---

# 🏗️ System Architecture

NexusMeet follows a microservice-inspired architecture consisting of three independent services connected through a centralized PostgreSQL database.

```text
┌──────────────────┐
│   Web Frontend   │
│     Next.js      │
└────────┬─────────┘
         │
         │ WebRTC + WebSockets
         │
┌────────▼─────────┐
│  Signal Server   │
│ Node.js/SocketIO │
└────────┬─────────┘
         │
         │ Internal APIs
         │
┌────────▼─────────┐
│   AI Backend     │
│ FastAPI + ML     │
└────────┬─────────┘
         │
         │
┌────────▼─────────┐
│   PostgreSQL     │
│   Central DB     │
└──────────────────┘
```

---

# 📦 Services

## 1. Signal Server (`apps/signal`)

Responsible for:

* User authentication
* JWT token generation and validation
* Meeting room coordination
* WebRTC signaling
* Socket.IO event management
* Moderation event broadcasting

### Technology Stack

* Node.js
* Express.js
* Socket.IO
* Prisma ORM
* PostgreSQL
* JWT Authentication

---

## 2. AI Backend (`apps/ai-backend`)

Responsible for:

* Engagement score calculation
* Telemetry processing
* Facial landmark analysis
* Audio transcription
* Toxicity detection
* Moderation decisions

### Technology Stack

* FastAPI
* SQLAlchemy
* Silero VAD
* OpenAI Whisper
* Toxic-BERT
* PostgreSQL

---

## 3. Web Frontend (`apps/web`)

Responsible for:

* User interface
* Media device management
* Telemetry collection
* Video conferencing experience
* Real-time analytics visualization

### Technology Stack

* Next.js
* React
* Zustand
* MediaPipe
* Socket.IO Client
* WebRTC

---

# 🛠️ Tech Stack

| Category        | Technologies                               |
| --------------- | ------------------------------------------ |
| Frontend        | Next.js, React, Zustand                    |
| AI & ML         | MediaPipe, Whisper, Toxic-BERT, Silero VAD |
| Backend         | Node.js, Express, FastAPI                  |
| Database        | PostgreSQL                                 |
| Real-Time       | WebRTC, Socket.IO                          |
| ORM             | Prisma, SQLAlchemy                         |
| Authentication  | JWT                                        |
| Package Manager | pnpm                                       |
| Deployment      | Docker                                     |

---

# 📋 Prerequisites

Before running NexusMeet, ensure the following are installed:

* Node.js v18+
* Python v3.9+
* PostgreSQL
* pnpm
* Docker (optional)

Verify installations:

```bash
node -v
python --version
pnpm -v
docker --version
```

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone https://github.com/Chettipally-Vrushank/Attentix-Meet.git
cd Attentix-Meet
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Configure Environment Variables

Create `.env` files inside each service directory.

Example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nexusmeet

JWT_SECRET=your_secret_key

NEXT_PUBLIC_AI_URL=ws://localhost:8000
```

---

## 4. Database Setup

Run migrations:

```bash
make migrate
```

Seed initial data:

```bash
make seed
```

---

# 🏃 Running the Application

## Local Development

Start all services simultaneously:

```bash
make dev
```

This launches:

| Service       | Port         |
| ------------- | ------------ |
| Signal Server | Configurable |
| AI Backend    | 8000         |
| Web Frontend  | 3000         |

---

## Docker Deployment

Build and run the complete stack:

```bash
make docker
```

Stop containers:

```bash
make docker-down
```

---

# 📂 Project Structure

```text
Attentix-Meet/
│
├── apps/
│   ├── signal/
│   │   ├── src/
│   │   └── prisma/
│   │
│   ├── ai-backend/
│   │   ├── services/
│   │   ├── models/
│   │   └── api/
│   │
│   └── web/
│       ├── src/
│       ├── hooks/
│       ├── components/
│       └── lib/
│
├── infra/
│   └── docker/
│
├── package.json
├── pnpm-workspace.yaml
├── Makefile
└── README.md
```

---

# 🔍 AI Telemetry Pipeline

### Video Enabled Mode

The frontend captures:

* Face landmarks
* Eye openness
* Mouth movements
* Head orientation
* Face visibility

The extracted metrics are streamed to the AI backend for engagement analysis.

```text
Camera
   ↓
MediaPipe FaceMesh
   ↓
Feature Extraction
   ↓
Telemetry WebSocket
   ↓
AI Backend
   ↓
Engagement Score
```

---

### Video Disabled Mode

Fallback browser telemetry includes:

* Active tab detection
* Window focus state
* Mouse activity
* Keyboard interactions

This ensures engagement tracking even when the camera is disabled.

---

# 🎤 Audio Moderation Pipeline

```text
Microphone
     ↓
Silero VAD
     ↓
Whisper STT
     ↓
Toxic-BERT
     ↓
Moderation Decision
     ↓
Signal Server
     ↓
Client Notification
```

### Moderation Actions

* Warning notifications
* Toxicity flagging
* Event logging
* Automatic participant removal

---

# 🔐 Security Features

* JWT Authentication
* Secure WebSocket connections
* Meeting-level access control
* Protected internal APIs
* Role-based host permissions

---

# 📈 Future Enhancements

* Meeting recording
* Speaker analytics
* Emotion recognition
* AI-generated meeting summaries
* Attendance reports
* Sentiment analysis
* Calendar integration
* Multi-language moderation

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push to GitHub

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

---

# 👨‍💻 Author

**Chettipally Vrushank**

* GitHub: https://github.com/Chettipally-Vrushank

---

⭐ If you find this project useful, consider giving it a star on GitHub.
