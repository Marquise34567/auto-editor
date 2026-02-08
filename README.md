AutoEditor is a premium AI auto-editor built with the Next.js App Router and Tailwind CSS.

## Getting Started

Run the development server:

```bash
npm run dev
```

Then open http://localhost:3000.

## Key Routes

- Landing page: /
- Editor: /editor
- API analyze: POST /api/analyze (multipart form-data with file)
- API generate: POST /api/generate (JSON)
- API job status: GET /api/jobs/:id

## Optional Environment Variables

- FFMPEG_PATH: Custom path to ffmpeg
- FFPROBE_PATH: Custom path to ffprobe
- WHISPER_ENABLED: Set to "true" to enable Whisper CLI transcription
- WHISPER_CLI: Path to the whisper executable
- WHISPER_MODEL: Model name (default: tiny)

## Notes

- Generated clips are saved under public/outputs/<jobId>/
- Uploads are stored in tmp/uploads
