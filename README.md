# Nova / FaceIT

A face-only conversational AI prototype using browser speech recognition, contextual AI responses, native speech synthesis, and phoneme-informed viseme animation.

## Run

```bash
npm start
```

Open `http://localhost:4173` when running the project on your own computer. In a cloud workspace, open the workspace's forwarded/preview URL for port `4173` instead—`localhost` in your browser refers to your computer, not the remote workspace. The server binds to `0.0.0.0` by default so preview forwarding can reach it.

For live AI responses, set `OPENAI_API_KEY`; without it, Nova uses a small offline demonstration brain so the entire voice loop remains testable.

Microphone and speech recognition support is best in Chromium. Production deployments should use HTTPS so browsers permit microphone access.
