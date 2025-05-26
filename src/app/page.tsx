"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Define the type for our GIF data
type GifCard = {
  id: string;
  name: string;
  variables: {
    [key: string]: {
      value: string;
      position: {
        top: string;
        left: string;
        fontSize: string;
        color: string;
      };
    };
  };
  url: string;
};

const initialGifs: GifCard[] = [
  {
    id: "1",
    name: "GIF 1",
    variables: {
      name: {
        value: "name 1",
        position: {
          top: "80%",
          left: "45%",
          fontSize: "68px",
          color: "#ffffff"
        }
      }
    },
    url: "https://apv-chatbot-videos.sfo3.cdn.digitaloceanspaces.com/0af32903-0e39-4a84-963b-f891770ed443/muted_6c4e79c5c8c5e3e9b93ddda2afdf6b9f.mp4"
  },
  {
    id: "2",
    name: "GIF 2",
    variables: {
      name: {
        value: "name 2",
        position: {
          top: "30%",
          left: "20%",
          fontSize: "24px",
          color: "#ffffff"
        }
      }
    },
    url: "/placeholder.gif"
  },
  {
    id: "3",
    name: "GIF 3",
    variables: {
      name: {
        value: "name 3",
        position: {
          top: "40%",
          left: "30%",
          fontSize: "40px",
          color: "#ffffff"
        }
      }
    },
    url: "/placeholder.gif"
  }
];

export default function Home() {
  const [gifs] = useState<GifCard[]>(initialGifs);
  const router = useRouter();

  const handleGifClick = (gif: GifCard) => {
    router.push(`/${gif.id}`);
    // Store the GIF data in sessionStorage
    sessionStorage.setItem('currentGif', JSON.stringify(gif));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">GIF Library</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gifs.map((gif) => (
          <div 
            key={gif.id} 
            onClick={() => handleGifClick(gif)}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="aspect-video bg-gray-200 dark:bg-gray-700">
              <video
                className="w-full h-full object-cover"
                src={gif.url}
                loop
                muted
                autoPlay
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{gif.name}</h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {Object.keys(gif.variables).length} variables
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
