# How to Run NEXORA AI (Zip Download)

Welcome to **Nexora AI**! Follow these simple steps to get up and running.

## 1. Prerequisites
Before starting, ensure you have the following installed on your computer:
- **Node.js** (Version 16 or higher) - [Download Here](https://nodejs.org/)
- **Python** (Version 3.8 or higher) - [Download Here](https://www.python.org/)

## 2. Setup & Run

### **The Easy Way (Recommended)**
1.  **Extract the Zip**: Unzip the downloaded file to a folder.
2.  **Double-click `start_nexora.bat`**:
    *   This script will automatically:
        *   Install all necessary "brain" parts (Node.js & Python dependencies).
        *   Launch the AI servers.
        *   Open the NEXORA interface in your browser.

### **The Manual Way (If the script doesn't work)**
If you prefer to run things manually, open 3 separate terminal (Command Prompt) windows in the project folder:

**Terminal 1 (Python Brain):**
```bash
pip install -r python_server/requirements.txt
python python_server/app.py
```

**Terminal 2 (Node.js Brain):**
```bash
npm install
npm run server
```

**Terminal 3 (Frontend Interface):**
```bash
npm run dev
```

## 3. Configuration (Optional)
To use the advanced conversational features (Gemini 3), you need an API key:
1.  Create a file named `.env` in the main folder.
2.  Add this line: `VITE_GEMINI_API_KEY=your_api_key_here`
    *   (Get a free key from [Google AI Studio](https://aistudio.google.com/))

## Troubleshooting
- **"Python not found"**: Make sure you checked "Add Python to PATH" during installation.
- **Microphone issues**: Allow browser permission for the microphone when prompted.

Enjoy your futuristic AI assistant!
