import requests
import time

BASE_URL = "http://localhost:5001/api"

def test_system_stats():
    print("\n[TEST] System Stats...")
    try:
        res = requests.post(f"{BASE_URL}/system/command", json={"action": "battery"})
        print("Response:", res.json())
    except Exception as e:
        print("Failed:", e)

def test_news():
    print("\n[TEST] News Fetch...")
    try:
        res = requests.get(f"{BASE_URL}/news")
        data = res.json()
        print(f"News items fetched: {len(data)}")
        if len(data) > 0:
            print("Title 1:", data[0].get('title'))
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    print("Testing NURA Endpoints...")
    test_system_stats()
    test_news()
