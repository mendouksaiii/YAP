import requests
import os
import json

ELEVENLABS_API_KEY = "sk_3e7ddb42aad0ccca69e6f584ff37630e7a38930343125062"
VOICES_DIR = "C:/Users/HP/yap/voices"

devs = [
    ("linus", "Linus Torvalds", "Brutal, no-filter Linux creator"),
    ("carmack", "John Carmack", "Deep, analytical game engine pioneer"),
    ("dhh", "DHH", "Opinionated Rails creator with Danish accent"),
    ("uncle_bob", "Uncle Bob", "Clean code enforcer, SOLID principles"),
    ("rich_hickey", "Rich Hickey", "Philosophical Clojure creator"),
    ("bjarne", "Bjarne Stroustrup", "C++ creator, measured academic tone"),
    ("guido", "Guido van Rossum", "Python creator, Dutch accent"),
    ("prime", "ThePrimeagen", "Chaotic energetic Rust/Neovim evangelist"),
    ("theo", "Theo t3gg", "TypeScript enthusiast, modern web stack"),
    ("kelsey", "Kelsey Hightower", "Calm authoritative Kubernetes expert"),
]

voice_ids = {}

for filename, name, description in devs:
    mp3_path = os.path.join(VOICES_DIR, f"{filename}.mp3")
    
    print(f"Cloning {name}...")
    
    with open(mp3_path, "rb") as f:
        response = requests.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            data={
                "name": f"Yap - {name}",
                "description": description,
            },
            files={"files": (f"{filename}.mp3", f, "audio/mpeg")},
        )
    
    if response.status_code == 200:
        voice_id = response.json()["voice_id"]
        voice_ids[filename] = voice_id
        print(f"  OK {name}: {voice_id}")
    else:
        print(f"  FAIL {name}: {response.status_code} - {response.text}")

# Save voice IDs to file
with open("C:/Users/HP/yap/voice_ids.json", "w") as f:
    json.dump(voice_ids, f, indent=2)

print("\nDone! Voice IDs saved to voice_ids.json")
