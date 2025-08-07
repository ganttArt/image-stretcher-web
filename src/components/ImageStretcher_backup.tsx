import React, { useState, useRef, useCallback, useEffect } from 'react';
import { stretchImage } from '../utils/imageStretching';
import type { StretchParams } from '../utils/imageStretching';
import './ImageStretcher.css';

interface ImageInfo {
  file: File;
  url: string;
  width: number;
  height: number;
}

export const ImageStretcher: React.FC = () => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [intensity, setIntensity] = useState(13);
  const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('right');
  const [startingPixel, setStartingPixel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      setImageInfo({
        file,
        url,
        width: img.width,
        height: img.height
      });
      
      // Draw original image on canvas
      if (originalCanvasRef.current) {
        const canvas = originalCanvasRef.current;
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      }
      
      // Reset starting pixel when new image is loaded
      const defaultStartingPixel = Math.floor(Math.min(img.width, img.height) * 0.3);
      setStartingPixel(defaultStartingPixel);
    };
    
    img.src = url;
  }, []);

  // Get image data from canvas
  const getImageData = useCallback((): ImageData | null => {
    if (!originalCanvasRef.current) return null;
    
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Apply stretching effect
  const applyStretch = useCallback(async () => {
    if (!imageInfo || !canvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const imageData = getImageData();
      if (!imageData) {
        console.error('Failed to get image data');
        setIsProcessing(false);
        return;
      }

      console.log('Original image data:', { 
        width: imageData.width, 
        height: imageData.height, 
        dataLength: imageData.data.length 
      });

      const params: StretchParams = {
        intensity,
        startingPixel,
        direction
      };

      console.log('Stretch params:', params);

      // Apply stretching in a timeout to allow UI to update
      setTimeout(() => {
        try {
          const stretchedImageData = stretchImage(imageData, params);
          
          console.log('Stretched image data:', { 
            width: stretchedImageData.width, 
            height: stretchedImageData.height, 
            dataLength: stretchedImageData.data.length 
          });
          
          // Validate stretched image data
          if (stretchedImageData.width <= 0 || stretchedImageData.height <= 0 || stretchedImageData.data.length === 0) {
            console.error('Invalid stretched image data, using original');
            // Fallback to original image
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d')!;
              canvas.width = imageData.width;
              canvas.height = imageData.height;
              ctx.putImageData(imageData, 0, 0);
            }
            setIsProcessing(false);
            return;
          }
          
          // Draw result on canvas
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;
            canvas.width = stretchedImageData.width;
            canvas.height = stretchedImageData.height;
            
            const newImageData = ctx.createImageData(stretchedImageData.width, stretchedImageData.height);
            newImageData.data.set(stretchedImageData.data);
            ctx.putImageData(newImageData, 0, 0);
            
            console.log('Canvas updated:', { 
              canvasWidth: canvas.width, 
              canvasHeight: canvas.height 
            
            console.log('Canvas updated:', { 
              canvasWidth: canvas.width, 
              canvasHeight: canvas.height 
            });
          
            // Create blob URL for download
            canvas.toBlob((blob) => {
              if (blob) {
                if (processedImageUrl) {
                  URL.revokeObjectURL(processedImageUrl);
                }
                const url = URL.createObjectURL(blob);
                setProcessedImageUrl(url);
              }
            });
          }
          
          setIsProcessing(false);
        } catch (stretchError) {
          console.error('Error in stretching algorithm:', stretchError);
          setIsProcessing(false);
        }
      }, 100);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
      alert('Error processing image. Please try again.');
    }
  }, [imageInfo, intensity, startingPixel, direction, getImageData]);

  // Handle random stretch
  const applyRandomStretch = useCallback(() => {
    if (!imageInfo) return;
    
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    const randomIntensity = Math.floor(Math.random() * 13) + 1;
    
    let maxPixel = 0;
    if (direction === 'up' || direction === 'down') {
      maxPixel = imageInfo.height;
    } else {
      maxPixel = imageInfo.width;
    }
    const randomStartingPixel = Math.floor(Math.random() * maxPixel);
    
    setDirection(randomDirection);
    setIntensity(randomIntensity);
    setStartingPixel(randomStartingPixel);
  }, [imageInfo, direction]);

  // Auto-apply stretch when parameters change
  useEffect(() => {
    if (imageInfo) {
      applyStretch();
    }
  }, [imageInfo, intensity, startingPixel, direction]);

  // Download processed image
  const downloadImage = useCallback(() => {
    if (!processedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = processedImageUrl;
    link.download = `stretched_${imageInfo?.file.name || 'image.png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImageUrl, imageInfo]);

  // Get max value for starting pixel slider
  const getMaxStartingPixel = useCallback(() => {
    if (!imageInfo) return 100;
    
    if (direction === 'up' || direction === 'down') {
      return imageInfo.height - 1;
    } else {
      return imageInfo.width - 1;
    }
  }, [imageInfo, direction]);

  // Calculate canvas styles based on aspect ratio
  const getCanvasStyles = useCallback(() => {
    if (!imageInfo) return { maxWidth: '90vw', maxHeight: '80vh' };
    
    const aspectRatio = imageInfo.width / imageInfo.height;
    const isWide = aspectRatio > 1;
    
    if (isWide) {
      // Image is wider than tall - take full width
      return {
        width: '90vw',
        height: 'auto',
        maxHeight: '80vh'
      };
    } else {
      // Image is taller than wide - take full height
      return {
        height: '80vh',
        width: 'auto',
        maxWidth: '90vw'
      };
    }
  }, [imageInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Image Stretcher
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Upload an image and apply artistic stretching effects with real-time preview
        </p>
      </div>

      {/* Image Upload */}
      {!imageInfo && (
        <div className="text-center mb-12">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Open Image
          </button>
        </div>
      )}

      {imageInfo && (
        <div className="flex flex-col lg:flex-row h-full">
          {/* Hidden canvas for processing original image */}
          <canvas ref={originalCanvasRef} className="hidden" />

          {/* Controls - Fixed width sidebar */}
          <div className="lg:w-80 flex-shrink-0 p-4">
            <div className="controls-panel sticky top-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">
                Controls
              </h3>
              
              {/* Intensity Control */}
              <div className="control-group">
                <label htmlFor="intensity" className="control-label">
                  Intensity
                  <span className="value-display">{intensity}</span>
                </label>
                <input
                  id="intensity"
                  type="range"
                  min="1"
                  max="13"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Max Stretch</span>
                  <span>Min Stretch</span>
                </div>
              </div>

              {/* Starting Pixel Control */}
              <div className="control-group">
                <label htmlFor="starting-pixel" className="control-label">
                  Starting Pixel
                  <span className="value-display">{startingPixel}</span>
                </label>
                <input
                  id="starting-pixel"
                  type="range"
                  min="0"
                  max={getMaxStartingPixel()}
                  value={startingPixel}
                  onChange={(e) => setStartingPixel(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>0</span>
                  <span>{getMaxStartingPixel()}</span>
                </div>
              </div>

              {/* Direction Controls */}
              <div className="control-group">
                <label className="control-label">Direction</label>
                <div className="direction-controls">
                  <label className="radio-label direction-up">
                    <input
                      type="radio"
                      value="up"
                      checked={direction === 'up'}
                      onChange={(e) => setDirection(e.target.value as 'up')}
                    />
                    ↑ Up
                  </label>
                  <label className="radio-label direction-left">
                    <input
                      type="radio"
                      value="left"
                      checked={direction === 'left'}
                      onChange={(e) => setDirection(e.target.value as 'left')}
                    />
                    ← Left
                  </label>
                  <label className="radio-label direction-right">
                    <input
                      type="radio"
                      value="right"
                      checked={direction === 'right'}
                      onChange={(e) => setDirection(e.target.value as 'right')}
                    />
                    Right →
                  </label>
                  <label className="radio-label direction-down">
                    <input
                      type="radio"
                      value="down"
                      checked={direction === 'down'}
                      onChange={(e) => setDirection(e.target.value as 'down')}
                    />
                    ↓ Down
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="control-group">
                <button 
                  onClick={applyRandomStretch}
                  className="action-btn random-btn"
                  disabled={isProcessing}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Random
                </button>
                <button 
                  onClick={downloadImage}
                  className="action-btn save-btn"
                  disabled={!processedImageUrl || isProcessing}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Save Image
                </button>
                
                {/* New Image Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="action-btn upload-btn w-full mt-2"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  New Image
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {isProcessing && (
                <div className="processing-indicator">
                  <svg className="w-5 h-5 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing image...
                </div>
              )}
            </div>
          </div>

          {/* Processed Image - Full viewport area */}
          <div className="flex-1 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              className="image-canvas shadow-2xl rounded-lg"
              style={{
                ...getCanvasStyles(),
                minWidth: '200px',
                minHeight: '200px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
