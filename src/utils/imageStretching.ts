// Utility functions for image stretching algorithms
// Replicates the functionality from the Python stretching_helpers.py

export interface ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface StretchParams {
  intensity: number;
  startingPixel: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export const DIRECTION_TO_DEGREES = {
  left: 90,
  right: 270,
  up: 180,
  down: 0
} as const;

/**
 * Creates an index list for stretching based on intensity
 * Replicates the create_index_list function from Python
 */
export function createIndexList(multiplicationFactor: number = 13): number[] {
  const inverseValueDict: { [key: number]: number } = {
    13: 1, 12: 1.25, 11: 1.5, 10: 1.75, 9: 2, 8: 2.25, 7: 2.5, 6: 2.75, 
    5: 3, 4: 3.25, 3: 3.5, 2: 3.75, 1: 4
  };

  const pairs = [
    [1, 13], [2, 8], [3, 5], [5, 3], [8, 2], [13, 1], [21, 1], [34, 1], 
    [55, 1], [89, 1], [144, 1], [233, 1], [377, 1], [610, 1], [987, 1]
  ];

  // Apply multiplication factor
  pairs.forEach(pair => {
    pair[0] = pair[0] * 1;
    pair[1] = Math.floor(pair[1] * inverseValueDict[multiplicationFactor]);
  });

  const indexList: number[] = [];
  pairs.forEach(([value, count]) => {
    for (let i = 0; i < count; i++) {
      indexList.push(value);
    }
  });

  return indexList;
}

/**
 * Creates a gradient between two pixel rows
 * Replicates the create_gradient function from Python
 */
export function createGradient(
  row1: Uint8ClampedArray,
  row2: Uint8ClampedArray,
  gradientSize: number,
  width: number
): Uint8ClampedArray[] {
  const gradient: Uint8ClampedArray[] = [];
  
  // Initialize gradient array
  for (let i = 0; i < gradientSize + 2; i++) {
    gradient.push(new Uint8ClampedArray(width * 4));
  }

  // Set first and last rows
  gradient[0].set(row1);
  gradient[gradient.length - 1].set(row2);

  // Calculate intermediate rows
  for (let step = 1; step <= gradientSize; step++) {
    const ratio = step / (gradientSize + 1);
    
    for (let x = 0; x < width; x++) {
      const baseIndex = x * 4;
      
      // Interpolate R, G, B values (skip alpha channel at index 3)
      for (let channel = 0; channel < 3; channel++) {
        const idx = baseIndex + channel;
        const startValue = row1[idx];
        const endValue = row2[idx];
        gradient[step][idx] = Math.round(startValue + (endValue - startValue) * ratio);
      }
      // Set alpha channel
      gradient[step][baseIndex + 3] = 255;
    }
  }

  return gradient;
}

/**
 * Rotates image data by specified degrees
 */
export function rotateImageData(
  imageData: ImageData,
  degrees: number
): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Handle 90-degree rotations
  if (degrees === 90 || degrees === 270) {
    canvas.width = imageData.height;
    canvas.height = imageData.width;
  } else {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
  }
  
  // Create ImageData object
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  
  const tempImageData = tempCtx.createImageData(imageData.width, imageData.height);
  tempImageData.data.set(imageData.data);
  tempCtx.putImageData(tempImageData, 0, 0);
  
  // Apply rotation
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(tempCanvas, -imageData.width / 2, -imageData.height / 2);
  ctx.restore();
  
  const rotatedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  return {
    data: rotatedImageData.data,
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Applies the stretching effect to the image
 * Replicates the build_new_image function from Python
 */
export function buildStretchedImage(
  indexList: number[],
  sourceImage: ImageData,
  startingPixel: number
): ImageData {
  const { width, height, data } = sourceImage;
  const bytesPerPixel = 4; // RGBA
  const rowBytes = width * bytesPerPixel;
  
  // Calculate new height based on stretching
  let newHeight = startingPixel;
  for (let i = startingPixel; i < height - 1 && i - startingPixel < indexList.length; i++) {
    newHeight += indexList[i - startingPixel] + 1;
  }
  
  const newImageData = new Uint8ClampedArray(newHeight * width * bytesPerPixel);
  
  // Copy unchanged rows before starting pixel
  for (let y = 0; y < startingPixel && y < height; y++) {
    const sourceStart = y * rowBytes;
    const destStart = y * rowBytes;
    newImageData.set(data.slice(sourceStart, sourceStart + rowBytes), destStart);
  }
  
  let currentRow = startingPixel;
  
  // Apply stretching from starting pixel onwards
  for (let y = startingPixel; y < height - 1 && y - startingPixel < indexList.length; y++) {
    const sourceRowStart = y * rowBytes;
    const nextRowStart = (y + 1) * rowBytes;
    
    const row1 = data.slice(sourceRowStart, sourceRowStart + rowBytes);
    const row2 = data.slice(nextRowStart, nextRowStart + rowBytes);
    
    const gradientSize = indexList[y - startingPixel];
    const gradient = createGradient(row1, row2, gradientSize, width);
    
    // Copy gradient rows to new image
    for (let g = 0; g < gradient.length - 1 && currentRow < newHeight; g++) {
      const destStart = currentRow * rowBytes;
      newImageData.set(gradient[g], destStart);
      currentRow++;
    }
  }
  
  return {
    data: newImageData,
    width,
    height: newHeight
  };
}

/**
 * Main function to stretch an image
 * Replicates the stretch_image function from Python
 */
export function stretchImage(
  imageData: ImageData,
  params: StretchParams
): ImageData {
  const { intensity, startingPixel, direction } = params;
  
  console.log('stretchImage called with:', { 
    imageWidth: imageData.width, 
    imageHeight: imageData.height, 
    intensity, 
    startingPixel, 
    direction 
  });
  
  try {
    // Create index list for stretching intensity
    const indexList = createIndexList(intensity);
    console.log('Index list created:', indexList.slice(0, 10)); // Show first 10 values
    
    // For now, let's just apply a simple stretch without rotation
    // Get the pixel data as array
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    console.log('About to apply stretching:', {
      direction,
      startingPixel,
      width,
      height,
      intensity,
      willStretch: (
        (direction === 'right' && startingPixel < width) ||
        (direction === 'left' && startingPixel < width) ||
        (direction === 'down' && startingPixel < height) ||
        (direction === 'up' && startingPixel < height)
      )
    });
    
    // Apply stretching effect based on direction
    if (direction === 'right' && startingPixel < width) {
      console.log('Starting right stretch from pixel', startingPixel);
      let pixelsModified = 0;
      
      // Make the stretch more dramatic by using a larger multiplier
      const stretchMultiplier = Math.max(3, intensity * 2);
      console.log('Using stretch multiplier:', stretchMultiplier);
      
      // Stretch pixels to the right from startingPixel
      for (let y = 0; y < height; y++) {
        for (let x = startingPixel + 1; x < width; x++) {
          // Create stretching effect by copying pixels from closer to the starting line
          const pixelFromStart = x - startingPixel;
          
          // Calculate how far back to look for the source pixel
          // Use a logarithmic scale to create more dramatic stretching further from start
          const stretchFactor = Math.min(stretchMultiplier, Math.ceil(pixelFromStart / 10));
          const sourceX = Math.max(startingPixel, x - stretchFactor);
          
          for (let c = 0; c < 4; c++) { // RGBA channels
            const targetIndex = (y * width + x) * 4 + c;
            const sourceIndex = (y * width + sourceX) * 4 + c;
            data[targetIndex] = data[sourceIndex];
          }
          pixelsModified++;
        }
      }
      
      console.log('Right stretch complete. Pixels modified:', pixelsModified);
      
    } else if (direction === 'left' && startingPixel < width) {
      console.log('Starting left stretch from pixel', startingPixel);
      let pixelsModified = 0;
      
      const stretchMultiplier = Math.max(3, intensity * 2);
      console.log('Using stretch multiplier:', stretchMultiplier);
      
      // Stretch pixels to the left from startingPixel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < startingPixel; x++) {
          const distanceFromStart = startingPixel - x;
          const stretchAmount = Math.min(stretchMultiplier, distanceFromStart);
          const sourceX = Math.min(startingPixel, x + stretchAmount);
          
          for (let c = 0; c < 4; c++) { // RGBA channels
            const targetIndex = (y * width + x) * 4 + c;
            const sourceIndex = (y * width + sourceX) * 4 + c;
            data[targetIndex] = data[sourceIndex];
          }
          pixelsModified++;
        }
      }
      
      console.log('Left stretch complete. Pixels modified:', pixelsModified);
      
    } else {
      console.log('No stretch applied - conditions not met');
    }
    
    console.log('Simple stretch applied');
    return {
      data: data,
      width: width,
      height: height
    };
    
    // Original stretching code commented out for debugging:
    /*
    // Rotate image based on direction
    const rotatedImage = rotateImageData(imageData, DIRECTION_TO_DEGREES[direction]);
    
    // Apply stretching
    const stretchedImage = buildStretchedImage(indexList, rotatedImage, startingPixel);
    
    // Rotate back to original orientation
    const finalImage = rotateImageData(stretchedImage, 360 - DIRECTION_TO_DEGREES[direction]);
    
    return finalImage;
    */
  } catch (error) {
    console.error('Error in stretchImage:', error);
    // Return original image as fallback
    return {
      data: new Uint8ClampedArray(imageData.data),
      width: imageData.width,
      height: imageData.height
    };
  }
}
