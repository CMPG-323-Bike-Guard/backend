# Card bridge

Runs on the laptop that has the ACR122U card reader attached. It reads a tapped
card's UID and sends it to the API (`POST /cards/tap`). Admins link cards to
students in the app; the gate check uses that link.

## Setup
1. `pip install -r requirements.txt`
2. Copy `.env.bridge.example` to `.env.bridge` and set `CARD_BRIDGE_KEY` to the same
   value as the API's `CARD_BRIDGE_KEY`.
3. Double-click `start-bridge.bat` (add `-Local` to the .ps1 to target localhost).