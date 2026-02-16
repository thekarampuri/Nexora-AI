import os
import re
import sys
import time
import platform
import subprocess
import threading
import webbrowser
import shutil
from datetime import datetime
from io import BytesIO

import psutil
import pyttsx3
import pyautogui
import requests
import speech_recognition as sr
import dateparser
import tkinter as tk
from tkinter import scrolledtext, messagebox
from PIL import Image, ImageTk ,ImageSequence
from bs4 import BeautifulSoup  # (Not used now, kept for potential future use)

# API settings for AI-generated content
API_KEY = "AIzaSyBm4jyzprdLKH38O3jzePOhEZUZGtPOPxI"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"

# SerpApi key for image search (replace with your actual key)
SERPAPI_KEY = "4506745ad63a241d0657fa7057da9f73e39f53e25eff92853649fe2923fa6b39"


class Jarvis:
    def __init__(self, gui):
        self.gui = gui
        self.language = "en"
        self.engine = pyttsx3.init()
        self.set_voice()
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.speaking = False
        self.conversation_history = []  # For AI context
        self.awaiting_message_input = False
        self.pending_message_text = ""
        self.last_code_file = None
        self.last_text_file = None  # Track the currently opened text file
        self.photo_images = []  # To store references to PhotoImage objects
        self.greet_user()  # Greet user on startup
        self.frames = []  # or however you're loading your GIF frames
        self.stop_listening = None


        
    def greet_user(self):
        """Greet the user based on current time."""
        current_hour = datetime.now().hour
        if current_hour < 12:
            greeting = "Good morning"
        elif current_hour < 18:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
        self.speak(f"{greeting}! I am Nura voice, your assistant.")

    def set_voice(self):
        # Get the list of voices available in the system
        voices = self.engine.getProperty('voices')

        # Set default rate
        self.engine.setProperty('rate', 120)  # Default rate for English or fallback voice

        if self.language == "hi":
            # Attempt to find a Hindi voice
            hindi_voice_found = False
            for voice in voices:
                if "hindi" in voice.name.lower() or "hi" in voice.id.lower():
                    self.engine.setProperty('voice', voice.id)
                    hindi_voice_found = True
                    break
            
            # If no Hindi voice is found, log it and fall back to a default voice
            if not hindi_voice_found:
                print("Hindi voice not found, falling back to default voice.")
                # You could either leave the default voice as is or try to find any available voice
                self.engine.setProperty('voice', voices[0].id)  # Fallback to the first available voice
                self.language = "en"  # Automatically switch to English if Hindi is unavailable

            # Set rate for Hindi voice (if found)
            self.engine.setProperty('rate', 110)

        else:
            # Attempt to find an English voice
            english_voice_found = False
            for voice in voices:
                if "english" in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    english_voice_found = True
                    break
            
            # If no English voice is found, log it and fall back to a default voice
            if not english_voice_found:
                print("English voice not found, falling back to default voice.")
                self.engine.setProperty('voice', voices[0].id)  # Fallback to the first available voice

            # Set rate for English voice
            self.engine.setProperty('rate', 120)


    def speak(self, text):
        print("NURA Voice:", text)
        self.speaking = True

        if self.gui:
            self.gui.switch_gif("v2.gif")  # Use just the filename, let `switch_gif` find the correct path

        self.engine.say(text)
        self.engine.runAndWait()

        self.speaking = False

        if self.gui:
            self.gui.switch_gif("v1.gif")  # Switch back to idle GIF


    def listen(self):
        with self.microphone as source:
            # Adjust for ambient noise just once.
            self.recognizer.adjust_for_ambient_noise(source)
            while True:
                try:
                    self.gui.set_state("Listening...")
                    
                    # Listen with a timeout and phrase_time_limit.
                    audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                    
                    # Recognize the speech.
                    command = self.recognizer.recognize_google(
                        audio, language="hi-IN" if self.language == "hi" else "en-IN"
                    ).strip()
                    print("User said:", command)
                    
                    # Respond to the command.
                    self.respond(command)
                    self.gui.set_state("Ready")
                except sr.UnknownValueError:
                    print("NURA Voice could not understand that.")
                except sr.RequestError as e:
                    print("COnnect to Internet / WiFi Network")

                
                
    def show_current_weather(self):
        """
        Fetches current weather for Solapur, Maharashtra using the free wttr.in API.
        Then displays the weather information in an attractive hexagon-shaped window.
        """
        import requests
        import math
        import tkinter as tk

        city = "Pune"
        url = f"http://wttr.in/{city}?format=j1"  # Using wttr.in's JSON endpoint

        try:
            resp = requests.get(url)
            data = resp.json()

            current = data.get("current_condition", [{}])[0]
            # Extract values from the current weather data provided by wttr.in
            temperature = current.get("temp_C", "N/A")
            weather_desc = current.get("weatherDesc", [{"value": "N/A"}])[0].get("value", "N/A")
            wind_speed = current.get("windspeedKmph", "N/A")
            humidity = current.get("humidity", "N/A")
            location_name = f"{city}, Maharashtra"
            # wttr.in doesn't provide an observation time, so we use "Now"
            obs_time = "Now"

            weather_text = (
                f"Location: {location_name}\n"
                f"Time: {obs_time}\n"
                f"Temperature: {temperature}°C\n"
                f"Condition: {weather_desc}\n"
                f"Wind: {wind_speed} km/h\n"
                f"Humidity: {humidity}%"
            )
        except Exception as e:
            weather_text = "Error retrieving weather data."
            print("Weather error:", e)

        # Create a new window with a hexagon shape
        weather_win = tk.Toplevel()
        weather_win.title("Current Weather")
        weather_win.geometry("400x400")
        weather_win.configure(bg="#1e1e1e")
        weather_win.resizable(False, False)

        canvas = tk.Canvas(weather_win, bg="#1e1e1e", highlightthickness=0)
        canvas.pack(fill="both", expand=True)

        center_x, center_y, radius = 200, 200, 150
        points = []
        for i in range(6):
            angle = math.radians(60 * i - 30)
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            points.extend([x, y])

        canvas.create_polygon(points, fill="#2d2d2d", outline="#00aaff", width=3)
        canvas.create_text(center_x, center_y, text=weather_text, fill="white",
                        font=("Helvetica", 14, "bold"), justify="center", width=250)

        self.speak(weather_text)

            

    def respond(self, user_input):
        user_input_lower = user_input.lower()

        try:
            if "start live stream" in user_input_lower:
                print("Switching to live stream mode...")
                self.speak("Starting live stream")
                subprocess.Popen(["python", "C.py"])
                self.cleanup()
                exit(0)
            else:
                # Otherwise, process as a normal query.
                #self.process_query(query)
                print("Ooo")
        except sr.UnknownValueError:
            print("Could not understand audio.")
        except sr.RequestError as e:
            print("Speech recognition error; {0}".format(e))
        
        # ----- WEATHER FEATURE -----
        if (("current" in user_input_lower and "weather" in user_input_lower) or 
            ("todays" in user_input_lower and "weather" in user_input_lower) or 
             ("weather" in user_input_lower and "update" in user_input_lower)):
            self.show_current_weather()
            return
        
         # ----- NEWS FEATURE -----
        if "show todays news" in user_input_lower or "show today's news" in user_input_lower or "show news" in user_input_lower or "today's news" in user_input_lower or "todays news" in user_input_lower or "live news" in user_input_lower or "latest news" in user_input_lower:
            self.show_todays_news()
            return

        if "refresh news" in user_input_lower or "update news" in user_input_lower or "reload news" in user_input_lower or "get latest news" in user_input_lower :
            return
        

        if "read" in user_input_lower and "news" in user_input_lower:
            if self.todays_news:
                for idx, news in enumerate(self.todays_news, start=1):
                    title = news.get("title", "No Title")
                    snippet = news.get("snippet", "")
                    self.speak(f"News {idx}: {title}. {snippet}")
            else:
                self.speak("No news available. Please say 'show todays news' first.")
            return

        more_match = (re.search(r'more about (\d+)', user_input_lower)) or (re.search(r'open news (\d+)', user_input_lower)) or (re.search(r'open news item (\d+)', user_input_lower)) or (re.search(r'open news number (\d+)', user_input_lower)) 
        if more_match:
            num = int(more_match.group(1))
            if self.todays_news and 1 <= num <= len(self.todays_news):
                url = self.todays_news[num - 1].get("link")
                if url:
                    webbrowser.open(url)
                    self.speak(f"Opening news item {num} in your browser.")
                else:
                    self.speak("No URL found for that news item.")
            else:
                self.speak("Invalid news number or no news available.")
            return
        
        
        pattern = r'open application ([^"]+)'
        match_appli = re.match(pattern, user_input_lower)

        if match_appli:
            application_name = match_appli.group(1)  # Extract application name
            try:
                # Simulate the Windows key press to open the Start Menu
                pyautogui.hotkey('win')  # Press the Windows key
                time.sleep(1)  # Wait for the Start Menu to open

                # Type the application name into the search bar
                pyautogui.write(application_name)
                time.sleep(1)  # Wait for search results to appear

                # Press Enter to open the first matching application
                pyautogui.press('enter')
                print(f'Opening {application_name}...')
            
            except Exception as e:
                print(f'An error occurred: {e}')
        else:
            print('Invalid command. Please use the format: open application "application_name"')


        if "power off" in user_input_lower :
            pyautogui.hotkey('win')
            pyautogui.hotkey('shift','tab')
            pyautogui.press('right')
            pyautogui.press('enter')
            pyautogui.press('down')
            pyautogui.press('down')
            pyautogui.press('enter')
        
        elif "restart" in user_input_lower:
            pyautogui.hotkey('win')
            pyautogui.hotkey('shift','tab')
            pyautogui.press('right')
            pyautogui.press('enter')
            pyautogui.press('down')
            pyautogui.press('down')
            pyautogui.press('down')
            pyautogui.press('enter')
        
        elif "refresh" in user_input_lower:
            pyautogui.hotkey('f5')


        # --- Image Display Command using SerpApi ---
        pic_match = re.search(r'(?:display|show|view|get|see) (?:image|picture|photo|pic|imaages)(?: of)? (.+)', user_input, re.IGNORECASE)
        if pic_match:
            query = pic_match.group(1).strip()
            self.display_images(query)
            return
        
         # --- Website Opening Command (with quotes) ---
        website_match = re.search(r'(?:goto|open website)\s+"([^"]+)"', user_input, re.IGNORECASE)
        if website_match:
            website = website_match.group(1).strip()
            if not website.startswith("http"):
                website = "https://" + website
            webbrowser.open(website)
            self.speak(f"Opening website {website}.")
            return

        # --- Website Opening Command (without quotes) ---
        website_match_no_quotes = re.search(r'(?:goto|open website)\s+([\w\.\-]+)', user_input, re.IGNORECASE)
        if website_match_no_quotes:
            site = website_match_no_quotes.group(1).strip()
            if site.lower() not in ["whatsapp", "calculator", "notepad", "text", "youtube"]:
                if '.' not in site:
                    site = "www." + site + ".com"
                if not site.startswith("http"):
                    site = "https://" + site
                webbrowser.open(site)
                self.speak(f"Opening website {site}.")
                return


        # === 1. Code Generation/Update Commands (for programming) ===
        if self.handle_code_requests(user_input):
            return
        
        if "open instagram" in user_input_lower or "open insta" in user_input_lower or "instagram" in user_input_lower or "insta" in user_input_lower:
            self.open_insta_web()
            return
        
        if "reels" in user_input_lower or "reel" in user_input_lower:
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.press('enter')
            return
        

        if  "next reel" in user_input_lower or "scroll" in user_input_lower or "scroll down" in user_input_lower:
            pyautogui.press('down')
            return
        
        if ("insta" in user_input_lower or "instagram" in user_input_lower) and ("reels" in user_input_lower or "reel" in user_input_lower):
            self.speak("Opening Instagram Reels.")
            self.open_insta_web()
            time.sleep(3)
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.hotkey('shift','tab')
            pyautogui.press('enter')
            return

        # === 2. WhatsApp Commands ===
        if "open whatsapp" in user_input_lower or "open whatsapp web" in user_input_lower or "go to whatsapp" in user_input_lower:
            self.open_whatsapp_web()
            return

        contact_match = re.search(r'contact (.+)', user_input, re.IGNORECASE)
        if contact_match:
            contact_name = contact_match.group(1).strip()
            self.search_contact(contact_name)
            return

        if "type" in user_input_lower and "message" in user_input_lower:
            if self.is_whatsapp_web_open():
                    self.awaiting_message_input = True
                    self.pending_message_text = ""
                    self.speak("What message would you like to type?")
            else:
                self.speak("WhatsApp Web is not open. Please open it first.")
            return

        if "send message" in user_input_lower :
            if hasattr(self, "message_ready") and self.message_ready:
                pyautogui.press("enter")
                self.speak("Message sent. Any more message to send ")
                self.message_ready = False
            else:
                self.speak("No message is ready to be send.")
            return

        msg_match = re.search(r"message to (.+?) on whatsapp (.+)", user_input, re.IGNORECASE)
        if msg_match:
            contact = msg_match.group(1).strip()
            message = msg_match.group(2).strip()
            self.open_whatsapp_web()
            time.sleep(6)
            self.search_contact(contact)
            time.sleep(1)
            pyautogui.click(x=990, y=950)  # Adjust coordinates as needed
            time.sleep(0.5)
            pyautogui.typewrite(message, interval=0.05)
            time.sleep(0.5)
            pyautogui.press("enter")
            self.speak(f"Message sent to {contact}.")       

        # === 3. YouTube Commands ===
        if self.handle_youtube_commands(user_input_lower):
            return
        # === 4. Text Editor Commands ===
        if ("text editor" in user_input_lower or "text file" in user_input_lower or
            "write about" in user_input_lower or "create text" in user_input_lower or
            "type text" in user_input_lower or "update text" in user_input_lower or
            "update file" in user_input_lower or "update document" in user_input_lower):
            if self.handle_text_editor_commands(user_input):
                return
        elif "close" in user_input_lower and ("notepad" in user_input_lower or "text editor" in user_input_lower ):
            self.close_text_editor()
        
        elif "close" in user_input_lower and ("tab" in user_input_lower or "window" in user_input_lower):
            pyautogui.hotkey('alt','f4')

        # === 5. System & Application Commands ===
        if "open notepad" in user_input_lower or "open text editor" in user_input_lower or "open text edit" in user_input_lower or "open note" in user_input_lower:
            self.open_text_editor()
            return

        if "open" in user_input_lower and ("calculator" in user_input_lower or "calci" in user_input_lower) :
            self.open_calculator()
            return

        if "system info" in user_input_lower or "system information" in user_input_lower:
            self.show_system_info()
            return

        # --- Battery Status Check ---
        if "battery" in user_input_lower or "charge" in user_input_lower or "percentage" in user_input_lower:
            self.report_battery_status()
            return

        # === 6. Digital Clock Command ===
        if any(phrase in user_input_lower for phrase in [
                "what's the time", "tell the time", "current time", "what is the time",
                "what's the date", "tell the date", "current date", "what is the date",
                "what's the day", "tell the day", "current day", "what is the day",
                "show me the time", "show me the date", "show me the day",
                "show time", "show date", "show day", "show clock", "show calendar", "show digital clock", "today's date", "today's day"
                , "today's time", "todays time", "todays date", "todays day"]):
            self.show_digital_clock()
            return

        # === 7. Language Switching ===
        if "shift to hindi" in user_input_lower or "Hindi mein baat karo" in user_input:
            self.language = "hi"
            self.set_voice()
            reply = "अब मैं हिंदी में बात करूंगा!"
            self.gui.display_results(user_input, reply)
            self.speak(reply)
            return

        if "shift to english" in user_input_lower or "इंग्लिश में बात करो" in user_input_lower or "शिफ्ट तो इंग्लिश" in user_input or "स्पीक इन इंग्लिश" in user_input:
            self.language = "en"
            self.set_voice()
            reply = "Now I will speak in English."
            self.gui.display_results(user_input, reply)
            self.speak(reply)
            return

        # === 8. Google Search Command ===
        if "google search " in user_input_lower or "make a google search of" in user_input_lower or "google search of" in user_input_lower or "google search on" in user_input_lower or "make a google search on" in user_input_lower:
            query = user_input_lower.split("google search for", 1)[1].strip()
            webbrowser.open(f"https://www.google.com/search?q={query}")
            reply = f"Searching for {query} on Google."
            self.gui.display_results(user_input, reply)
            self.speak(reply)
            return

        # === 9. Awaiting WhatsApp Message Input ===
        if self.awaiting_message_input:
            self.awaiting_message_input = False
            self.pending_message_text = user_input
            time.sleep(0.5)
            pyautogui.click(x=990, y=950)  # Adjust coordinates as needed
            time.sleep(0.5)
            pyautogui.typewrite(self.pending_message_text, interval=0.05)
            self.message_ready = True
            self.speak("Message typed. Say 'send itmessage' to send.")
            return

        # === 10. AI Chat Response for General Conversation ===
        self.conversation_history.append({
            "role": "user",
            "parts": [{"text": user_input}]
        })

        word_count = len(user_input.split())
        if word_count <= 3:
            length_pref = "Respond in short."
        elif word_count <= 7:
            length_pref = "Respond a little briefly."
        else:
            length_pref = "Respond clearly and helpfully."

        if len(self.conversation_history) == 1:
            self.conversation_history.insert(0, {
                "role": "user",
                "parts": [{"text": f"You are a helpful assistant. Speak in {self.language}. {length_pref}"}]
            })

        payload = {"contents": self.conversation_history}
        try:
            headers = {'Content-Type': 'application/json'}
            response = requests.post(API_URL, json=payload, headers=headers)
            data = response.json()
            ai_reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "...")
            self.conversation_history.append({
                "role": "model",
                "parts": [{"text": ai_reply}]
            })
            filtered_ai_reply = self.filter_text(ai_reply)
            self.gui.display_results(user_input, filtered_ai_reply)
            self.speak(filtered_ai_reply)
            if self.last_text_file:
                try:
                    with open(self.last_text_file, "w", encoding="utf-8") as f:
                        f.write(filtered_ai_reply)
                    self.open_text_editor_file(self.last_text_file)
                except Exception as e:
                    self.speak(f"Error writing response to text file: {e}")
        except Exception as e:
            print("AI Error:", e)
            error_reply = "Something went wrong." if self.language == "en" else "कुछ गड़बड़ हो गई।"
            self.gui.display_results(user_input, error_reply)
            self.speak(error_reply)

    def filter_text(self, text):
        allowed_pattern = r'''[^A-Za-z0-9\s\(\),\.\'"/|]'''
        filtered = re.sub(allowed_pattern, "", text)
        return filtered
    

    def report_battery_status(self):
        battery = psutil.sensors_battery()
        if battery is None:
            self.speak("Battery status is not available on this system.")
            messagebox.showinfo("Battery Status", "Battery status is not available on this system.")
            return
        percent = battery.percent
        charging = battery.power_plugged
        # Format the percentage as a decimal with one decimal place
        percent_formatted = float(f"{percent:.1f}")
        if percent_formatted < 45.0:
            if charging:
                message = f"Warning: Battery is low at {percent_formatted:.1f}% even though it is charging."
            else:
                message = f"Warning: Battery is very low at {percent_formatted:.1f}%. Please charge your device immediately."
        else:
            status = "charging" if charging else "not charging"
            message = f"Current battery status: {percent_formatted:.1f}% and it is {status}."
        self.speak(message)
        messagebox.showinfo("Battery Status", message)

    def show_digital_clock(self):
        """Opens a fixed-size, closable digital clock window with a dark octagon UI."""
        clock_win = tk.Toplevel()
        clock_win.title("Digital Clock")
        clock_win.geometry("300x300")
        clock_win.configure(bg='black')
        clock_win.resizable(False, False)
        canvas = tk.Canvas(clock_win, width=300, height=300, bg='black', highlightthickness=0)
        canvas.pack(fill="both", expand=True)
        offset = 60
        w, h = 300, 300
        points = [offset, 0, w - offset, 0, w, offset, w, h - offset, w - offset, h, offset, h, 0, h - offset, 0, offset]
        canvas.create_polygon(points, fill="#333333", outline="white", width=2)
        time_item = canvas.create_text(w/2, h/2 - 40, text="", fill="white", font=("Helvetica", 24, "bold"))
        date_item = canvas.create_text(w/2, h/2, text="", fill="white", font=("Helvetica", 18))
        day_item = canvas.create_text(w/2, h/2 + 40, text="", fill="white", font=("Helvetica", 18))
        def update_clock():
            now = datetime.now()
            time_str = now.strftime("%I:%M:%S %p")
            date_str = now.strftime("%d %B %Y")
            day_str = now.strftime("%A")
            canvas.itemconfig(time_item, text=time_str)
            canvas.itemconfig(date_item, text=date_str)
            canvas.itemconfig(day_item, text=day_str)
            clock_win.after(1000, update_clock)
        update_clock()
        

    def display_images(self, query):
        """
        Uses SerpApi to search for images of the given query and displays the first 4 results
        in a 2x2 grid in a new window with a dark UI and fixed size.
        """
        params = {
            "engine": "google",
            "q": query,
            "tbm": "isch",
            "api_key": SERPAPI_KEY,
            "num": "4"
        }
        try:
            resp = requests.get("https://serpapi.com/search", params=params)
            data = resp.json()
            images_results = data.get("images_results", [])
            if not images_results:
                self.speak(f"Sorry, I couldn't find any images for {query}.")
                return
        except Exception as e:
            self.speak(f"Error retrieving images: {e}")
            return

        img_win = tk.Toplevel()
        img_win.title(f"Images for {query}")
        img_win.configure(bg="black")
        img_win.geometry("400x400")
        img_win.resizable(False, False)
        self.photo_images = []  # Clear previous images

        for idx, img_info in enumerate(images_results[:4]):
            try:
                # Use the 'thumbnail' field if available, else fallback to 'original'
                img_url = img_info.get("thumbnail") or img_info.get("original")
                if not img_url:
                    continue
                img_resp = requests.get(img_url)
                img_data = img_resp.content
                pil_img = Image.open(BytesIO(img_data)).convert("RGB")
                # Use the LANCZOS resampling filter instead of deprecated ANTIALIAS
                pil_img = pil_img.resize((180, 180), Image.LANCZOS)
                photo = ImageTk.PhotoImage(pil_img)
                self.photo_images.append(photo)
                lbl = tk.Label(img_win, image=photo, bg="black")
                row, col = idx // 2, idx % 2
                lbl.grid(row=row, column=col, padx=10, pady=10)
            except Exception as e:
                print("Error loading image:", e)
                
    
    def show_todays_news(self):
            import time
            from io import BytesIO
            from PIL import Image, ImageTk
            import tkinter as tk

            # Add a cache-buster (timestamp) so we always get fresh results.
            params = {
                "engine": "google_news",
                "q": "India news",
                "hl": "en",
                "gl": "in",
                "ceid": "IN:en",
                "freshness": "d",
                "api_key": SERPAPI_KEY,
                "num": "10",
                "t": str(time.time())  # Cache buster to force fresh data
            }
            try:
                resp = requests.get("https://serpapi.com/search", params=params)
                data = resp.json()
                news_results = data.get("news_results", [])
                if not news_results:
                    self.speak("Sorry, no news found for today.")
                    return
                self.todays_news = news_results[:10]
            except Exception as e:
                self.speak(f"Error retrieving news: {e}")
                return

            # If a news window already exists, destroy it before creating a new one.
            if hasattr(self, "news_win") and self.news_win is not None:
                try:
                    self.news_win.destroy()
                except Exception as e:
                    print("Error destroying old news window:", e)

            self.news_win = tk.Toplevel()
            self.news_win.title("Today's News")
            self.news_win.geometry("800x600")
            self.news_win.configure(bg="black")
            
            canvas = tk.Canvas(self.news_win, bg="black")
            scrollbar = tk.Scrollbar(self.news_win, orient="vertical", command=canvas.yview)
            scrollable_frame = tk.Frame(canvas, bg="black")
            scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
            canvas.configure(yscrollcommand=scrollbar.set)
            canvas.pack(side="left", fill="both", expand=True)
            scrollbar.pack(side="right", fill="y")

            for idx, news in enumerate(self.todays_news, start=1):
                frame = tk.Frame(scrollable_frame, bg="black", padx=10, pady=10)
                title = news.get("title", "No Title")
                snippet = news.get("snippet", "No content available.")
                link = news.get("link", "")
                title_label = tk.Label(frame, text=f"{idx}. {title}", bg="black", fg="white",
                                        font=("Helvetica", 18, "bold"), wraplength=750, justify="left")
                title_label.pack(anchor="w")
                snippet_label = tk.Label(frame, text=snippet, bg="black", fg="white",
                                        font=("Helvetica", 14), wraplength=750, justify="left")
                snippet_label.pack(anchor="w", pady=(5, 0))
                image_url = news.get("image")
                if image_url:
                    try:
                        img_resp = requests.get(image_url)
                        img_data = img_resp.content
                        pil_img = Image.open(BytesIO(img_data)).convert("RGB")
                        pil_img = pil_img.resize((250, 180), Image.LANCZOS)
                        photo = ImageTk.PhotoImage(pil_img)
                        if not hasattr(self, "photo_images"):
                            self.photo_images = []
                        self.photo_images.append(photo)
                        img_label = tk.Label(frame, image=photo, bg="black")
                        img_label.pack(anchor="w", pady=(5, 0))
                    except Exception as e:
                        print("Error loading news image:", e)
                frame.news_link = link
                frame.pack(fill="x", padx=10, pady=5)
            self.speak("Here are today's news from India. You can say 'read the news' to hear them, or 'more about [number]' to open a specific news item.")

                
                
    def handle_youtube_commands(self, user_input):
        open_yt_match = re.search(r"open youtube(?: and (?:search|play) (.+))?", user_input)
        if open_yt_match:
            query = open_yt_match.group(1)
            if query:
                self.open_youtube(query)
                time.sleep(6)
                pyautogui.hotkey('ctrl', 'l')
                time.sleep(1)
                url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
                pyautogui.typewrite(url, interval=0.05)
                pyautogui.press("enter")
                time.sleep(4)
                pyautogui.press("tab", presses=3, interval=0.5)
                pyautogui.press("enter")
                self.speak(f"Searching and playing {query} on YouTube.")
            else:
                self.open_youtube()
                self.speak("Opening YouTube.")
            return True

        play_match = re.search(r"play (.+) on youtube", user_input)
        if play_match:
            query = play_match.group(1).strip()
            if not self.is_youtube_open():
                self.open_youtube(query)
                time.sleep(6)
            else:
                self.focus_youtube()
            time.sleep(1)
            pyautogui.hotkey('ctrl', 'l')
            time.sleep(1)
            url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
            pyautogui.typewrite(url, interval=0.05)
            pyautogui.press("enter")
            time.sleep(4)
            pyautogui.press("tab", presses=3, interval=0.5)
            pyautogui.press("enter")
            self.speak(f"Playing {query} on YouTube.")
            return True

        if (("pause" in user_input or "play" in user_input) and "video" in user_input):
                pyautogui.press("k")
                self.speak("Toggled play and pause.")
                return True

        if ("mute" in user_input and ("video" in user_input or "it" in user_input)) or "mute" in user_input:
                pyautogui.press("m")
                self.speak("Toggled mute.")
                return True

        if ("full screen" in user_input and "exit" not in user_input) or ("full screen" in user_input and "video" in user_input):
                pyautogui.press("f")
                self.speak("Toggled fullscreen mode.")
                return True

        if "exit full screen" in user_input or "close full screen" in user_input:
                pyautogui.press("esc")
                self.speak("Exited fullscreen.")
                return True

        if "rewind" in user_input or "back 10 seconds" in user_input or ("rewind" in user_input and ("video" in user_input or "it" in user_input)):
                pyautogui.press("j")
                self.speak("Rewinding 10 seconds.")
                return True

        if "forward" in user_input or "skip 10 seconds" in user_input or ("forward" in user_input and ("video" in user_input or "it" in user_input)):
                pyautogui.press("l")
                self.speak("Skipping ahead 10 seconds.")
                return True

        if "next video" in user_input:
                pyautogui.hotkey('shift', 'n')
                self.speak("Playing next video.")
                return True

        if "previous video" in user_input:
                pyautogui.hotkey('shift', 'p')
                self.speak("Playing previous video.")
                return True

        if "volume up" in user_input or "increase volume" in user_input:
                pyautogui.press("up")
                self.speak("Increasing volume.")
                return True

        if "volume down" in user_input or "decrease volume" in user_input:
                pyautogui.press("down")
                self.speak("Decreasing volume.")
                return True

        if "captions" in user_input or ("open" in user_input and "video" in user_input and "captions" in user_input)or "go to captions" in user_input:
                pyautogui.press("c")
                self.speak("Toggling captions.")
                return True
        return False

    def handle_text_editor_commands(self, user_input):
        create_match = re.search(r"(?:create|write|type)(?: a)?(?: text file)?(?: about| on)? (.+)", user_input, re.IGNORECASE)
        update_match = re.search(r"(?:update|change)(?: the)?(?: file |text file| document)?(?: with| to)? (.+)", user_input, re.IGNORECASE)

        if create_match:
            self.speak("Creating a text file.")
            topic = create_match.group(1).strip()
            prompt = f"Write a detailed article about {topic}."
            ai_text = self.generate_code_from_ai(prompt)
            if not ai_text:
                self.speak("I couldn't generate the text.")
                return True
            filename = f"{topic.replace(' ', '_')}.txt"

            desktop_folder = os.path.join(os.environ["USERPROFILE"], "OneDrive", "Desktop", "Project")
            os.makedirs(desktop_folder, exist_ok=True)
            filepath = os.path.join(desktop_folder, filename)

            #filepath = os.path.join(os.getcwd(), filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(ai_text)
            self.last_text_file = filepath
            self.speak(f"Text file about {topic} created and saved as {filename}.")
            self.open_text_editor_file(filepath)
            return True

        elif update_match:
            self.speak("Updating the text file.")
            new_topic = update_match.group(1).strip()
            if not self.last_text_file:
                self.speak("No text file has been created yet.")
                return True
            prompt = f"Write a detailed article about {new_topic}."
            ai_text = self.generate_code_from_ai(prompt)
            if not ai_text:
                self.speak("I couldn't generate the updated text.")
                return True
            with open(self.last_text_file, "w", encoding="utf-8") as f:
                f.write(ai_text)
            self.speak(f"Text file updated with new content about {new_topic}.")
            self.open_text_editor_file(self.last_text_file)
            return True

        return False

    def generate_code_from_ai(self, prompt):
        try:
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            headers = {'Content-Type': 'application/json'}
            response = requests.post(API_URL, json=payload, headers=headers)
            data = response.json()
            return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception as e:
            print("AI generation failed:", e)
            return ""

    def get_day_date_time(self, user_input):
        parsed_date = dateparser.parse(user_input)
        if not parsed_date:
            return "Sorry, I couldn't understand the date or time you're asking for."
        response_parts = []
        if any(word in user_input.lower() for word in ["time", "current time", "what's the time", "now"]):
            response_parts.append(f"Current Time: {parsed_date.strftime('%I:%M %p')}")
        if any(word in user_input.lower() for word in ["day", "what day", "which day"]):
            response_parts.append(f"Day: {parsed_date.strftime('%A')}")
        if any(word in user_input.lower() for word in ["date", "which date", "what date", "on"]):
            response_parts.append(f"Date: {parsed_date.strftime('%d %B %Y')}")
        if not response_parts:
            response_parts.append(parsed_date.strftime('%A, %d %B %Y, %I:%M %p'))
        return "\n".join(response_parts)

    def handle_code_requests(self, user_input):
        create_match = re.search(r"create a (\w+) program (to|on|about|for) (.+)", user_input, re.IGNORECASE)
        update_match = (re.search(r"update line (\d+) to (.+)", user_input, re.IGNORECASE)) or (re.search(r"go to line number (\d+)  update and write  (.+)", user_input, re.IGNORECASE))

        if create_match:
            self.speak("Creating a program.")
            language = create_match.group(1).lower()
            topic = create_match.group(3).strip()
            prompt = f"Write a well-structured {language} program on '{topic}' with comments."
            filename = f"{topic.replace(' ', '_')}.{self.get_extension(language)}"

            desktop_folder = os.path.join(os.environ["USERPROFILE"], "OneDrive", "Desktop", "Project")
            os.makedirs(desktop_folder, exist_ok=True)
            filepath = os.path.join(desktop_folder, filename)

           # filepath = os.path.join(os.getcwd(), filename)
            ai_code = self.generate_code_from_ai(prompt)
            if not ai_code:
                self.speak("I couldn't generate the code.")
                return True
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(ai_code)
            self.speak(f"{language.capitalize()} program on {topic} created and saved as {filename}.")
            subprocess.Popen([r"C:\Users\soham\AppData\Local\Programs\Microsoft VS Code\Code.exe", filepath])
            self.last_code_file = filepath
            return True

        elif update_match and self.last_code_file:
            self.speak("Updating the program line.")
            line_no = int(update_match.group(1))
            new_code = update_match.group(2).strip().strip("'\"")
            try:
                with open(self.last_code_file, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                if line_no <= 0 or line_no > len(lines):
                    self.speak("Invalid line number.")
                    return True
                lines[line_no - 1] = new_code + "\n"
                with open(self.last_code_file, "w", encoding="utf-8") as f:
                    f.writelines(lines)
                self.speak(f"Line {line_no} updated successfully.")
                subprocess.Popen(["code", self.last_code_file])
            except Exception as e:
                print("Update error:", e)
                self.speak("Error updating the code.")
            return True

        return False

    def get_extension(self, language):
        return {
            "python": "py",
            "java": "java",
            "c": "c",
            "c++": "cpp",
            "javascript": "js",
            "html": "html"
        }.get(language.lower(), "txt")
    
    
    def cleanup(self):
        if callable(self.stop_listening):
            self.stop_listening(wait_for_stop=False)
        else:
            print("stop_listening is not callable or not set.")
        self.stop_gif_animation()
        print("NURA CHAT exiting...")
        self.gui.destroy()

    def stop_gif_animation(self):
        if hasattr(self, "animate_gif_id"):
            self.after_cancel(self.animate_gif_id)
            self.animate_gif_id = None
        self.frames = []  # Clear frames so animate_gif won't run again


    # ===== OS-Specific Application Commands =====
    def open_text_editor(self):
        system_platform = platform.system()
        try:
            if system_platform == "Windows":
                os.system("notepad")
            elif system_platform == "Darwin":
                subprocess.Popen(["open", "-a", "TextEdit"])
            elif system_platform == "Linux":
                editors = ["gedit", "kate", "xed", "leafpad", "mousepad", "pluma"]
                for editor in editors:
                    if shutil.which(editor):
                        subprocess.Popen([editor])
                        return
                self.speak("No graphical text editor found. Try installing one like gedit.")
            else:
                self.speak("Text editor opening is not supported on your OS.")
        except Exception as e:
            self.speak(f"Failed to open text editor. Error: {e}")

    def open_text_editor_file(self, filepath):
        system_platform = platform.system()
        try:
            if system_platform == "Windows":
                os.startfile(filepath)
            elif system_platform == "Darwin":
                subprocess.Popen(["open", "-a", "TextEdit", filepath])
            elif system_platform == "Linux":
                editors = ["gedit", "kate", "xed", "leafpad", "mousepad", "pluma"]
                for editor in editors:
                    if shutil.which(editor):
                        subprocess.Popen([editor, filepath])
                        return
                self.speak("No graphical text editor found to open the file.")
            else:
                self.speak("Opening text file is not supported on your OS.")
        except Exception as e:
            self.speak(f"Failed to open text editor with file. Error: {e}")

    def close_text_editor(self):
        """
        Simulates saving and closing the text editor.
        For Windows/Linux: sends Ctrl+S then Alt+F4.
        For macOS: sends Command+S then Command+Q.
        """
        system_platform = platform.system()
        try:
            if system_platform in ["Windows", "Linux"]:
                pyautogui.hotkey('ctrl', 's')
                time.sleep(1)
                pyautogui.hotkey('alt', 'f4')
            elif system_platform == "Darwin":
                pyautogui.hotkey('command', 's')
                time.sleep(1)
                pyautogui.hotkey('command', 'q')
            self.speak("Text editor closed and file saved.")
            self.last_text_file = None
        except Exception as e:
            self.speak(f"Failed to close text editor: {e}")

    def open_calculator(self):
        system_platform = platform.system().lower()
        try:
            if system_platform == "windows":
                subprocess.Popen(["calc.exe"])
            elif system_platform == "linux":
                subprocess.Popen(["gnome-calculator"])
            elif system_platform == "darwin":
                subprocess.Popen(["open", "-a", "Calculator"])
            else:
                self.speak("Calculator opening is not supported on your OS.")
            self.speak("Opening calculator.")
        except Exception as e:
            self.speak(f"Failed to open calculator. Error: {e}")

    def show_system_info(self):
        try:
            cpu_usage = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory()
            mem_usage = mem.percent
            battery = psutil.sensors_battery()
            battery_status = f"{battery.percent}%" if battery else "N/A"
            info = (f"CPU Usage: {cpu_usage}%\n"
                    f"Memory Usage: {mem_usage}%\n"
                    f"Battery: {battery_status}")
            self.speak("Here is the system information.")
            self.gui.display_results("System Info", info)
        except Exception as e:
            self.speak("I couldn't retrieve system information.")

    # ===== WhatsApp Commands =====
    def open_whatsapp_web(self):
        try:
            self.speak("Make sure you have logged in to  WhatsApp Web.")
            system_os = platform.system().lower()
            if system_os == "windows":
                os.startfile("https://web.whatsapp.com")
            elif system_os == "darwin":
                subprocess.Popen(["open", "https://web.whatsapp.com"])
            else:
                subprocess.Popen(["xdg-open", "https://web.whatsapp.com"])
            self.speak("Opening WhatsApp Web.")
            time.sleep(7)
        except Exception as e:
            self.speak("Failed to open WhatsApp Web.")



    def open_insta_web(self):
        try:
            self.speak("Make sure you have logged in to Instagram Web.")
            system_os = platform.system().lower()
            if system_os == "windows":
                os.startfile("https://www.instagram.com")
            elif system_os == "darwin":
                subprocess.Popen(["open", "https://www.instagram.com"])
            else:
                subprocess.Popen(["xdg-open", "https://www.instagram.com"])
            self.speak("Opening Instagram Web.")
            time.sleep(7)
        except Exception as e:
            self.speak("Failed to open Instagram Web.")


    def is_whatsapp_web_open(self):
        try:
            # Iterate through all running processes
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                # Check if the process is Chrome or Firefox (adjust as necessary for other browsers)
                if proc.info['name'].lower() in ['chrome.exe', 'firefox.exe']:
                    # Check if WhatsApp Web is opened in the browser by checking the command line arguments
                    if 'web.whatsapp.com' in ' '.join(proc.info['cmdline']).lower():
                        return True
            return False
        except Exception as e:
            return False

    def focus_whatsapp_web(self):
        try:
            output = subprocess.check_output(['wmctrl', '-l']).decode('utf-8').lower()
            for line in output.splitlines():
                if 'whatsapp' in line and any(browser in line for browser in ['chrome', 'firefox']):
                    window_id = line.split()[0]
                    subprocess.call(['wmctrl', '-ia', window_id])
                    time.sleep(1)
                    return True
            return False
        except Exception as e:
            return False

    def search_contact(self, name):
        pyautogui.hotkey('ctrl', 'alt', '/')
        pyautogui.press('backspace')
        time.sleep(1)
        pyautogui.typewrite(name, interval=0.06)
        time.sleep(2)
        pyautogui.press('enter')
        time.sleep(1)
        pyautogui.hotkey('ctrl', 'alt', '/')
        time.sleep(0.5)
        pyautogui.hotkey('ctrl', 'a')
        pyautogui.press('backspace')
        time.sleep(0.3)
        self.speak(f"Opened contact {name}")

    def open_youtube(self, query=None):
        if query:
            url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
        else:
            url = "https://www.youtube.com"
        webbrowser.open_new_tab(url)

    def is_youtube_open(self):
        try:
            for window in gw.getAllWindows():
                if window.title and "youtube" in window.title.lower():
                    return True
            return False
        except Exception as e:
            print("Error checking if YouTube is open:", e)
            return False


    def focus_youtube(self):
        try:
            for window in gw.getAllWindows():
                if window.title and "youtube" in window.title.lower():
                    window.activate()  # Bring the window to the front
                    return True
            return False
        except Exception as e:
            print("Error focusing YouTube window:", e)
            return False


class FloatingGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        # Set overall dark theme and 3D-style border where applicable.
        self.geometry("900x400+1000+10")
        self.configure(bg="#121212")
        self.resizable(False, False)
        self.title("NURA Voice - PC's AI-voice Assistant")
        self.frames = []  # or however you're loading your GIF frames

        
        # Chat area on left with 3D border
        self.chat_frame = tk.Frame(self, bg="#1e1e1e", relief="groove", bd=2)
        self.chat_frame.place(x=20, y=0, width=360, height=370)
        self.text_area = scrolledtext.ScrolledText(self.chat_frame, wrap=tk.WORD, 
                                                   font=("Arial", 12), bg="#1e1e1e", fg="white", insertbackground="white")
        self.text_area.pack(fill=tk.BOTH, expand=True)
        
        # Animated GIF on right - increased size, fixed dimensions
        self.gif_label = tk.Label(self, bg="#121212")
        self.gif_label.place(x=400, y=0, width=500, height=400)
        self.load_and_animate_gif("images/imx.gif", (500, 400))
        
        
        # State canvas at top-left
        self.state_canvas = tk.Canvas(self, width=80, height=80, bg="#121212", highlightthickness=0)
        self.state_canvas.place(x=20, y=10)
        
        self.jarvis = Jarvis(self)
        threading.Thread(target=self.jarvis.listen, daemon=True).start()

    def load_and_animate_gif(self, filename, size):
        try:
            self.gif_image = Image.open(filename)
            self.frames = []
            self.delays = []

            for frame in ImageSequence.Iterator(self.gif_image):
                resized_frame = frame.copy().resize(size)
                photo = ImageTk.PhotoImage(resized_frame)
                self.frames.append(photo)

                # Get frame duration, fallback to 100ms if not found
                delay = frame.info.get('duration', 100)
                self.delays.append(max(delay, 20))  # Avoid 0ms delays

            self.frame_index = 0
            self.animate_gif()

        except Exception as e:
            print("Error loading GIF:", e)

    def animate_gif(self):
        try:
            # Ensure that frames and delays are not empty and of the same length
            if self.frames and self.delays and len(self.frames) == len(self.delays):
                self.gif_label.config(image=self.frames[self.frame_index])
                delay = self.delays[self.frame_index]
                
                # Increment the frame index and wrap it around
                self.frame_index = (self.frame_index + 1) % len(self.frames)
                
                # Set the next frame after the specified delay
                self.after(delay, self.animate_gif)
            else:
                print("Error: Frames or delays list is empty or mismatched")
        except Exception as e:
            print(f"Error in animate_gif: {e}")


        
    def switch_gif(self, gif_name):
        """Finds the correct path for the GIF, whether running as a script or a compiled .exe"""
        
        # Handle PyInstaller extraction directory
        base_path = getattr(sys, '_MEIPASS', os.path.abspath(os.path.dirname(__file__)))
        full_path = os.path.join(base_path, "images", gif_name)  # Ensure correct path

        print(f"Switching to GIF: {full_path}")  # Debugging to confirm correct path

        if os.path.exists(full_path):
            self.load_and_animate_gif(full_path, (500, 400))
        else:
            print(f"Error: GIF not found at {full_path}")


    def display_results(self, query, response):
        self.text_area.insert(tk.END, f"\n 🤔💭 You: {query}\n𓆩ꨄ︎𓆪 NURA Voice: {response}\n")
        self.text_area.see(tk.END)

    def set_state(self, state):
        self.state_canvas.delete("all")
        self.state_canvas.create_text(40, 40, text=state, font=("Arial", 10), fill="blue")



if __name__ == "__main__":
    app = FloatingGUI()
    app.mainloop()
