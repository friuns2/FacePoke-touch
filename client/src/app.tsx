import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FiDownload } from 'react-icons/fi';
import { PiImageSquare } from 'react-icons/pi';
import { BsTextareaT } from 'react-icons/bs';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { truncateFileName } from './lib/utils';
import { useFaceLandmarkDetection } from './hooks/useFaceLandmarkDetection';
import { About } from './components/About';
import { Spinner } from './components/Spinner';
import { useFacePokeAPI } from './hooks/useFacePokeAPI';
import { Layout } from './layout';
import { useMainStore } from './hooks/useMainStore';

import sampleImage1 from '/samples/sample1.webp'  // You'll need to add these images to your public/samples folder
import sampleImage2 from '/samples/sample2.webp'
import sampleImage3 from '/samples/sample3.webp'

export function App() {
  const error = useMainStore(s => s.error);
  const setError = useMainStore(s => s.setError);
  const imageFile = useMainStore(s => s.imageFile);
  const setImageFile = useMainStore(s => s.setImageFile);
  const isGazingAtCursor = useMainStore(s => s.isGazingAtCursor);
  const setIsGazingAtCursor = useMainStore(s => s.setIsGazingAtCursor);
  const isFollowingCursor = useMainStore(s => s.isFollowingCursor);
  const setIsFollowingCursor = useMainStore(s => s.setIsFollowingCursor);

  const previewImage = useMainStore(s => s.previewImage);
  const status = useMainStore(s => s.status);
  const blendShapes = useMainStore(s => s.blendShapes);

  const {
    isDebugMode,
    setIsDebugMode,
    interruptMessage,
  } = useFacePokeAPI()

  const {
    canvasRefCallback,
    isMediaPipeReady,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    currentOpacity
  } = useFaceLandmarkDetection()

  // Refs
  const videoRef = useRef<HTMLDivElement>(null);

  // Handle file change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setImageFile(files?.[0] || undefined)
  }, [setImageFile]);

  const handleDownload = useCallback(() => {
    if (previewImage) {
      const link = document.createElement('a');
      link.href = previewImage;
      link.download = 'result.webp';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [previewImage]);

  const applyMemeText = useCallback((imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageUrl);

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Configure text style
        const fontSize = Math.floor(canvas.height * 0.08);
        ctx.font = `bold ${fontSize}px Impact`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = fontSize * 0.08;
        ctx.textAlign = 'center';

        // Add text at the bottom
        const text = "THIS IS MEEME";
        const padding = fontSize;
        const textY = canvas.height - padding;
        
        // Draw text stroke and fill
        ctx.strokeText(text, canvas.width / 2, textY);
        ctx.fillText(text, canvas.width / 2, textY);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };

      img.src = imageUrl;
    });
  }, []);

  const [isMemeMode, setIsMemeMode] = useState(false);

  const handleAddMemeText = useCallback(async () => {
    if (!previewImage) return;
    setIsMemeMode(true);
    const memeImage = await applyMemeText(previewImage);
    useMainStore.getState().setPreviewImage(memeImage);
  }, [previewImage, applyMemeText]);

  const canDisplayBlendShapes = false

  // Display blend shapes
  const displayBlendShapes = useMemo(() => (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Blend Shapes</h3>
        <ul className="space-y-1">
          {(blendShapes?.[0]?.categories || []).map((shape, index) => (
            <li key={index} className="flex items-center">
              <span className="w-32 text-sm">{shape.categoryName || shape.displayName}</span>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${shape.score * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm">{shape.score.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
  ), [JSON.stringify(blendShapes)])

  // Add these new handlers after your existing handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files?.length > 0 && files[0].type.startsWith('image/')) {
      setImageFile(files[0]);
    }
  }, [setImageFile]);

  // Add useEffect for document-level drag and drop
  useEffect(() => {
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer?.files;
      if (files?.length > 0 && files[0].type.startsWith('image/')) {
        setImageFile(files[0]);
      }
    };

    // Add document-level event listeners
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    // Cleanup
    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
    };
  }, [setImageFile]);

  // Add this helper function after other handlers
  const handleSampleImageClick = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sample.jpg', { type: 'image/jpeg' });
      setImageFile(file);
    } catch (error) {
      console.error('Error loading sample image:', error);
      setError('Failed to load sample image');
    }
  }, [setImageFile, setError]);

  // JSX
  return (
    <Layout>
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="h-full"
      >
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {interruptMessage && (
          <Alert>
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>{interruptMessage}</AlertDescription>
          </Alert>
        )}
        <div className="mb-4 relative">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center">
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!isMediaPipeReady}
                />
                <label
                  htmlFor="imageInput"
                  className={`cursor-pointer inline-flex items-center border border-transparent font-medium rounded-md text-white ${
                    imageFile ? 'text-xs px-2 h-8' : 'text-lg px-4 h-12'
                  } ${
                    isMediaPipeReady ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-500 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-xl`}
                >
                  <PiImageSquare className="w-4 h-4 mr-1.5" />
                  {imageFile ? `Replace` : (isMediaPipeReady ? 'Choose a portrait photo' : 'Initializing...')}
                </label>
              </div>
              {previewImage && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-2 h-8 border border-transparent text-xs font-medium rounded-md text-white bg-zinc-600 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 shadow-xl"
                >
                  <FiDownload className="w-4 h-4 mr-1.5" />
                  Download
                </button>
              )}
              {previewImage && (
                <button
                  onClick={handleAddMemeText}
                  className="inline-flex items-center px-2 h-8 border border-transparent text-xs font-medium rounded-md text-white bg-zinc-600 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 shadow-xl ml-2"
                >
                  <BsTextareaT className="w-4 h-4 mr-1.5" />
                  Generate Meme
                </button>
              )}
            </div>
            {previewImage && <div className="flex items-center space-x-2">
              {/* experimental features, not active yet */}
              {/*
              <label className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  checked={isGazingAtCursor}
                  onChange={(e) => setIsGazingAtCursor(!isGazingAtCursor)}
                  className="mr-2"
                />
                Autotrack eyes
              </label>
              <label className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  checked={isFollowingCursor}
                  onChange={(e) => setIsFollowingCursor(!isFollowingCursor)}
                  className="mr-2"
                />
                Autotrack head
              </label>
              */}
              <label className="mt-2 flex items-center text-sm mr-2">
                <input
                  type="checkbox"
                  checked={isDebugMode}
                  onChange={(e) => setIsDebugMode(e.target.checked)}
                  className="mr-2"
                />
                Show face markers
              </label>
            </div>}
          </div>
          {previewImage && (
            <div className="mt-2 relative shadow-2xl rounded-xl overflow-hidden">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full"
              />
              <canvas
                ref={canvasRefCallback}
                className="absolute top-0 left-0 w-full h-full select-none"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={(e) => {
                  e.preventDefault(); // Prevent default touch behavior on canvas
                  handleTouchStart(e);
                }}
                onTouchMove={(e) => {
                  e.preventDefault(); // Prevent default touch behavior on canvas
                  handleTouchMove(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault(); // Prevent default touch behavior on canvas
                  handleTouchEnd(e);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: isDebugMode ? currentOpacity : 0.0,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              />
            </div>
          )}
          {canDisplayBlendShapes && displayBlendShapes}
        </div>
        <About />
        {!previewImage && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Or try these samples:</h3>
            <div className="grid grid-cols-3 gap-4">
              {[sampleImage1, sampleImage2, sampleImage3].map((image, index) => (
                <div 
                  key={index}
                  onClick={() => handleSampleImageClick(image)}
                  className="cursor-pointer rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-105"
                >
                  <img 
                    src={image} 
                    alt={`Sample ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div 
          data-app-root="true" 
          data-meme-mode={isMemeMode}
          ref={(el) => {
            if (el) {
              (el as any).__applyMemeText = applyMemeText;
            }
          }}
        >
          {/* ... rest of your JSX ... */}
        </div>
      </div>
    </Layout>
  );
}
