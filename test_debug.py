import requests
import json

url = "http://localhost:5000/api/chat"
headers = {"Content-Type": "application/json"}
data = {"message": "Hello"}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, headers=headers, json=data, stream=True)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code != 200:
        print("Error Response Text:")
        print(response.text)
    else:
        print("Stream started...")
        for line in response.iter_lines():
            if line:
                print(line.decode('utf-8'))

except Exception as e:
    print(f"Exception: {e}")
