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
