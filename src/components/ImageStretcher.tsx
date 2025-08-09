import React, { useState, useRef, useCallback, useEffect } from 'react';
import { stretchImage, type StretchParams } from '../utils/imageStretching';
import './ImageStretcher.css';

interface ImageInfo {
    file: File;
    url: string;
    width: number;
    height: number;
}

export const ImageStretcher: React.FC = () => {
    const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
    const [stretchRate, setStretchRate] = useState(13);
    const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('right');
    const [startingPixel, setStartingPixel] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const originalCanvasRef = useRef<HTMLCanvasElement>(null);

    // Handle file upload
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        if (!file.type.startsWith('image/')) {
            console.error('Invalid file type:', file.type);
            alert('Please select a valid image file');
            return;
        }

        console.log('File selected:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            console.log('Image loaded successfully:', {
                width: img.width,
                height: img.height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight
            });

            setImageInfo({
                file,
                url,
                width: img.width,
                height: img.height
            });

            // Use setTimeout to ensure refs are available
            setTimeout(() => {
                // Draw original image on hidden canvas
                if (originalCanvasRef.current) {
                    const canvas = originalCanvasRef.current;
                    const ctx = canvas.getContext('2d')!;
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    console.log('Original image drawn to hidden canvas:', {
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height
                    });
                } else {
                    console.error('Original canvas ref is null');
                }

                // Draw to visible canvas
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d')!;

                    // Calculate responsive display size based on aspect ratio and available space
                    const containerMaxWidth = window.innerWidth * 0.8; // 80vw
                    const containerMaxHeight = window.innerHeight * 0.8; // 80vh
                    const imageAspectRatio = img.width / img.height;
                    const containerAspectRatio = containerMaxWidth / containerMaxHeight;

                    let displayWidth: number;
                    let displayHeight: number;

                    if (imageAspectRatio > containerAspectRatio) {
                        // Image is wider than container - fit to width
                        displayWidth = Math.min(img.width, containerMaxWidth);
                        displayHeight = displayWidth / imageAspectRatio;
                    } else {
                        // Image is taller than container - fit to height
                        displayHeight = Math.min(img.height, containerMaxHeight);
                        displayWidth = displayHeight * imageAspectRatio;
                    }

                    // Ensure we don't exceed the original image dimensions unless necessary
                    if (displayWidth > img.width && displayHeight > img.height) {
                        displayWidth = img.width;
                        displayHeight = img.height;
                    }

                    canvas.width = Math.floor(displayWidth);
                    canvas.height = Math.floor(displayHeight);

                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, displayWidth, displayHeight);
                    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

                    console.log('Image drawn to visible canvas:', {
                        originalSize: `${img.width}x${img.height}`,
                        displaySize: `${displayWidth}x${displayHeight}`,
                        canvasSize: `${canvas.width}x${canvas.height}`,
                        aspectRatio: imageAspectRatio.toFixed(2),
                        containerSize: `${containerMaxWidth}x${containerMaxHeight}`,
                        canvasRef: !!canvasRef.current
                    });
                } else {
                    console.error('Visible canvas ref is null');
                }

                // Set starting pixel to middle of the image (works for all directions)
                const defaultStartingPixel = Math.floor(Math.min(img.width, img.height) * 0.5);
                setStartingPixel(defaultStartingPixel);
                console.log('Starting pixel set to:', defaultStartingPixel);
            }, 100); // Small delay to ensure refs are ready
        };

        img.onerror = (error) => {
            console.error('Failed to load image:', error);
            alert('Failed to load image');
        };

        img.src = url;
        console.log('Image src set, waiting for load...');
    }, []);

    // Get image data from canvas
    const getImageData = useCallback((): ImageData | null => {
        if (!originalCanvasRef.current) return null;

        const canvas = originalCanvasRef.current;
        const ctx = canvas.getContext('2d')!;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }, []);

    // Apply stretching effect
    const applyStretch = useCallback(() => {
        if (!imageInfo || !canvasRef.current) {
            console.log('Missing imageInfo or canvas ref');
            return;
        }

        setIsProcessing(true);

        try {
            const imageData = getImageData();
            if (!imageData) {
                console.error('Failed to get image data');
                setIsProcessing(false);
                return;
            }

            console.log('Got image data:', {
                width: imageData.width,
                height: imageData.height,
                dataLength: imageData.data.length
            });

            // For left and right directions, invert the starting pixel to fix coordinate mapping
            let adjustedStartingPixel = startingPixel;
            if (direction === 'left' || direction === 'right') {
                adjustedStartingPixel = imageInfo.width - 1 - startingPixel;
            }

            const params: StretchParams = {
                stretchRate,
                startingPixel: adjustedStartingPixel,
                direction
            };

            console.log('Applying stretch with params:', params);

            // Apply stretching
            setTimeout(() => {
                try {
                    if (canvasRef.current) {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d')!;

                        console.log('Starting stretch process...');

                        // Apply stretching directly (don't draw original first)
                        const stretchedImageData = stretchImage(imageData, params);

                        console.log('Stretched image data:', {
                            width: stretchedImageData.width,
                            height: stretchedImageData.height,
                            dataLength: stretchedImageData.data.length
                        });

                        // Validate result
                        if (stretchedImageData.width <= 0 || stretchedImageData.height <= 0) {
                            console.error('Invalid stretched image dimensions, keeping original');
                            setIsProcessing(false);
                            return;
                        }

                        // Set canvas to display the stretched image with responsive sizing
                        const containerMaxWidth = window.innerWidth * 0.8; // 80vw
                        const containerMaxHeight = window.innerHeight * 0.8; // 80vh
                        const stretchedAspectRatio = stretchedImageData.width / stretchedImageData.height;
                        const containerAspectRatio = containerMaxWidth / containerMaxHeight;

                        let displayWidth: number;
                        let displayHeight: number;

                        if (stretchedAspectRatio > containerAspectRatio) {
                            // Stretched image is wider than container - fit to width
                            displayWidth = Math.min(stretchedImageData.width, containerMaxWidth);
                            displayHeight = displayWidth / stretchedAspectRatio;
                        } else {
                            // Stretched image is taller than container - fit to height
                            displayHeight = Math.min(stretchedImageData.height, containerMaxHeight);
                            displayWidth = displayHeight * stretchedAspectRatio;
                        }

                        canvas.width = Math.floor(displayWidth);
                        canvas.height = Math.floor(displayHeight);

                        console.log('Canvas display size set to:', canvas.width, 'x', canvas.height);

                        // Create ImageData object for the stretched result
                        const newImageData = ctx.createImageData(stretchedImageData.width, stretchedImageData.height);
                        newImageData.data.set(stretchedImageData.data);

                        // Create a temporary canvas to hold the full-size stretched image
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d')!;
                        tempCanvas.width = stretchedImageData.width;
                        tempCanvas.height = stretchedImageData.height;
                        tempCtx.putImageData(newImageData, 0, 0);

                        // Draw the stretched image scaled to fit the display canvas
                        ctx.clearRect(0, 0, displayWidth, displayHeight);
                        ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);

                        console.log('Stretched image drawn to canvas');

                        // Create blob URL for download using the full-size stretched image (tempCanvas)
                        tempCanvas.toBlob((blob: Blob | null) => {
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

                    // Fallback: just show original image
                    if (canvasRef.current && imageData) {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d')!;
                        canvas.width = imageData.width;
                        canvas.height = imageData.height;
                        ctx.putImageData(imageData, 0, 0);
                        console.log('Showing original image as fallback');
                    }

                    setIsProcessing(false);
                }
            }, 50);
        } catch (error) {
            console.error('Error processing image:', error);
            setIsProcessing(false);
        }
    }, [imageInfo, stretchRate, startingPixel, direction, getImageData, processedImageUrl]);

    // Auto-apply stretch when parameters change (with debouncing)
    useEffect(() => {
        console.log('useEffect triggered with imageInfo:', !!imageInfo, 'isProcessing:', isProcessing);
        if (!imageInfo || isProcessing) return;

        console.log('Scheduling auto-stretch...');
        const timeoutId = setTimeout(() => {
            console.log('Auto-applying stretch...');
            applyStretch();
        }, 300); // 300ms debounce

        return () => {
            console.log('Clearing auto-stretch timeout');
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageInfo, stretchRate, startingPixel, direction]);

    // Handle window resize to update canvas display size
    useEffect(() => {
        if (!imageInfo || !canvasRef.current) return;

        const handleResize = () => {
            // Re-apply stretch with new display dimensions
            applyStretch();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [imageInfo, applyStretch]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-gray-900">
            {!imageInfo ? (
                // Centered intro section when no image is loaded
                <div className="min-h-screen flex flex-col items-center justify-center px-4">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 pb-2 leading-tight">
                            Image Stretcher
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
                            Upload an image and apply artistic stretching effects
                        </p>
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
                </div>
            ) : (
                // Main app interface when image is loaded - centered vertically
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
                        {/* Processed Image - Main content area */}
                        <div className="flex-1 flex flex-col items-center justify-center p-4 order-1 lg:order-1">
                            <div className="image-container">
                                {/* Hidden canvas for processing original image */}
                                <canvas ref={originalCanvasRef} style={{ display: 'none' }} />

                                {/* Canvas wrapper */}
                                <div className="canvas-wrapper">
                                    <canvas
                                        ref={canvasRef}
                                        className="image-canvas"
                                        title={imageInfo ? `Image: ${imageInfo.file.name}` : 'Upload an image to get started'}
                                        style={{
                                            border: '2px solid #333',
                                            backgroundColor: 'white',
                                            display: 'block',
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            width: 'auto',
                                            height: 'auto'
                                        }}
                                    />
                                </div>

                                {/* Horizontal slider (bottom) for left/right stretching */}
                                <div className="horizontal-slider-container" style={{
                                    visibility: direction === 'left' || direction === 'right' ? 'visible' : 'hidden'
                                }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max={imageInfo ? imageInfo.width - 1 : 100}
                                        value={startingPixel}
                                        onChange={(e) => setStartingPixel(parseInt(e.target.value))}
                                        className="horizontal-slider"
                                    />
                                </div>

                                {/* Vertical slider (right) for up/down stretching */}
                                <div className="vertical-slider-container" style={{
                                    visibility: direction === 'up' || direction === 'down' ? 'visible' : 'hidden'
                                }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max={imageInfo ? imageInfo.height - 1 : 100}
                                        value={startingPixel}
                                        onChange={(e) => setStartingPixel(parseInt(e.target.value))}
                                        className="vertical-slider"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Controls - Compact sidebar */}
                        <div className="lg:w-64 flex-shrink-0 order-2 lg:order-2 flex items-center">
                            <div className="controls-panel w-full">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 text-center">
                                    Controls
                                </h3>

                                {/* Stretch Rate Control */}
                                <div className="control-group">
                                    <label htmlFor="stretch-rate" className="control-label">
                                        Stretch Rate: {stretchRate}
                                    </label>
                                    <input
                                        id="stretch-rate"
                                        type="range"
                                        min="1"
                                        max="13"
                                        value={stretchRate}
                                        onChange={(e) => setStretchRate(parseInt(e.target.value))}
                                        className="slider"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400 mt-1">
                                        <span>Gradual</span>
                                        <span>Rapid</span>
                                    </div>
                                </div>

                                {/* Direction Controls */}
                                <div className="control-group">
                                    <label className="control-label">Direction</label>
                                    <div className="direction-controls">
                                        {/* Top row */}
                                        <div className="direction-row">
                                            <label className="radio-label direction-up">
                                                <input
                                                    type="radio"
                                                    value="up"
                                                    checked={direction === 'up'}
                                                    onChange={(e) => setDirection(e.target.value as 'up')}
                                                />
                                                ↑
                                            </label>
                                        </div>

                                        {/* Middle row */}
                                        <div className="direction-row">
                                            <label className="radio-label direction-left">
                                                <input
                                                    type="radio"
                                                    value="left"
                                                    checked={direction === 'left'}
                                                    onChange={(e) => setDirection(e.target.value as 'left')}
                                                />
                                                ←
                                            </label>

                                            {/* Processing Spinner box - always visible */}
                                            <div className="processing-spinner">
                                                {isProcessing && <div className="spinner"></div>}
                                            </div>

                                            <label className="radio-label direction-right">
                                                <input
                                                    type="radio"
                                                    value="right"
                                                    checked={direction === 'right'}
                                                    onChange={(e) => setDirection(e.target.value as 'right')}
                                                />
                                                →
                                            </label>
                                        </div>

                                        {/* Bottom row */}
                                        <div className="direction-row">
                                            <label className="radio-label direction-down">
                                                <input
                                                    type="radio"
                                                    value="down"
                                                    checked={direction === 'down'}
                                                    onChange={(e) => setDirection(e.target.value as 'down')}
                                                />
                                                ↓
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Horizontal Rule */}
                                <hr className="border-gray-200 dark:border-gray-600 my-4" />

                                {/* Action Buttons */}
                                <div className="control-group">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="action-btn flex-1"
                                            style={{
                                                background: 'linear-gradient(to right, rgb(100 116 139), rgb(71 85 105))',
                                                color: 'white'
                                            }}
                                        >
                                            New Image
                                        </button>

                                        <button
                                            onClick={downloadImage}
                                            className="action-btn flex-1"
                                            style={{
                                                background: 'linear-gradient(to right, rgb(59 130 246), rgb(37 99 235))',
                                                color: 'white'
                                            }}
                                        >
                                            Save
                                            <img src="/downloadIcon.svg" alt="Download" className="w-4 h-4 ml-2 inline" />
                                        </button>
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
