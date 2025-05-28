"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface VariableData {
  value: string;
  position: {
    top: string;
    left: string;
    fontSize: string;
    color: string;
    horizontalCenter?: boolean;
  };
}

interface GifCard {
  id: string;
  name: string;
  variables: {
    [key: string]: VariableData;
  };
  url: string;
}

interface VariableEditorProps {
  initialGif: GifCard;
}

export default function VariableEditor({ initialGif }: VariableEditorProps) {
  const [gif, setGif] = useState<GifCard>(initialGif);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  useEffect(() => {
    generateGifAndSetUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVariableChange = (varKey: string, field: string, value: string | boolean) => {
    setGif((prev) => ({
      ...prev,
      variables: {
        ...prev.variables,
        [varKey]: {
          ...prev.variables[varKey],
          position: {
            ...prev.variables[varKey].position,
            [field]: value,
          },
        },
      },
    }));
  };

  const handleValueChange = (varKey: string, newValue: string) => {
    setGif((prev) => ({
      ...prev,
      variables: {
        ...prev.variables,
        [varKey]: {
          ...prev.variables[varKey],
          value: newValue,
        },
      },
    }));
  };

  const handleSaveConfiguration = async () => {
    try {
      setIsSaving(true);

      const response = await fetch('/api/update-gif-variables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gifId: parseInt(gif.id),
          variables: gif.variables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast.success('Configuration saved successfully!');
      
      // Reload the GIF preview with the updated configuration
      await generateGifAndSetUrl();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateGifAndSetUrl = async () => {
    try {
      setIsGenerating(true);

      const sanitizedVariables = Object.fromEntries(
        Object.entries(gif.variables).map(([key, data]) => [
          key,
          {
            ...data,
            value: data.value.trim() === "" ? " " : data.value,
          },
        ])
      );

      const response = await fetch('/api/generate-gif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: gif.url,
          variables: sanitizedVariables,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate GIF');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
      }

      setGifUrl(objectUrl);
    } catch (error) {
      console.error('Error generating GIF:', error);
      toast.error('Failed to generate GIF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndDownload = async () => {
    try {
      setIsGenerating(true);

      const sanitizedVariables = Object.fromEntries(
        Object.entries(gif.variables).map(([key, data]) => [
          key,
          {
            ...data,
            value: data.value.trim() === "" ? " " : data.value,
          },
        ])
      );

      const response = await fetch('/api/generate-gif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: gif.url,
          variables: sanitizedVariables,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate GIF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gif.name}.gif`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('GIF downloaded successfully!');
    } catch (error) {
      console.error('Error generating GIF:', error);
      toast.error('Failed to generate GIF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-6">
        {gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gifUrl} alt="Generated GIF" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Loading GIF preview...
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Edit Variables</h2>
        <div className="space-y-6">
          {Object.entries(gif.variables).map(([key, data]) => (
            <div key={key} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow">
              <h3 className="text-md font-semibold mb-2">{key}</h3>

              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-300">Text Value</label>
                <input
                  className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  value={data.value}
                  onChange={(e) => handleValueChange(key, e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Top (%)</label>
                  <input
                    type="number"
                    className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={parseFloat(data.position.top)}
                    onChange={(e) => handleVariableChange(key, 'top', e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Left (%)</label>
                  <input
                    type="number"
                    className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={parseFloat(data.position.left)}
                    onChange={(e) => handleVariableChange(key, 'left', e.target.value)}
                    disabled={data.position.horizontalCenter}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Font Size (px)</label>
                  <input
                    type="number"
                    className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={parseInt(data.position.fontSize)}
                    onChange={(e) => handleVariableChange(key, 'fontSize', e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Color</label>
                  <input
                    type="color"
                    className="rounded border h-10 w-full text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={data.position.color}
                    onChange={(e) => handleVariableChange(key, 'color', e.target.value)}
                  />
                </div>

                <div className="flex items-center col-span-2">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={data.position.horizontalCenter || false}
                    onChange={(e) => handleVariableChange(key, 'horizontalCenter', e.target.checked)}
                  />
                  <label className="text-sm text-gray-600 dark:text-gray-300">Horizontally Center</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleGenerateAndDownload}
          disabled={isGenerating}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate GIF'}
        </button>

        <button
          onClick={generateGifAndSetUrl}
          disabled={isGenerating}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Reloading...' : 'Reload GIF'}
        </button>

        <button
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </>
  );
}
