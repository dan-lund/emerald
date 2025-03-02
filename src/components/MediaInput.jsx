import {
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from "react";

const MediaInput = forwardRef(
  ({ onInputChange, onTimeUpdate, ...props }, ref) => {
    // UI states
    const [dragging, setDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    
    const fileInputRef = useRef(null);
    const progressBarRef = useRef(null);

    // Create a reference to the audio and video elements
    const audioElement = useRef(null);
    const videoElement = useRef(null);

    const currentTimeRef = useRef(0);
    useImperativeHandle(ref, () => ({
      setMediaTime(time) {
        if (audioElement.current?.src) {
          audioElement.current.currentTime = time;
        } else if (videoElement.current?.src) {
          videoElement.current.currentTime = time;
        }
        currentTimeRef.current = time;
        setCurrentTime(time);
      },
    }));

    const onBufferLoad = (arrayBuffer, type) => {
      const blob = new Blob([arrayBuffer.slice(0)], { type: type });
      const url = URL.createObjectURL(blob);
      processFile(arrayBuffer);

      // Create a URL for the Blob
      if (type.startsWith("audio/")) {
        // Dispose the previous source
        videoElement.current.pause();
        videoElement.current.removeAttribute("src");
        videoElement.current.load();

        audioElement.current.src = url;
        audioElement.current.onloadedmetadata = () => {
          setDuration(audioElement.current.duration);
        };
      } else if (type.startsWith("video/")) {
        // Dispose the previous source
        audioElement.current.pause();
        audioElement.current.removeAttribute("src");
        audioElement.current.load();

        videoElement.current.src = url;
        videoElement.current.onloadedmetadata = () => {
          setDuration(videoElement.current.duration);
        };
      } else {
        alert(`Unsupported file type: ${type}`);
      }
    };

    const readFile = (file) => {
      if (!file) return;

      // file.type
      const reader = new FileReader();
      reader.onload = (e) => {
        onBufferLoad(e.target.result, file.type);
      };
      reader.readAsArrayBuffer(file);
    };

    const handleInputChange = (event) => {
      readFile(event.target.files[0]);
    };

    const handleDragOver = (event) => {
      event.preventDefault();
    };

    const handleDrop = (event) => {
      event.preventDefault();
      setDragging(false);
      readFile(event.dataTransfer.files[0]);
    };

    const handleClick = (e) => {
      // Prevent clicks on control elements from opening file dialog
      if (e.target.closest('.media-controls')) {
        e.stopPropagation();
        return;
      }
      
      if (e.target.tagName === "VIDEO" || e.target.tagName === "AUDIO") {
        e.preventDefault();
        fileInputRef.current.click();
      } else if (e.target.tagName === "INPUT") {
        e.stopPropagation();
      } else {
        fileInputRef.current.click();
        e.stopPropagation();
      }
    };

    const processFile = async (buffer) => {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)({ sampleRate: 16_000 });

      try {
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        let audio;
        if (audioBuffer.numberOfChannels === 2) {
          // Merge channels
          const SCALING_FACTOR = Math.sqrt(2);
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          audio = new Float32Array(left.length);
          for (let i = 0; i < audioBuffer.length; ++i) {
            audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
          }
        } else {
          audio = audioBuffer.getChannelData(0);
        }
        onInputChange(audio);
      } catch (e) {
        alert(e);
      }
    };

    const requestRef = useRef();

    const updateTime = useCallback(() => {
      let elem;
      if (audioElement.current?.src) {
        elem = audioElement.current;
      } else if (videoElement.current?.src) {
        elem = videoElement.current;
      }

      if (elem && currentTimeRef.current !== elem.currentTime) {
        currentTimeRef.current = elem.currentTime;
        setCurrentTime(elem.currentTime);
        onTimeUpdate(elem.currentTime);
      }

      // Request the next frame
      requestRef.current = requestAnimationFrame(updateTime);
    }, [onTimeUpdate]);

    useEffect(() => {
      // Start the animation
      requestRef.current = requestAnimationFrame(updateTime);

      return () => {
        // Cleanup on component unmount
        cancelAnimationFrame(requestRef.current);
      };
    }, [updateTime]);

    // Custom player controls
    const togglePlayPause = () => {
      let mediaElem = audioElement.current?.src ? audioElement.current : videoElement.current;
      
      if (mediaElem) {
        if (isPlaying) {
          mediaElem.pause();
        } else {
          mediaElem.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    const handleProgressBarClick = (e) => {
      const progressBar = progressBarRef.current;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / progressBar.offsetWidth;
      let mediaElem = audioElement.current?.src ? audioElement.current : videoElement.current;
      
      if (mediaElem) {
        const newTime = pos * duration;
        mediaElem.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      
      let mediaElem = audioElement.current?.src ? audioElement.current : videoElement.current;
      if (mediaElem) {
        mediaElem.volume = newVolume;
      }
    };

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
      <div
        {...props}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnter={(e) => setDragging(true)}
        onDragLeave={(e) => setDragging(false)}
        className="relative"
      >
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleInputChange}
          ref={fileInputRef}
          className="hidden"
        />
        {
          <audio
            ref={audioElement}
            onEnded={() => setIsPlaying(false)}
            className="w-full max-h-full"
          />
        }
        {
          <video
            ref={videoElement}
            className="w-full max-h-full"
            onEnded={() => setIsPlaying(false)}
            style={{ display: videoElement.current?.src ? "block" : "none" }}
          />
        }
        
        {/* Custom media controls */}
        {(audioElement.current?.src || videoElement.current?.src) && (
          <div className="media-controls w-full bg-gray-100 dark:bg-neutral-800  p-2 rounded-md mt-2">
            {/* Progress bar */}
            <div 
              ref={progressBarRef}
              className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full mb-2 cursor-pointer relative"
              onClick={handleProgressBarClick}
            >
              <div 
                className="h-full bg-green-600 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Play/Pause button */}
                <button 
                  onClick={togglePlayPause}
                  className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full mr-3 focus:outline-none hover:bg-blue-600"
                >
                  {isPlaying ? (
                    <span>■</span> // Pause symbol
                  ) : (
                    <span>▶</span> // Play symbol
                  )}
                </button>
                
                {/* Time display */}
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              {/* Volume control */}
              <div className="relative flex items-center">
                <button 
                  className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                  onClick={() => setShowVolumeControl(!showVolumeControl)}
                >
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                
                {showVolumeControl && (
                  <div className="absolute bottom-full right-0 bg-white dark:bg-gray-700 p-2 rounded-md shadow-lg">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {!audioElement.current?.src && !videoElement.current?.src && (
          <div
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-[250px]"
            style={{ borderColor: dragging ? "green" : "lightgray" }}
          >
            <span className="text-gray-600 text-center">
              <u>Drag & drop</u> or <u>click</u>
              <br />
              to select media
            </span>
          </div>
        )}
      </div>
    );
  },
);
MediaInput.displayName = "MediaInput";

export default MediaInput;