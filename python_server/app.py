import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from nura_engine import NuraEngine
from datetime import datetime

app = Flask(__name__)

# Add CORS(app, origins="*") as requested
CORS(app, resources={r"/api/*": {"origins": "*"}})

engine = NuraEngine()

@app.route('/api/whatsapp/send', methods=['POST', 'OPTIONS'])
def whatsapp_send():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.send_whatsapp(data.get('contact', ''), data.get('message', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/mail/send', methods=['POST', 'OPTIONS'])
def mail_send():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.send_email(data.get('recipient', ''), data.get('subject', ''), data.get('body', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/search', methods=['POST', 'OPTIONS'])
def search_web():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        engine_type = data.get('engine', 'google')
        query = data.get('query', '')
        if engine_type == 'youtube':
            return jsonify(engine.search_youtube(query)), 200
        return jsonify(engine.search_google(query)), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/music/play', methods=['POST', 'OPTIONS'])
def music_play():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.play_music(data.get('query', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/music/control', methods=['POST', 'OPTIONS'])
def music_control():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.music_control(data.get('action', 'play'))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/volume', methods=['POST', 'OPTIONS'])
def volume_control():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.control_volume(data.get('action', ''), data.get('value'))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/brightness', methods=['POST', 'OPTIONS'])
def brightness_control():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.control_brightness(data.get('action', ''), data.get('value'))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/screenshot', methods=['POST', 'OPTIONS'])
def take_screenshot():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.take_screenshot(data.get('path'))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/lock', methods=['POST', 'OPTIONS'])
def lock_system():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        return jsonify(engine.lock_screen()), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/shutdown', methods=['POST', 'OPTIONS'])
def shutdown_system():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        delay = int(data.get('delay', 0))
        return jsonify(engine.shutdown(delay)), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/restart', methods=['POST', 'OPTIONS'])
def restart_system():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        return jsonify(engine.restart()), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/file/open', methods=['POST', 'OPTIONS'])
def open_file():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.open_file(data.get('path', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/file/create', methods=['POST', 'OPTIONS'])
def create_file():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.create_file(data.get('path', ''), data.get('content', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/clipboard/copy', methods=['POST', 'OPTIONS'])
def copy_clipboard():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.copy_to_clipboard(data.get('text', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/reminder/set', methods=['POST', 'OPTIONS'])
def set_reminder():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.set_reminder(data.get('title', ''), data.get('datetime', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/translate', methods=['POST', 'OPTIONS'])
def translate_text():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.translate_text(data.get('text', ''), data.get('lang', 'en'))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/weather', methods=['POST', 'OPTIONS'])
def get_weather():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.get_weather(data.get('city', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/app/launch', methods=['POST', 'OPTIONS'])
def launch_app():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.open_application(data.get('app_name', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/browser/open', methods=['POST', 'OPTIONS'])
def open_browser():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path} — {request.json}")
    try:
        data = request.json or {}
        return jsonify(engine.open_browser(data.get('url', ''))), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    print(f"[NEXORA] {request.method} {request.path}")
    try:
        import psutil
        uptime = psutil.boot_time()
        now = datetime.now().timestamp()
        system_uptime = now - uptime
        return jsonify({
            "status": "ok",
            "version": "1.0.0",
            "uptime_seconds": round(system_uptime, 2)
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"*** NEXORA System Automation Server Running on Port {port} ***")
    print(f">>> NURA Engine: Active and Ready <<<")
    
    app.run(host='0.0.0.0', port=port, debug=True)
