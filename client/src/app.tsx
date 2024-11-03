import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FiDownload } from 'react-icons/fi';
import { PiImageSquare, PiCamera } from 'react-icons/pi';
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
    return new Promise(async (resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageUrl);

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Convert canvas to base64
        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

        // Get meme text from API
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer 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`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Meme Generator'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.2-11b-vision-instruct',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Generate a funny meme caption for this image in 5-7 words.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                      }
                    }
                  ]
                }
              ]
            })
          });

          const data = await response.json();
          let memeText = data.choices[0].message.content;

          // Text wrapping and rendering function
          const wrapText = (text: string, maxWidth: number) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
              const word = words[i];
              const width = ctx.measureText(currentLine + " " + word).width;
              if (width < maxWidth) {
                currentLine += " " + word;
              } else {
                lines.push(currentLine);
                currentLine = word;
              }
            }
            lines.push(currentLine);
            return lines;
          };

          // Configure initial text style
          let fontSize = Math.floor(canvas.height * 0.10);
          const maxWidth = canvas.width * 0.9; // 90% of canvas width
          const padding = fontSize * 0.8;

          // Adjust font size until text fits
          do {
            ctx.font = `bold ${fontSize}px Impact`;
            const lines = wrapText(memeText, maxWidth);
            const totalTextHeight = lines.length * (fontSize * 1.2); // 1.2 is line height

            if (totalTextHeight <= canvas.height * 0.3) { // Ensure text doesn't take more than 30% of image height
              break;
            }
            fontSize -= 2;
          } while (fontSize > 20); // Minimum font size

          // Final text rendering
          ctx.font = `bold ${fontSize}px Impact`;
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = fontSize * 0.1;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const lines = wrapText(memeText, maxWidth);
          const lineHeight = fontSize * 1.2;
          const totalHeight = lines.length * lineHeight;
          const startY = canvas.height - padding - totalHeight + lineHeight;

          lines.forEach((line, index) => {
            const y = startY + (index * lineHeight);
            // Draw stroke
            for(let i = 0; i < 4; i++) {
              ctx.strokeText(line, canvas.width / 2, y);
            }
            // Draw fill
            ctx.fillText(line, canvas.width / 2, y);
          });

        } catch (error) {
          console.error('Error getting meme text:', error);
          // Similar fallback text handling with wrapping
          const text = "THIS IS MEME";
          const fontSize = Math.floor(canvas.height * 0.10);
          ctx.font = `bold ${fontSize}px Impact`;
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = fontSize * 0.1;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          const padding = fontSize * 0.8;
          const textY = canvas.height - padding;
          
          for(let i = 0; i < 4; i++) {
            ctx.strokeText(text, canvas.width / 2, textY);
          }
          ctx.fillText(text, canvas.width / 2, textY);
        }

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
        className="h-full relative pb-24"
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
        {previewImage && (
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-2 h-8 border border-transparent text-xs font-medium rounded-md text-white bg-zinc-600 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 shadow-xl"
            >
              <FiDownload className="w-4 h-4 mr-1.5" />
              Download
            </button>
            <button
              onClick={handleAddMemeText}
              className="inline-flex items-center px-2 h-8 border border-transparent text-xs font-medium rounded-md text-white bg-zinc-600 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 shadow-xl"
            >
              <BsTextareaT className="w-4 h-4 mr-1.5" />
              Generate Meme
            </button>
          </div>
        )}
        {previewImage && (
          <div className="relative shadow-2xl rounded-xl overflow-hidden">
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
                e.preventDefault();
                handleTouchStart(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                handleTouchMove(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleTouchEnd(e);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: currentOpacity,
                transition: 'opacity 0.2s ease-in-out'
              }}
            />
          </div>
        )}
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
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
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
            className={`cursor-pointer inline-flex items-center justify-center rounded-full w-16 h-16 ${
              isMediaPipeReady ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-500 cursor-not-allowed'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-xl transition-transform hover:scale-110`}
          >
            <PiCamera className="w-8 h-8 text-white" />
          </label>
        </div>
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
