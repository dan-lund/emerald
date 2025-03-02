import React, { useMemo } from 'react';
import { Download } from 'lucide-react';

const TranscriptChunk = ({ chunk, currentTime, onClick }) => {
  const { text, timestamp } = chunk;
  const [start, end] = timestamp;
  const isActive = start <= currentTime && currentTime < end;

  return (
    <span className="inline">
      {text.startsWith(" ") ? " " : " "}
      <span
        onClick={onClick}
        className={`
          transition-all duration-200 ease-in-out
          cursor-pointer
          hover:text-green-500 dark:hover:text-green-400
          ${isActive ? 'text-green-600 dark:text-green-500 font-medium' : 'text-gray-700 dark:text-gray-300'}
        `}
        title={`${timestamp[0].toFixed(2)}s → ${timestamp[1].toFixed(2)}s`}
      >
        {text.trim()}
      </span>
    </span>
  );
};

const Transcript = ({ transcript, currentTime, setCurrentTime, className = "" }) => {
  const jsonTranscript = useMemo(() => {
    return JSON.stringify(transcript, null, 2)
      .replace(/( {4}"timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm, "$1[$2 $3]");
  }, [transcript]);

  const downloadTranscript = () => {
    const blob = new Blob([jsonTranscript], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800  shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <button
          onClick={downloadTranscript}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200"
        >
          <Download className="size-4" />
          <span className="text-sm font-medium">Download</span>
        </button>
      </div>

      {/* Transcript Content */}
      <div className={`p-4 leading-relaxed ${className}`}>
        {transcript.chunks.map((chunk, i) => (
          <TranscriptChunk
            key={i}
            chunk={chunk}
            currentTime={currentTime}
            onClick={() => setCurrentTime(chunk.timestamp[0])}
          />
        ))}
      </div>
    </div>
  );
};

export default Transcript;