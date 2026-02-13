
import mediapipe as mp
try:
    print("MediaPipe Attributes:", dir(mp))
    print("Solutions:", mp.solutions)
except Exception as e:
    print("Error:", e)
