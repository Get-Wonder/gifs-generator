"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  gifUrl?: string | null;
}

interface VariableEditorProps {
  initialGif: GifCard;
}

export default function VariableEditor({ initialGif }: VariableEditorProps) {
  const [gif, setGif] = useState<GifCard>(initialGif);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isAddVariableModalOpen, setIsAddVariableModalOpen] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [variableFiles, setVariableFiles] = useState<{[key: string]: File | null}>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if GIF already has a saved gifUrl
    if (gif.gifUrl) {
      console.log('Loading existing GIF from URL:', gif.gifUrl);
      setGifUrl(gif.gifUrl);
    } else {
      console.log('No existing GIF URL found, generating new preview...');
      generateGifAndSetUrl();
    }
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

      // First, save the variable configuration
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

      // Generate GIF for upload
      const sanitizedVariables = Object.fromEntries(
        Object.entries(gif.variables).map(([key, data]) => [
          key,
          {
            ...data,
            value: data.value.trim() === "" ? " " : data.value,
          },
        ])
      );

      const gifResponse = await fetch('/api/generate-gif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: gif.url,
          variables: sanitizedVariables,
        }),
      });

      if (!gifResponse.ok) {
        throw new Error('Failed to generate GIF');
      }

      const gifBlob = await gifResponse.blob();
      
      // Upload GIF to DO Spaces
      const uploadFormData = new FormData();
      uploadFormData.append('gifFile', gifBlob, `${gif.name}.gif`);
      uploadFormData.append('gifId', gif.id);

      const uploadResponse = await fetch('/api/upload-gif', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload GIF');
      }

      // Get the new gifUrl from the response
      const uploadData = await uploadResponse.json();
      const newGifUrl = uploadData.gifUrl;

      // Update local gif state with the new gifUrl
      setGif(prev => ({
        ...prev,
        gifUrl: newGifUrl
      }));

      // Set the new GIF URL for immediate preview
      setGifUrl(newGifUrl);

      toast.success('¡Configuración guardada y GIF generado exitosamente!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error al guardar la configuración. Por favor intenta nuevamente.');
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
      toast.error('Error al generar el GIF. Por favor intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndDownload = async () => {
    try {
      setIsGenerating(true);

      // Check if any variable has a file uploaded
      const hasFiles = Object.values(variableFiles).some(file => file !== null);

      if (hasFiles) {
        // Bulk generation mode
        await handleBulkGeneration();
      } else {
        // Single GIF generation mode
        await handleSingleGeneration();
      }
    } catch (error) {
      console.error('Error generating GIF:', error);
      toast.error('Error al generar el GIF. Por favor intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSingleGeneration = async () => {
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
    
    toast.success('¡GIF descargado exitosamente!');
  };

  const handleBulkGeneration = async () => {
    // Read all uploaded files and get their contents
    const fileContents: {[key: string]: string[]} = {};
    for (const [variableKey, file] of Object.entries(variableFiles)) {
      if (file) {
        fileContents[variableKey] = await readFileContent(file);
      }
    }

    // Send to API for bulk generation
    const response = await fetch('/api/generate-bulk-gif', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: gif.url,
        variables: gif.variables,
        fileContents: fileContents,
        gifName: gif.name,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate bulk GIFs');
    }

    // Download the ZIP file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gif.name}_bulk.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    const maxLines = Math.max(...Object.values(fileContents).map(lines => lines.length));
    toast.success(`¡${maxLines} GIFs descargados exitosamente en ZIP!`);
  };

  const handleAddVariable = () => {
    if (!newVariableName.trim()) {
      toast.error('Por favor ingresa un nombre de variable');
      return;
    }

    // Check if variable already exists
    if (gif.variables[newVariableName]) {
      toast.error('Ya existe una variable con este nombre');
      return;
    }

    // Add new variable with default values
    const newVariable: VariableData = {
      value: newVariableName,
      position: {
        top: "45%",
        left: "45%",
        fontSize: "68px",
        color: "#ffffff",
        horizontalCenter: false
      }
    };

    setGif(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [newVariableName]: newVariable
      }
    }));

    // Close modal and reset
    setIsAddVariableModalOpen(false);
    setNewVariableName('');
    toast.success('¡Variable agregada exitosamente!');
  };

  const handleCloseAddVariableModal = () => {
    setIsAddVariableModalOpen(false);
    setNewVariableName('');
  };

  const handleDeleteVariable = (variableKey: string) => {
    const variableCount = Object.keys(gif.variables).length;
    
    if (variableCount <= 1) {
      toast.error('No se puede eliminar la última variable. Se requiere al menos una variable.');
      return;
    }

    setGif(prev => {
      const newVariables = { ...prev.variables };
      delete newVariables[variableKey];
      return {
        ...prev,
        variables: newVariables
      };
    });

    // Also remove the file for this variable
    setVariableFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[variableKey];
      return newFiles;
    });

    toast.success('¡Variable eliminada exitosamente!');
  };

  const handleFileUpload = (variableKey: string, file: File | null) => {
    if (file) {
      // Clear any existing files from other variables
      const clearedFiles: {[key: string]: File | null} = {};
      Object.keys(gif.variables).forEach(key => {
        clearedFiles[key] = key === variableKey ? file : null;
      });
      setVariableFiles(clearedFiles);
    } else {
      // If removing file, just update the specific variable
      setVariableFiles(prev => ({
        ...prev,
        [variableKey]: null
      }));
    }
  };

  const handleFileChange = (variableKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'text/plain') {
      toast.error('Por favor selecciona un archivo .txt válido');
      return;
    }
    handleFileUpload(variableKey, file);
  };

  const handleFileDrop = (variableKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.type !== 'text/plain') {
      toast.error('Por favor selecciona un archivo .txt válido');
      return;
    }
    handleFileUpload(variableKey, file);
  };

  // Check if any variable has a file uploaded
  const hasAnyFile = Object.values(variableFiles).some(file => file !== null);
  const getVariableWithFile = () => {
    return Object.entries(variableFiles).find(([, file]) => file !== null)?.[0] || null;
  };

  const readFileContent = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        resolve(lines);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDeleteGif = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/delete-gif/${gif.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete GIF');
      }

      toast.success('¡GIF eliminado exitosamente!');
      
      // Navigate back to home
      router.push('/');
    } catch (error) {
      console.error('Error deleting GIF:', error);
      toast.error('Error al eliminar el GIF. Por favor intenta nuevamente.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{gif.name}</h1>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
        >
          Eliminar GIF
        </button>
      </div>

      <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-6">
        {gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gifUrl} alt="Generated GIF" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Cargando vista previa del GIF...
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Editar Variables</h2>
          <button
            onClick={() => setIsAddVariableModalOpen(true)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          >
            + Agregar Variable
          </button>
        </div>
        <div className="space-y-6">
          {Object.entries(gif.variables).map(([key, data]) => (
            <div key={key} className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">{key}</h3>
                <button
                  onClick={() => handleDeleteVariable(key)}
                  disabled={Object.keys(gif.variables).length <= 1}
                  className="px-3 py-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title={Object.keys(gif.variables).length <= 1 ? "No se puede eliminar la última variable" : "Eliminar variable"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-300">Valor del Texto</label>
                <input
                  className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  value={data.value}
                  onChange={(e) => handleValueChange(key, e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Superior (%)</label>
                  <input
                    type="number"
                    className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={parseFloat(data.position.top)}
                    onChange={(e) => handleVariableChange(key, 'top', e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Izquierda (%)</label>
                  <input
                    type="number"
                    className="rounded border px-2 py-1 text-black dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    value={parseFloat(data.position.left)}
                    onChange={(e) => handleVariableChange(key, 'left', e.target.value)}
                    disabled={data.position.horizontalCenter}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Tamaño de Fuente (px)</label>
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
                  <label className="text-sm text-gray-600 dark:text-gray-300">Centrar Horizontalmente</label>
                </div>
              </div>

              {/* File upload for bulk generation */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Archivo de valores (.txt)</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={variableFiles[key] || !hasAnyFile ? (e) => handleFileDrop(key, e) : undefined}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    variableFiles[key] 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : hasAnyFile 
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => handleFileChange(key, e)}
                    className="hidden"
                    id={`file-upload-${key}`}
                    disabled={hasAnyFile && !variableFiles[key]}
                  />
                  <label 
                    htmlFor={`file-upload-${key}`} 
                    className={hasAnyFile && !variableFiles[key] ? 'cursor-not-allowed' : 'cursor-pointer'}
                  >
                    {variableFiles[key] ? (
                      <div>
                        <p className="text-green-600 dark:text-green-400 text-sm font-medium">{variableFiles[key]!.name}</p>
                        <p className="text-xs text-green-500 dark:text-green-400 mt-1">Archivo seleccionado para generación masiva</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFileUpload(key, null);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                        >
                          Eliminar archivo
                        </button>
                      </div>
                    ) : hasAnyFile ? (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Campo deshabilitado</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Ya hay un archivo seleccionado en la variable &ldquo;{getVariableWithFile()}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Arrastra un archivo .txt o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Un valor por línea para generar múltiples GIFs</p>
                      </div>
                    )}
                  </label>
                </div>
                {hasAnyFile && !variableFiles[key] && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Solo se puede subir un archivo .txt por GIF
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleGenerateAndDownload}
          disabled={isGenerating || isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generando...' : 'Descargar GIF'}
        </button>

        <button
          onClick={generateGifAndSetUrl}
          disabled={isGenerating || isSaving}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Recargando...' : 'Recargar GIF'}
        </button>

        <button
          onClick={handleSaveConfiguration}
          disabled={isSaving || isGenerating}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      {/* Add Variable Modal */}
      {isAddVariableModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Agregar Nueva Variable</h3>
              <button
                onClick={handleCloseAddVariableModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de la Variable</label>
                <input
                  type="text"
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ingresa el nombre de la variable"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddVariable();
                    }
                  }}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCloseAddVariableModal}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddVariable}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Agregar Variable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-600">Confirmar Eliminación</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                ¿Estás seguro de que quieres eliminar el GIF &ldquo;<strong>{gif.name}</strong>&rdquo;?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGif}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Eliminando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
