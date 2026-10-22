import os, time

for name in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
    os.environ.pop(name, None)

import requests
from smartcard.System import readers
from smartcard.Exceptions import NoCardException, CardConnectionException

API = os.environ.get("API_URL", "http://localhost:3000/api/v1").rstrip("/")
KEY = os.environ["CARD_BRIDGE_KEY"]
GATE_ID = os.environ.get("GATE_ID")
GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]

def main():
    available = readers()
    if not available:
        raise SystemExit("No PC/SC reader found. Is the reader plugged in?")
    print("Using reader:", available[0])
    last_uid = None
    while True:
        try:
            conn = available[0].createConnection()
            conn.connect()
            data, sw1, sw2 = conn.transmit(GET_UID)
            uid = "".join(f"{b:02X}" for b in data)
        except (NoCardException, CardConnectionException):
            last_uid = None
            time.sleep(0.3)
            continue
        if uid == last_uid:
            time.sleep(0.3)
            continue
        last_uid = uid

        body = {"uid": uid}
        if GATE_ID:
            body["gateId"] = GATE_ID
        try:
            r = requests.post(f"{API}/cards/tap", json=body, headers={"x-bridge-key": KEY}, timeout=10)
            if r.ok:
                print(f"Card {r.json()['cardRef']}:", "linked to a student" if r.json()["linked"] else "not linked yet")
            else:
                print("Failed:", r.status_code, r.text)
        except (requests.RequestException, OSError) as error:
            print("Could not reach the backend:", error)

main()