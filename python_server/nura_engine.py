import os
import subprocess
import webbrowser
import psutil
import pyautogui
import platform
import requests
import time

class NuraEngine:
    def __init__(self):
        # Fail-safe to prevent mouse from taking over if things go wrong
        pyautogui.FAILSAFE = True
        self.serpapi_key = "4506745ad63a241d0657fa7057da9f73e39f53e25eff92853649fe2923fa6b39"

    def get_news(self):
        """Fetches top news from India using SerpApi."""
        try:
            params = {
                "engine": "google_news",
                "q": "India news",
                "hl": "en",
                "gl": "in",
                "api_key": self.serpapi_key,
                "num": "10"
            }
            response = requests.get("https://serpapi.com/search", params=params)
            data = response.json()
            return data.get("news_results", [])
        except Exception as e:
            return {"error": str(e)}

    def get_system_stats(self):
        """Returns battery and charging status."""
        try:
            battery = psutil.sensors_battery()
            if battery:
                return {
                    "percent": round(battery.percent, 1),
                    "power_plugged": battery.power_plugged,
                    "status": "charging" if battery.power_plugged else "discharging"
                }
            return {"error": "Battery information unavailable"}
        except Exception as e:
            return {"error": str(e)}

    def set_volume(self, action):
        """Controls system volume."""
        try:
            if action == "up":
                pyautogui.press("volumeup")
            elif action == "down":
                pyautogui.press("volumedown")
            elif action == "mute":
                pyautogui.press("volumemute")
            return {"status": "success", "action": action}
        except Exception as e:
            return {"error": str(e)}

    def media_control(self, action):
        """Controls media playback."""
        try:
            key_map = {
                "playprobe": "playpause", # specific to some keyboards
                "play": "playpause",
                "pause": "playpause",
                "next": "nexttrack",
                "prev": "prevtrack",
                "stop": "stop"
            }
            if action in key_map:
                pyautogui.press(key_map[action])
                return {"status": "success", "action": action}
            return {"error": "Invalid media command"}
        except Exception as e:
            return {"error": str(e)}

    def open_application(self, app_name):
        """Opens an application using Windows Start Menu search."""
        try:
            pyautogui.hotkey('win')
            pyautogui.sleep(0.5)
            pyautogui.write(app_name)
            pyautogui.sleep(1) # Wait for search
            pyautogui.press('enter')
            return {"status": "success", "message": f"Opening {app_name}"}
        except Exception as e:
            return {"error": str(e)}

    def open_website(self, url):
        """Opens a website in the default browser."""
        try:
            if not url.startswith('http'):
                url = 'https://' + url
            webbrowser.open(url)
            return {"status": "success", "url": url}
        except Exception as e:
            return {"error": str(e)}

    def google_search(self, query):
        """Performs a Google search."""
        try:
            url = f"https://www.google.com/search?q={query}"
            webbrowser.open(url)
            return {"status": "success", "query": query}
        except Exception as e:
            return {"error": str(e)}

    # --- ADVANCED AUTOMATION FEATURES ---

    def whatsapp_automation(self, action, data=None):
        """Handles WhatsApp automation."""
        try:
            if action == "open":
                webbrowser.open("https://web.whatsapp.com")
                return {"status": "success", "message": "Opening WhatsApp Web"}
            
            elif action == "send_message":
                contact = data.get("contact")
                message = data.get("message")
                
                # 1. Open WhatsApp Web
                webbrowser.open("https://web.whatsapp.com")
                # Increased wait time for slow loading
                time.sleep(10) 
                
                # 2. Focus Search Bar (Ctrl + Alt + / is standard, but Tab might be safer if that fails)
                # Let's try to click the search bar coordinates if possible, but we don't know screen resolution.
                # Sticking to hotkeys but with redundancy.
                
                # Attempt 1: Standard Hotkey
                pyautogui.hotkey('ctrl', 'alt', '/')
                time.sleep(1)
                
                # Attempt 2: Tab navigation (backup) - usually search is the first focusable element
                # repeated tabs might get there
                
                # 3. Clear any existing text
                pyautogui.hotkey('ctrl', 'a')
                pyautogui.press('backspace') 
                
                # 4. Type Contact Name
                pyautogui.write(contact, interval=0.1) # Slower typing
                time.sleep(2) # Wait for search results
                
                # 5. Select Contact
                pyautogui.press('down') # Move to first result
                time.sleep(0.5)
                pyautogui.press('enter') # Open chat
                time.sleep(1)
                
                # 6. Type Message
                pyautogui.write(message, interval=0.1)
                time.sleep(0.5)
                pyautogui.press('enter') # Send
                
                return {"status": "success", "message": f"Sent message to {contact}"}
            
            return {"error": "Invalid action"}
        except Exception as e:
            return {"error": str(e)}

    def instagram_automation(self, action):
        """Handles Instagram automation."""
        try:
            if action == "open":
                webbrowser.open("https://www.instagram.com")
            elif action == "scroll_down" or action == "next_reel":
                pyautogui.press('down')
            elif action == "scroll_up" or action == "prev_reel":
                pyautogui.press('up')
            elif action == "mute":
                pyautogui.press('m')
            elif action == "like":
                pyautogui.press('l') # Often 'l' or double click, stick to basic for now
            
            return {"status": "success", "action": action}
        except Exception as e:
            return {"error": str(e)}

    def youtube_automation(self, action, query=None):
        """Handles YouTube automation."""
        try:
            if action == "open":
                webbrowser.open("https://www.youtube.com")
            elif action == "search_play":
                webbrowser.open(f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}")
                # Wait for load then play first video (simplified from NuraVoice which used complex tab/enter sequence)
                # Improving reliability: Just opening search is safer than blind tabbing
                # If specifically requested "play", we can try to click the first video
                time.sleep(5)
                pyautogui.press('tab') # Skip search box?
                # This is flaky without visual anchors. 
                # NuraVoice used 3 tabs then enter. Let's try that.
                for _ in range(4): # 3 or 4 tabs usually hits the first video
                    pyautogui.press('tab')
                    time.sleep(0.2)
                pyautogui.press('enter')
                
            elif action == "play_pause":
                pyautogui.press('k')
            elif action == "mute":
                pyautogui.press('m')
            elif action == "fullscreen":
                pyautogui.press('f')
            elif action == "next":
                pyautogui.hotkey('shift', 'n')
            
            return {"status": "success", "action": action}
        except Exception as e:
            return {"error": str(e)}

    def file_operations(self, action, path=None, content=None):
        """Handles File System Operations."""
        try:
            desktop = os.path.join(os.environ["USERPROFILE"], "Desktop")
            
            # Default to desktop if path is just a name
            if path and not os.path.isabs(path):
                target_path = os.path.join(desktop, path)
            else:
                target_path = path

            if action == "create_folder":
                os.makedirs(target_path, exist_ok=True)
                return {"status": "success", "path": target_path}
            
            elif action == "create_file":
                with open(target_path, 'w') as f:
                    f.write(content or "")
                return {"status": "success", "path": target_path}
            
            elif action == "write_file":
                with open(target_path, 'a') as f: # Append mode
                    f.write(content or "")
                return {"status": "success", "path": target_path}
                
            return {"error": "Invalid action"}
        except Exception as e:
            return {"error": str(e)}

    def text_editor_automation(self, action, text=None):
        """Handles Text Editor automation."""
        try:
            if action == "open":
                subprocess.Popen(["notepad"])
            elif action == "type":
                if text:
                    pyautogui.typewrite(text, interval=0.01)
            elif action == "close":
                pyautogui.hotkey('alt', 'f4')
                pyautogui.press('enter') # Save? or close dialog? Danger. 
                # NuraVoice uses Ctrl+S then Alt+F4.
                
            return {"status": "success", "action": action}
        except Exception as e:
            return {"error": str(e)}
