# Emerald 

In-browser speech recognition with word-level timestamps, powered by Transformers.js and ONNX Runtime.

## Features

- 🎤 **In-browser speech recognition** - No server calls, all processing happens locally
- ⏱️ **Word-level timestamps** - Navigate to specific parts of your audio/video by clicking on words
- 🌐 **Multi-language support** - Transcribe content in various languages
- 🖥️ **WebGPU acceleration** - Utilizes your GPU for faster processing when available

## Usage

1. **Load the model** - Click the "Load Model" button when you first open the application
2. **Select your media** - Upload an audio/video file or record directly from your microphone
3. **Choose language** - Select the language of the audio content
4. **Transcribe** - Click the "Transcribe Audio" button to start processing
5. **Navigate** - Click on any word in the transcript to jump to that timestamp in the audio/video

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
