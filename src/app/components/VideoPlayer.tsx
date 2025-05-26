'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  url: string;
}

export default function VideoPlayer({ url }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        className="w-full h-full object-cover"
        src={url}
        loop
        muted
      />
      {!isPlaying && (
        <button
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all"
          onClick={handlePlayPause}
        >
          <svg
            className="w-16 h-16 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
} 