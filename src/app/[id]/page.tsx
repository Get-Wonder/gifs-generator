'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VariableEditor from '../components/VariableEditor';
import { useEffect, useState } from 'react';

interface GifCard {
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
  gifUrl?: string | null;
}

export default function GifDetail() {
  const router = useRouter();
  const [gif, setGif] = useState<GifCard | null>(null);

  useEffect(() => {
    // Get the GIF data from sessionStorage
    const storedGif = sessionStorage.getItem('currentGif');
    if (storedGif) {
      setGif(JSON.parse(storedGif));
    } else {
      // If no data is found, redirect back to home
      router.push('/');
    }
  }, [router]);

  if (!gif) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center text-blue-500 hover:text-blue-600 mb-6">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a la Biblioteca
      </Link>
      <VariableEditor initialGif={gif} />
    </div>
  );
} 