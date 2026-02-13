
try:
    import mediapipe.python.solutions as solutions
    print("Found mp.python.solutions")
except ImportError:
    print("Failed to import mediapipe.python.solutions")

try:
    import mediapipe as mp
    print("MP:", dir(mp))
except:
    pass
