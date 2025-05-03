# OU-Me Development Environment

## TechStack
The OU-Me project is built using the following technologies:
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: SQLite
- **Authentication**: JWT
- **Deployment**: Docker, Docker Compose

## Development Setup
### Prerequisites
- Install [Docker](https://docs.docker.com/get-docker/)
- Install [Docker Compose](https://docs.docker.com/compose/install/)
- Install [Node.js](https://nodejs.org/en/download/)
- Install [Python](https://www.python.org/downloads/)
- Install [Git](https://git-scm.com/downloads)

### Clone the Repository
```bash
    git clone
```

### Set up Python Environment
```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
```

### Run the Backend
```bash
    cd backend
    uvicorn main:app --reload
```
### Run the Frontend
```bash
    cd frontend
    npm run dev
```