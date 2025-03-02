import { pipeline } from "@huggingface/transformers";

const PER_DEVICE_CONFIG = {
  webgpu: {
    dtype: {
      encoder_model: "fp32",
      decoder_model_merged: "q4",
    },
    device: "webgpu",
  },
  wasm: {
    dtype: "q8",
    device: "wasm",
  },
};

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class PipelineSingeton {
  static model_id = "onnx-community/whisper-base_timestamped";
  static instance = null;

  static async getInstance(progress_callback = null, device = "webgpu") {
    if (!this.instance) {
      this.instance = pipeline("automatic-speech-recognition", this.model_id, {
        ...PER_DEVICE_CONFIG[device],
        progress_callback,
      });
    }
    return this.instance;
  }
}

async function load({ device }) {
  self.postMessage({
    status: "loading",
    data: `Loading model (${device})...`,
  });

  // Load the pipeline and save it for future use.
  const transcriber = await PipelineSingeton.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  }, device);

  if (device === "webgpu") {
    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    await transcriber(new Float32Array(16_000), {
      language: "en",
    });
  }

  self.postMessage({ status: "ready" });
}

async function run({ audio, language }) {
  const transcriber = await PipelineSingeton.getInstance();

  // Initial progress update
  self.postMessage({ 
    status: "processing", 
    progress: 0,
    message: "Preparing audio"
  });

  const startTime = performance.now();
  
  // Calculate the total number of chunks based on audio length and chunk size
  const audioLengthSeconds = audio.length / 16000; // Assuming 16kHz sample rate
  const chunkLengthS = 30; // Same as used in the transcriber options
  const totalChunks = Math.ceil(audioLengthSeconds / chunkLengthS);
  
  // Track which chunk we're currently processing
  let processedChunks = 0;
  
  // Set up a minimum progress update to ensure the UI shows something
  // This handles the case where callback might not fire as expected
  const progressInterval = setInterval(() => {
    const elapsedTime = performance.now() - startTime;
    
    // If we've been processing for a while with no updates, show some progress
    if (processedChunks === 0 && elapsedTime > 2000) {
      self.postMessage({ 
        status: "processing", 
        progress: 5,
        message: "Processing audio..."
      });
    }
  }, 2000);

  try {
    // Process the audio with chunk tracking
    const result = await transcriber(audio, {
      language,
      return_timestamps: "word",
      chunk_length_s: chunkLengthS,
      callback: (chunk) => {
        // Increment processed chunks
        processedChunks++;
        
        // Calculate progress based on chunks (0-95%)
        const progress = Math.min(
          Math.round((processedChunks / totalChunks) * 95), 
          95
        );
        
        // Calculate time remaining based on average time per chunk
        const elapsedTime = performance.now() - startTime;
        const timePerChunk = elapsedTime / processedChunks;
        const remainingChunks = totalChunks - processedChunks;
        const estimatedTimeRemaining = Math.round((timePerChunk * remainingChunks) / 1000);
        
        self.postMessage({ 
          status: "processing", 
          progress,
          estimatedTimeRemaining,
          message: `Processing chunk ${processedChunks}/${totalChunks}`
        });
        
        return true; // Continue processing
      }
    });
    
    // Ensure we show 100% progress before completing
    self.postMessage({ 
      status: "processing", 
      progress: 100,
      estimatedTimeRemaining: 0,
      message: "Finalizing transcript"
    });
    
    // Clear the interval
    clearInterval(progressInterval);
    
    // Calculate total time
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    // Send complete message
    self.postMessage({ 
      status: "complete", 
      result, 
      time: processingTime
    });
  } catch (error) {
    // Clear the interval
    clearInterval(progressInterval);
    
    // Log the error for debugging
    console.error("Transcription error:", error);
    
    self.postMessage({ 
      status: "error", 
      error: error.message || "An error occurred during processing" 
    });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      load(data);
      break;

    case "run":
      run(data);
      break;
  }
});