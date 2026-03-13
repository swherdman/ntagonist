# ntagonist

A client-side web app that generates `.bin` memory dumps for NTAG213/215/216 NFC tags. Load the output onto devices like the Chameleon Ultra.

**[Try it live](https://swherdman.github.io/ntagonist/)**

## Features

- Fully client-side — no server, no dependencies, no build step
- Auto-selects smallest NTAG variant that fits the data
- Optional custom UID and file naming
- Hex preview of raw binary output
- Save/load profiles via localStorage

## Supported Record Types

- **vCard** — common fields shown by default, with additional fields available under Advanced and Legacy toggles
- **URL** — with NFC Forum URI prefix compression
- **Text** — plain text with language code
- **WiFi** — WPA/WPA2 network credentials via WSC encoding

## Usage

Serve the files with any HTTP server:

```
python3 -m http.server 8000
```

Open in a browser, fill in fields, and download the `.bin` file.
