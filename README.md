# OU-Me
OU-Me is a project made with the purpouse of 

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
    git clone https://
```

### Set up Python Environment
```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    # Edit .env file to set up your environment variables
```

### Run the Backend
```bash
    cd backend
    uvicorn main:app --reload
```
### Set up the Frontend Environment
```bash
    cd frontend
    cd uo-me-web
    npm install #Currently using tailwindcss@3 specifically
```
### Run the Frontend
```bash
    cd frontend
    cd uo-me-web
    npm run dev #If running for production, use npm run build
```