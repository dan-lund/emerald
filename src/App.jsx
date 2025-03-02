import { useEffect, useState, useRef, useCallback } from "react";

import Progress from "./components/Progress";
import MediaInput from "./components/MediaInput";
import Transcript from "./components/Transcript";
import LanguageSelector from "./components/LanguageSelector";
import ModelLoader from "./components/ModelLoader"; // Import the new component

async function hasWebGPU() {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

function App() {
  // Create a reference to the worker object.
  const worker = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState([]);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  
  const mediaInputRef = useRef(null);
  const [audio, setAudio] = useState(null);
  const [language, setLanguage] = useState("en");

  const [result, setResult] = useState(null);
  const [time, setTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  const [device, setDevice] = useState("webgpu"); // Try use WebGPU first
  const [modelSize, setModelSize] = useState("gpu" in navigator ? 196 : 77); // WebGPU=196MB, WebAssembly=77MB
  useEffect(() => {
    hasWebGPU().then((result) => {
      setModelSize(result ? 196 : 77);
      setDevice(result ? "webgpu" : "wasm");
    });
  }, []);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // Create the worker if it does not yet exist.
    worker.current ??= new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            }),
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setStatus("ready");
          setProgressItems([]);
          break;

        case "processing":
          // Update processing state
          setStatus("running");
          break;

        case "complete":
          setResult(e.data.result);
          setTime(e.data.time);
          setStatus("ready");
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener("message", onMessageReceived);
    };
  }, []);

  const handleModelLoad = useCallback(() => {
    setHasStartedLoading(true);
    setStatus("loading");
    worker.current.postMessage({ type: "load", data: { device } });
  }, [device]);

  const handleRunModel = useCallback(() => {
    setResult(null);
    setTime(null);
    setStatus("running");
    worker.current.postMessage({
      type: "run",
      data: { audio, language },
    });
  }, [audio, language]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 text-neutral-800 dark:text-neutral-200 font-sans">
      <div className="container mx-auto max-w-3xl px-4 py-8 h-full">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-green-600">
            Emerald
          </h1>
          <h2 className="text-xl text-neutral-600 dark:text-neutral-300">
            In-browser speech recognition with word-level timestamps
          </h2>
        </header>

        {/* Model loading section */}
        {status !== "ready" && status !== "running" && (
          <ModelLoader 
            status={status}
            loadingMessage={loadingMessage}
            progressItems={progressItems}
            device={device}
            modelSize={modelSize}
            hasStartedLoading={hasStartedLoading}
            handleModelLoad={handleModelLoad}
          />
        )}

        <main className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 mb-8">
          
          {/* Model status indicator when ready */}
          {status === "ready" && (
            <div className="mb-6 flex items-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Whisper model loaded ({device.toUpperCase()}) - Ready for transcription
              </span>
            </div>
          )}
          
          {/* Model status indicator when running */}
          {status === "running" && (
            <div className="mb-6 flex items-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <div className="w-3 h-3 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Transcribing...
              </span>
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              Input audio/video
            </label>
            <MediaInput
              ref={mediaInputRef}
              className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg cursor-pointer min-h-[100px] max-h-[500px] overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 dark:focus-within:ring-emerald-400 transition-all"
              onInputChange={(result) => setAudio(result)}
              onTimeUpdate={(time) => setCurrentTime(time)}
            />
          </div>

          {status === "ready" && (
            <div className="flex items-center justify-between">
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  audio === null
                    ? "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg"
                }`}
                onClick={handleRunModel}
                disabled={audio === null}
              >
                Transcribe Audio
              </button>

              <div className="flex flex-col items-end">
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Language:
                </label>
                <LanguageSelector
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 dark:bg-neutral-800 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all"
                  language={language}
                  setLanguage={setLanguage}
                />
              </div>
            </div>
          )}

          {result && time && (
            <div className="mt-8">
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="font-medium">Transcript</h3>
                </div>
                <Transcript
                  className="p-4 max-h-[300px] overflow-y-auto scrollbar-thin dark:scrollbar-thumb-neutral-700 dark:scrollbar-track-neutral-800 select-none"
                  transcript={result}
                  currentTime={currentTime}
                  setCurrentTime={(time) => {
                    setCurrentTime(time);
                    mediaInputRef.current.setMediaTime(time);
                  }}
                />
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-right mt-2">
                Generation time:{" "}
                <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                  {time.toFixed(2)}ms
                </span>
              </p>
            </div>
          )}
        </main>
        
        <footer className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Powered by 🤗 Transformers.js and ONNX Runtime</p>
        </footer>
      </div>
    </div>
  );
}

export default App;