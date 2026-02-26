import os
import time
import urllib.parse
import threading
from datetime import datetime

# --- SAFE IMPORTS BLOCK ---
try:
    import psutil
except ImportError:
    psutil = None

try:
    import webbrowser
except ImportError:
    webbrowser = None

try:
    import subprocess
except ImportError:
    subprocess = None

try:
    import pyautogui
except ImportError:
    pyautogui = None

try:
    import pyperclip
except ImportError:
    pyperclip = None

try:
    import requests
except ImportError:
    requests = None

try:
    import ctypes
except ImportError:
    ctypes = None

try:
    import smtplib
    from email.message import EmailMessage
except ImportError:
    smtplib = None
    EmailMessage = None

# Windows Toast
try:
    from win10toast import ToastNotifier
except ImportError:
    ToastNotifier = None

# Audio Control
try:
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    from comtypes import CLSCTX_ALL
except ImportError:
    AudioUtilities = None
    IAudioEndpointVolume = None
    CLSCTX_ALL = None

# Brightness Control
try:
    import screen_brightness_control as sbc
except ImportError:
    sbc = None

# Translator
try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

# WhatsApp fallback
try:
    import pywhatkit
except ImportError:
    pywhatkit = None
# --------------------------

class NuraEngine:
    def __init__(self):
        if pyautogui:
            pyautogui.FAILSAFE = True
        
        # Mapping for open_application
        self.app_map = {
            "notepad": "notepad",
            "calculator": "calc",
            "chrome": "chrome",
            "firefox": "firefox",
            "edge": "msedge",
            "vscode": "code",
            "explorer": "explorer",
            "spotify": "spotify",
            "whatsapp": "whatsapp",
            "telegram": "telegram",
            "discord": "update", # Often discord is triggered via update.exe in localappdata, fallback handles it
            "slack": "slack",
            "word": "winword",
            "excel": "excel",
            "powerpoint": "powerpnt",
            "outlook": "outlook",
            "paint": "mspaint",
            "cmd": "cmd",
            "powershell": "powershell",
            "task manager": "taskmgr",
            "control panel": "control",
            "settings": "ms-settings:"
        }

    # --- HELPER METHODS ---
    def _is_process_running(self, name: str) -> bool:
        """Check if there is any running process that contains the given name."""
        if not psutil:
            return False
            
        name_lower = name.lower()
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'] and name_lower in proc.info['name'].lower():
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return False

    def _encode_url(self, text: str) -> str:
        return urllib.parse.quote(text)

    # --- 1. WHATSAPP ---
    def send_whatsapp(self, contact: str, message: str):
        try:
            # a) If WhatsApp Desktop is running
            if pyautogui and self._is_process_running("whatsapp"):
                # Bring to front hack (press win, type whatsapp, enter)
                pyautogui.hotkey('win')
                time.sleep(0.5)
                pyautogui.write('whatsapp')
                time.sleep(0.5)
                pyautogui.press('enter')
                time.sleep(2) # wait for window to surface
                
                # Ctrl+F to search
                pyautogui.hotkey('ctrl', 'f')
                time.sleep(0.5)
                pyautogui.write(contact)
                time.sleep(1.5)
                pyautogui.press('down')
                pyautogui.press('enter')
                time.sleep(1)
                
                # Type message and send
                pyautogui.write(message)
                time.sleep(0.5)
                pyautogui.press('enter')
                return {"status": "success", "method": "desktop_app"}
                
            # b) pywhatkit fallback
            if pywhatkit:
                # Requires phone number unfortunately in pywhatkit, but we try if contact is a "+number"
                if contact.startswith("+"):
                    now = datetime.now()
                    minutes = now.minute + 2
                    hours = now.hour
                    if minutes >= 60:
                        minutes -= 60
                        hours = (hours + 1) % 24
                    pywhatkit.sendwhatmsg(contact, message, hours, minutes, wait_time=15, tab_close=True)
                    return {"status": "success", "method": "pywhatkit"}
            
            # c) Final fallback browser link (WhatsApp Web)
            if webbrowser and pyautogui:
                # If contact is a pure phone number format, use the send API
                if contact.startswith("+") and contact[1:].isdigit():
                    encoded_msg = self._encode_url(message)
                    url = f"https://web.whatsapp.com/send?phone={contact}&text={encoded_msg}"
                    webbrowser.open(url)
                    time.sleep(12)  # Wait for web.whatsapp.com to fully load the chat
                    pyautogui.press('enter')
                else:
                    # Otherwise, just open WhatsApp Web, search for the contact name, and send
                    webbrowser.open("https://web.whatsapp.com")
                    time.sleep(12) # Wait for page load
                    
                    # Search
                    pyautogui.hotkey('ctrl', 'alt', '/') # WhatsApp web search shortcut
                    time.sleep(1)
                    pyautogui.write(contact)
                    time.sleep(2)
                    pyautogui.press('enter')
                    time.sleep(1)
                    
                    # Type message
                    pyautogui.write(message)
                    time.sleep(0.5)
                    pyautogui.press('enter')

            return {"status": "success", "method": "browser_fallback"}
        except Exception as e:
            return {"error": str(e)}

    # --- 2. EMAIL ---
    def send_email(self, recipient: str, subject: str, body: str):
        try:
            sender = os.environ.get("GMAIL_SENDER")
            password = os.environ.get("GMAIL_APP_PASSWORD")
            
            # a) SMTP Silent Send
            if sender and password and smtplib and EmailMessage:
                msg = EmailMessage()
                msg.set_content(body)
                msg['Subject'] = subject
                msg['From'] = sender
                msg['To'] = recipient
                
                server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
                server.login(sender, password)
                server.send_message(msg)
                server.quit()
                return {"status": "success", "method": "smtp_ssl"}
            
            # b) Browser Fallback
            encoded_su = self._encode_url(subject)
            encoded_body = self._encode_url(body)
            url = f"https://mail.google.com/mail/?view=cm&to={recipient}&su={encoded_su}&body={encoded_body}"
            if webbrowser:
                webbrowser.open(url)
            return {"status": "success", "method": "browser_compose"}
        except Exception as e:
            return {"error": str(e)}

    # --- 3. SEARCH GOOGLE ---
    def search_google(self, query: str):
        try:
            url = f"https://www.google.com/search?q={self._encode_url(query)}"
            if webbrowser:
                webbrowser.open(url)
            return {"status": "success", "query": query}
        except Exception as e:
            return {"error": str(e)}

    # --- 4. SEARCH YOUTUBE ---
    def search_youtube(self, query: str):
        try:
            url = f"https://www.youtube.com/results?search_query={self._encode_url(query)}"
            if webbrowser:
                webbrowser.open(url)
            return {"status": "success", "query": query}
        except Exception as e:
            return {"error": str(e)}

    # --- 5. PLAY MUSIC ---
    def play_music(self, query: str):
        try:
            encoded_query = self._encode_url(query)
            # a) Check Spotify process
            if self._is_process_running("spotify"):
                os.startfile(f"spotify:search:{encoded_query}")
                return {"status": "success", "method": "spotify_running"}
            
            # b) Try launching spotify via shell, wait, then search
            try:
                if subprocess:
                    subprocess.Popen("spotify", shell=True)
                    time.sleep(5)
                    os.startfile(f"spotify:search:{encoded_query}")
                    return {"status": "success", "method": "spotify_launched"}
            except Exception:
                pass
                
            # c) YouTube Audio Fallback
            yt_query = self._encode_url(f"{query} official audio")
            if webbrowser:
                webbrowser.open(f"https://www.youtube.com/results?search_query={yt_query}")
            return {"status": "success", "method": "youtube_fallback"}
        except Exception as e:
            return {"error": str(e)}

    # --- 6. MUSIC CONTROL ---
    def music_control(self, action: str):
        try:
            if not pyautogui:
                return {"error": "pyautogui not installed for media keys"}
                
            action = action.lower()
            key_map = {
                "play": "playpause",
                "pause": "playpause",
                "next": "nexttrack",
                "previous": "prevtrack",
                "prev": "prevtrack",
                "stop": "stop"
            }
            if action in key_map:
                pyautogui.press(key_map[action])
                return {"status": "success", "action": action}
            return {"error": f"Unknown action: {action}"}
        except Exception as e:
            return {"error": str(e)}

    # --- 7. VOLUME CONTROL ---
    def control_volume(self, action: str, value: int = None):
        try:
            action = action.lower()
            
            # Try Pycaw first
            try:
                if AudioUtilities and IAudioEndpointVolume and CLSCTX_ALL:
                    devices = AudioUtilities.GetSpeakers()
                    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                    volume = interface.QueryInterface(IAudioEndpointVolume)
                    
                    if action == "mute":
                        volume.SetMute(1, None)
                        return {"status": "success", "action": "mute"}
                    elif action == "unmute":
                        volume.SetMute(0, None)
                        return {"status": "success", "action": "unmute"}
                    elif action == "set" and value is not None:
                        scalar_val = max(0.0, min(1.0, value / 100.0))
                        volume.SetMasterVolumeLevelScalar(scalar_val, None)
                        return {"status": "success", "action": f"set {value}%"}
                    elif action in ["up", "down"]:
                        current_scalar = volume.GetMasterVolumeLevelScalar()
                        step = 0.1 # 10%
                        new_scalar = current_scalar + step if action == "up" else current_scalar - step
                        new_scalar = max(0.0, min(1.0, new_scalar))
                        volume.SetMasterVolumeLevelScalar(new_scalar, None)
                        return {"status": "success", "action": action}
            except Exception as e:
                print(f"Pycaw failed, using fallback: {e}")
                
            # Fallback to PyAutoGUI
            if pyautogui:
                if action == "up":
                    for _ in range(5): pyautogui.press("volumeup")  # roughly 10%
                elif action == "down":
                    for _ in range(5): pyautogui.press("volumedown")
                elif action in ["mute", "unmute"]:
                    pyautogui.press("volumemute")
                elif action == "set" and value is not None:
                    # Blind fallback: mute, then press up X times
                    pyautogui.press("volumemute") # mute
                    pyautogui.press("volumemute") # unmute to be safe
                    for _ in range(50): pyautogui.press("volumedown") # force to 0
                    clicks = int(value / 2) # each click is usually 2%
                    for _ in range(clicks): pyautogui.press("volumeup")
                    
                return {"status": "success", "action": action, "method": "fallback"}
            else:
                return {"error": "Neither pycaw nor pyautogui available"}
        except Exception as e:
             return {"error": str(e)}

    # --- 8. BRIGHTNESS ---
    def control_brightness(self, action: str, value: int = None):
        try:
            if not sbc:
                return {"error": "screen_brightness_control module not installed"}
            
            current = sbc.get_brightness(display=0)[0]
            
            if action == "set" and value is not None:
                sbc.set_brightness(value)
            elif action == "up":
                sbc.set_brightness(min(100, current + 10))
            elif action == "down":
                sbc.set_brightness(max(0, current - 10))
                
            new_val = sbc.get_brightness(display=0)[0]
            return {"status": "success", "brightness": new_val}
        except Exception as e:
            return {"error": str(e)}

    # --- 9. SCREENSHOT ---
    def take_screenshot(self, save_path: str = None):
        try:
            if not pyautogui:
                return {"error": "pyautogui not installed for screenshots"}
                
            if not save_path:
                desktop = os.path.join(os.environ["USERPROFILE"], "Desktop")
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(desktop, f"nexora_screenshot_{timestamp}.png")
                
            screenshot = pyautogui.screenshot()
            screenshot.save(save_path)
            return {"status": "success", "path": save_path}
        except Exception as e:
            return {"error": str(e)}

    # --- 10. LOCK SCREEN ---
    def lock_screen(self):
        try:
            if ctypes:
                ctypes.windll.user32.LockWorkStation()
                return {"status": "success", "action": "locked"}
            return {"error": "ctypes not available"}
        except Exception as e:
            return {"error": str(e)}

    # --- 11. SHUTDOWN ---
    def shutdown(self, delay_minutes: int = 0):
        try:
            delay_seconds = delay_minutes * 60
            os.system(f"shutdown /s /t {delay_seconds}")
            return {"status": "success", "action": f"shutdown in {delay_minutes} minutes"}
        except Exception as e:
            return {"error": str(e)}

    # --- 12. RESTART ---
    def restart(self):
        try:
            os.system("shutdown /r /t 0")
            return {"status": "success", "action": "restart"}
        except Exception as e:
            return {"error": str(e)}

    # --- 13. OPEN FILE ---
    def open_file(self, filepath: str):
        try:
            os.startfile(filepath)
            return {"status": "success", "path": filepath}
        except Exception as e:
            return {"error": str(e)}

    # --- 14. CREATE FILE ---
    def create_file(self, filepath: str, content: str = ""):
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"status": "success", "path": filepath}
        except Exception as e:
            return {"error": str(e)}

    # --- 15. CLIPBOARD COPY ---
    def copy_to_clipboard(self, text: str):
        try:
            if pyperclip:
                pyperclip.copy(text)
                return {"status": "success", "action": "copied"}
            return {"error": "pyperclip module not installed"}
        except Exception as e:
            return {"error": str(e)}

    # --- 16. SET REMINDER ---
    def _fire_toast(self, title: str):
        if ToastNotifier:
            toaster = ToastNotifier()
            toaster.show_toast("Nexora Reminder", title, duration=10, threaded=True)
        else:
            print(f"REMINDER: {title}")

    def set_reminder(self, title: str, datetime_str: str):
        try:
            # Parse 'YYYY-MM-DD HH:MM'
            target_time = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
            now = datetime.now()
            delay_seconds = (target_time - now).total_seconds()
            
            if delay_seconds <= 0:
                return {"error": "Datetime is in the past."}
                
            t = threading.Timer(delay_seconds, self._fire_toast, args=[title])
            t.daemon = True
            t.start()
            
            return {"status": "success", "title": title, "scheduled_in_seconds": delay_seconds}
        except ValueError:
            return {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM"}
        except Exception as e:
            return {"error": str(e)}

    # --- 17. TRANSLATE TEXT ---
    def translate_text(self, text: str, target_lang: str):
        try:
            if GoogleTranslator:
                lang_map = {
                    "hindi": "hi", "french": "fr", "spanish": "es", "german": "de",
                    "italian": "it", "japanese": "ja", "korean": "ko", "chinese": "zh-CN",
                    "russian": "ru", "portuguese": "pt", "arabic": "ar"
                }
                
                target = target_lang.lower().strip()
                target_code = lang_map.get(target, target)
                
                translated = GoogleTranslator(source='auto', target=target_code).translate(text)
                return {"status": "success", "translated_text": translated, "target": target_code}
            
            # Browser fallback for translation
            encoded_text = self._encode_url(text)
            encoded_lang = self._encode_url(target_lang)
            if webbrowser:
                url = f"https://translate.google.com/?sl=auto&tl={encoded_lang}&text={encoded_text}&op=translate"
                webbrowser.open(url)
            return {"status": "success", "method": "browser_fallback", "original": text}
        except Exception as e:
            return {"error": str(e)}

    # --- 18. GET WEATHER ---
    def get_weather(self, city: str):
        try:
            encoded_city = self._encode_url(city)
            if webbrowser:
                webbrowser.open(f"https://www.google.com/search?q=weather+in+{encoded_city}")
            return {"status": "success", "method": "webbrowser", "weather": city}
        except Exception as e:
            return {"error": str(e)}

    # --- 19. OPEN APPLICATION ---
    def open_application(self, app_name: str):
        try:
            name_lower = app_name.lower().strip()
            # Try exact map match first
            exe_name = self.app_map.get(name_lower, name_lower)
            
            try:
                if subprocess:
                    subprocess.Popen(exe_name, shell=True)
                    return {"status": "success", "app": app_name, "method": "subprocess.Popen"}
            except Exception:
                pass
                
            # Fallback to start command
            try:
                if subprocess:
                    subprocess.run(['start', exe_name], shell=True, check=True)
                    return {"status": "success", "app": app_name, "method": "start command fallback"}
            except Exception:
                pass
                
            # Final PyAutoGUI search fallback
            if pyautogui:
                pyautogui.hotkey('win')
                time.sleep(0.5)
                pyautogui.write(app_name)
                time.sleep(1)
                pyautogui.press('enter')
                return {"status": "success", "app": app_name, "method": "pyautogui start menu search"}
                
            return {"error": "Failed to open app and pyautogui not available for fallback"}
        except Exception as e:
            return {"error": str(e)}

    # --- 20. OPEN BROWSER ---
    def open_browser(self, url: str):
        try:
            if not url.startswith('http'):
                url = 'https://' + url
            if webbrowser:
                webbrowser.open(url)
            return {"status": "success", "url": url}
        except Exception as e:
            return {"error": str(e)}
