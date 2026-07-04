"use client";

import { useState, useRef, useEffect } from "react";

export default function MeditativeAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showPlayer, setShowPlayer] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize audio element with a calm classical piano track
    audioRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log("Audio playback failed:", err));
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
      if (v > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "2.5rem",
      right: "2.5rem",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        .audio-wave-container {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 16px;
          width: 25px;
        }
        .audio-wave-bar {
          width: 3px;
          background: var(--accent-color);
          border-radius: 2px;
          height: 3px;
        }
        .audio-wave-container.active .audio-wave-bar {
          animation: wave 1s ease-in-out infinite alternate;
        }
        .audio-wave-container.active .audio-wave-bar:nth-child(1) { animation-delay: 0.1s; height: 12px; }
        .audio-wave-container.active .audio-wave-bar:nth-child(2) { animation-delay: 0.3s; height: 16px; }
        .audio-wave-container.active .audio-wave-bar:nth-child(3) { animation-delay: 0.2s; height: 8px; }
        .audio-wave-container.active .audio-wave-bar:nth-child(4) { animation-delay: 0.4s; height: 14px; }
        .audio-wave-container.active .audio-wave-bar:nth-child(5) { animation-delay: 0.5s; height: 6px; }

        @keyframes wave {
          0% { height: 3px; }
          100% { height: 16px; }
        }

        .vol-slider {
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          height: 4px;
          border-radius: 2px;
          width: 70px;
          outline: none;
        }
        .vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent-color);
          cursor: pointer;
        }
      `}} />

      {/* Expanded Control Board */}
      {showPlayer && (
        <div style={{
          background: "rgba(19, 20, 23, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--transparent-light-color)",
          borderRadius: "30px",
          padding: "0.8rem 1.6rem",
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          animation: "slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}>
          {/* Wave visualizer */}
          <div className={`audio-wave-container ${isPlaying ? "active" : ""}`}>
            <div className="audio-wave-bar"></div>
            <div className="audio-wave-bar"></div>
            <div className="audio-wave-bar"></div>
            <div className="audio-wave-bar"></div>
            <div className="audio-wave-bar"></div>
          </div>

          <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", fontWeight: "600", whiteSpace: "nowrap" }}>
            Ambient Peace
          </span>

          {/* Volume Control */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              onClick={toggleMute}
              style={{
                background: "none",
                border: "none",
                color: "var(--light-color-alt)",
                cursor: "pointer",
                padding: 0,
                fontSize: "1.4rem",
                display: "flex",
                alignItems: "center"
              }}
            >
              <i className={isMuted || volume === 0 ? "ri-volume-mute-line" : "ri-volume-up-line"}></i>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="vol-slider"
            />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={togglePlay}
        onDoubleClick={() => setShowPlayer(!showPlayer)}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPlayer(!showPlayer);
        }}
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: isPlaying ? "var(--accent-color)" : "rgba(255, 255, 255, 0.08)",
          color: isPlaying ? "#131417" : "var(--light-color)",
          border: isPlaying ? "none" : "1px solid var(--transparent-light-color)",
          boxShadow: isPlaying ? "0 4px 20px rgba(79, 207, 112, 0.4)" : "0 4px 15px rgba(0, 0, 0, 0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.8rem",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)"
        }}
        title="Single-click to Play/Pause. Double-click to show volume slider."
      >
        <i className={isPlaying ? "ri-pause-line" : "ri-play-line"}></i>
      </button>
    </div>
  );
}
