import cv2
import customtkinter as ctk
import threading
import time
import google.generativeai as genai
import numpy as np
import speech_recognition as sr
from PIL import Image, ImageTk
import pyttsx3
import re
import subprocess

import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------------
# Configure Gemini API and Theme
# -------------------------------
api_key = os.getenv("VITE_GEMINI_API_KEY")
if not api_key:
    print("Error: VITE_GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash-001")

ctk.set_appearance_mode("Dark")  # Attractive dark mode
ctk.set_default_color_theme("blue")  # Customize as desired

# Initialize the text-to-speech engine
tts_engine = pyttsx3.init()
tts_engine.setProperty("rate", 150)  # Adjust speech rate
tts_engine.setProperty("volume", 0.9)

def speak_response(response_text):
    """Speaks the given text aloud using pyttsx3."""
    tts_engine.say(response_text)
    tts_engine.runAndWait()

def filter_text(text):
    """
    Filters out unwanted special symbols from the text.
    Customize the regex pattern based on which symbols you want to allow.
    In this example, only alphanumeric characters, whitespace, and basic punctuation are kept.
    """
    # Remove symbols that are not letters, digits, whitespace, or basic punctuation
    return re.sub(r"[^A-Za-z0-9\s\.,\?!']", '', text)

# -------------------------------
# Utility: Convert OpenCV frame to JPEG bytes
# -------------------------------
def convert_cv2_to_jpeg_bytes(frame):
    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        raise ValueError("Could not encode image to JPEG")
    return buffer.tobytes()

# -------------------------------
# Video Capture Thread
# -------------------------------
class VideoCaptureThread(threading.Thread):
    """
    Captures video frames from the webcam and stores the latest frame.
    """
    def __init__(self, camera_index=0, width=320, height=240):
        super().__init__()
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.current_frame = None
        self.running = True

    def run(self):
        print("VideoCaptureThread started.")
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                self.current_frame = cv2.flip(frame, 1)
            time.sleep(0.01)
        print("VideoCaptureThread stopped.")

    def stop(self):
        print("Stopping VideoCaptureThread.")
        self.running = False
        self.cap.release()

# -------------------------------
# Main Application Class
# -------------------------------
class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("NURA Voice Live: Realtime Video Stream")
        self.geometry("500x600")
        self.resizable(False, False)
        
        # Video display frame
        self.video_frame = ctk.CTkFrame(self, corner_radius=30)
        self.video_frame.pack(padx=1, pady=1, fill="both", expand=True)
        
        self.video_label = ctk.CTkLabel(self.video_frame, text="")
        self.video_label.pack(padx=1, pady=1)
        
        # Text area for Gemini responses
        self.response_box = ctk.CTkTextbox(self, width=500, height=200)
        self.response_box.pack(padx=1, pady=1)
        self.response_box.insert("0.0", "NURA Live responses will appear here...\n")
        self.response_box.configure(state="disabled")
        
        # Status label for voice recognition feedback
        self.status_label = ctk.CTkLabel(self, text="Voice recognition: Inactive")
        self.status_label.pack(padx=1, pady=(0,1))
        
        # Start video capture thread
        self.video_thread = VideoCaptureThread(width=500, height=400)
        self.video_thread.start()
        
        # Start continuous video update using after() for smooth updates
        self.update_video()
        
        # Start continuous background voice recognition
        self.recognizer = sr.Recognizer()
        self.mic = sr.Microphone()
        try:
            with self.mic as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
        except Exception as e:
            print("Error initializing microphone:", e)
        
        # Begin background listening for voice input
        self.stop_listening = self.recognizer.listen_in_background(self.mic, self.voice_callback)
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def update_video(self):
        """
        Update the video label with the latest frame.
        """
        if self.video_thread.current_frame is not None:
            frame = cv2.cvtColor(self.video_thread.current_frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame)
            imgtk = ImageTk.PhotoImage(image=img)
            self.video_label.imgtk = imgtk  # Keep a reference
            self.video_label.configure(image=imgtk)
        self.after(33, self.update_video)

    def voice_callback(self, recognizer, audio):
        """
        Callback for background voice recognition.
        """
        try:
            query = recognizer.recognize_google(audio)
            self.after(0, self.process_voice_query, query)
            if ("close" in query.lower() and "live" in query.lower() and "stream"in query.lower()) or ("close" in query.lower() and "nura" in query.lower() and "live"in query.lower()) or ("close" in query.lower() and "realtime capturing" in query.lower() ) or ("close" in query.lower()):
                print("Closing live stream and returning to Jarvis...")
                speak_response("Closing live stream")
                # Schedule close_live_stream to run in the main thread.
                self.after(0, self.close_live_stream)
        except sr.UnknownValueError:
            self.after(0, self.update_status, "Could not understand audio")
        except sr.RequestError as e:
            self.after(0, self.update_status, f"Recognition error: {e}")
            

    def update_status(self, message):
        self.status_label.configure(text="Voice recognition: " + message)

    def process_voice_query(self, query):
        """
        Processes the transcribed voice query by sending it with the current video frame to Nura.
        """
        self.update_status("Processing query...")
        self.append_text("Voice Query: " + query)
        
        if self.video_thread.current_frame is None:
            self.append_text("No video frame available.")
            self.update_status("Waiting for video...")
            return
        
        try:
            image_bytes = convert_cv2_to_jpeg_bytes(self.video_thread.current_frame)
        except Exception as e:
            self.append_text("Error encoding video frame: " + str(e))
            self.update_status("Error encoding frame")
            return
        
        # Build payload: a text part (query) and an inline_data part (image)
        content = {
            "parts": [
                {"text": query},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}}
            ]
        }
        self.append_text("Sending query to NURA Live...")
        
        threading.Thread(target=self.call_gemini, args=(content,), daemon=True).start()

    def call_gemini(self, content):
        """
        Calls the Gemini API and updates the GUI with the response.
        Also speaks the response using TTS.
        """
        try:
            response = model.generate_content(content)
            if response and hasattr(response, "text"):
                result = response.text
            else:
                result = "No valid response from NURA Live."
        except Exception as e:
            result = "Error calling Google AI Studio API: " + str(e)
        
        # Filter the result text for unwanted special symbols
        filtered_result = filter_text(result)
        
        self.after(0, self.append_text, "Nura Live: " + filtered_result)
        self.after(0, self.update_status, "Listening...")
        
        # Speak the filtered response in a separate thread
        threading.Thread(target=speak_response, args=(filtered_result,), daemon=True).start()

    def append_text(self, message):
        """
        Appends a message to the response box.
        """
        self.response_box.configure(state="normal")
        self.response_box.insert("end", message + "\n")
        self.response_box.configure(state="disabled")
        self.response_box.see("end")

    def on_closing(self):
        if hasattr(self, "stop_listening") and self.stop_listening:
            self.stop_listening(wait_for_stop=False)
        self.video_thread.stop()
        self.destroy()
        

    def close_live_stream(self):
        # Stop live stream operations safely.
        self.live = False
        if self.stop_listening:
            self.stop_listening(wait_for_stop=False)
        if hasattr(self, "video_thread") and self.video_thread is not None:
            self.video_thread.stop()   # Set running to False and release the camera.
            self.video_thread.join()   # Wait for the thread to finish.
        self.destroy()
        # Relaunch jarvis.py (assuming this file is named A.py)
        subprocess.Popen(["python", "NuraVoice.py"])



    
if __name__ == "__main__":
    app = App()
    app.mainloop()
