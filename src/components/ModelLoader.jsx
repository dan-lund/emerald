import React from 'react';

const ModelLoader = ({ status, loadingMessage, progressItems, device, handleModelLoad, hasStartedLoading, modelSize }) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-neutral-800 dark:text-white">
          Whisper Model
        </h3>
        
        <div className="text-sm px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <span className="font-medium">{device.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="flex items-center mb-6">
        <div className="w-16 h-16 mr-4 relative">
          {hasStartedLoading && (
            // Loading with progress indicator (shows for all loading stages)
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="#404040" strokeWidth="8" />
              
              {/* Progress circle - either based on file loading or indeterminate animation */}
              {progressItems.length > 0 ? (
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#00b546" 
                  strokeWidth="8" 
                  strokeDasharray="283" 
                  strokeDashoffset={283 - (283 * (progressItems.reduce((acc, item) => acc + (item.progress || 0), 0) / progressItems.reduce((acc, item) => acc + (item.total || 1), 0)))}
                  strokeLinecap="round"
                />
              ) : (
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#00b546" 
                  strokeWidth="8" 
                  strokeDasharray="283" 
                  strokeDashoffset="70"
                  strokeLinecap="round"
                  className="animate-spin origin-center"
                  style={{ animationDuration: '2s' }}
                />
              )}
            </svg>
          )}
          
          {!hasStartedLoading && (
            // Initial state (before loading started)
            <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="currentColor"></path>
            </svg>
          )}
        </div>
        
        <div>
          <div className="font-medium text-neutral-800 dark:text-white mb-1">
            {hasStartedLoading ? loadingMessage : "Whisper Model Ready to Load"}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {hasStartedLoading ? (
              progressItems.length > 0 
                ? `Loading model files...` 
                : 'Preparing model...'
            ) : (
              `Click the button below to start loading the model (${modelSize}MB)`
            )}
          </div>
        </div>
      </div>
      
      {/* Show file names being loaded without percentages */}
      {progressItems.length > 0 && (
        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Loading model components:</h4>
          <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {progressItems.map(({ file }, i) => (
              <div key={i} className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="truncate">{file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Only show the button before loading has started */}
      {!hasStartedLoading && (
        <button
          onClick={handleModelLoad}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg text-white font-medium transition-all shadow"
        >
          Start Loading Whisper Model
        </button>
      )}
    </div>
  );
};

export default ModelLoader;