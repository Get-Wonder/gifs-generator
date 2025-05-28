"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { DatabaseGif } from '@/services/dbService';

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
        horizontalCenter?: boolean;
      };
    };
  };
  url: string;
};

type Variable = {
  name: string;
};

export default function Home() {
  const [gifs, setGifs] = useState<DatabaseGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGifName, setNewGifName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchGifs();
  }, []);

  const fetchGifs = async () => {
    try {
      const response = await fetch('/api/gifs');
      if (response.ok) {
        const gifsData = await response.json();
        setGifs(gifsData);
      } else {
        console.error('Failed to fetch GIFs');
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGifClick = (gif: DatabaseGif) => {
    // Transform database GIF to the format expected by VariableEditor
    const transformedGif: GifCard = {
      id: gif.id.toString(),
      name: gif.name,
      url: gif.videoUrl || '',
      variables: {}
    };

    // Transform variables from database format to component format
    if (gif.variables && Array.isArray(gif.variables)) {
      gif.variables.forEach((variable) => {
        transformedGif.variables[variable.name] = {
          value: variable.value || variable.name, // Use saved value or fallback to variable name
          position: {
            top: `${variable.styles.top}%`,
            left: `${variable.styles.left}%`,
            fontSize: `${variable.styles.fontSize}px`,
            color: variable.styles.color,
            horizontalCenter: variable.styles.horizontallyCentered
          }
        };
      });
    }

    router.push(`/${gif.id}`);
    // Store the transformed GIF data in sessionStorage
    sessionStorage.setItem('currentGif', JSON.stringify(transformedGif));
  };

  const handleAddVariable = () => {
    setVariables([...variables, { name: '' }]);
  };

  const handleVariableNameChange = (index: number, value: string) => {
    const newVariables = [...variables];
    newVariables[index].name = value;
    setVariables(newVariables);
  };

  const handleDeleteVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewGifName('');
    setSelectedFile(null);
    setVariables([]);
  };

  const handleSave = async () => {
    if (!selectedFile || !newGifName) {
      toast.error('Please provide a name and select a video file');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', newGifName);
      formData.append('variables', JSON.stringify(variables));

      const response = await fetch('/api/save-gif', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save GIF');
      }

      const data = await response.json();
      console.log('GIF saved successfully:', data);
      
      toast.success('GIF created successfully!');
      
      // Refresh the GIFs list
      await fetchGifs();
      
      // Close the modal and reset states
      handleCloseModal();
    } catch (error) {
      console.error('Error saving GIF:', error);
      toast.error('Failed to save GIF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading GIFs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">GIF Library</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create new GIF
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Create New GIF</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">GIF Name</label>
                <input
                  type="text"
                  value={newGifName}
                  onChange={(e) => setNewGifName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter GIF name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video File</label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <p className="text-green-500">{selectedFile.name}</p>
                    ) : (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Drag and drop a video file here, or click to select</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Supported formats: MP4, WebM, etc.</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Variables</label>
                  <button
                    onClick={handleAddVariable}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    + Add Variable
                  </button>
                </div>
                <div className="space-y-2">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) => handleVariableNameChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder={`Variable ${index + 1} name`}
                      />
                      <button
                        onClick={() => handleDeleteVariable(index)}
                        className="px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete variable"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isUploading || !selectedFile || !newGifName}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gifs.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No GIFs found. Create your first GIF!</p>
          </div>
        ) : (
          gifs.map((gif) => (
            <div 
              key={gif.id} 
              onClick={() => handleGifClick(gif)}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                {gif.videoUrl ? (
                  <video
                    className="w-full h-full object-cover"
                    src={gif.videoUrl}
                    loop
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No video
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{gif.name}</h2>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {gif.variables ? (Array.isArray(gif.variables) ? gif.variables.length : 0) : 0} variables
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
