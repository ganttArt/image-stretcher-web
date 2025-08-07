export interface StretchParams {
    stretchRate: number;
    startingPixel: number;
    direction: 'up' | 'down' | 'left' | 'right';
}

export interface StretchedImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

/**
 * Create index list based on stretch rate (replicating Python create_index_list)
 * Higher values create faster degradation into uniform color
 */
export function createIndexList(stretchRate: number = 13): number[] {
    const inverseValueDict: { [key: number]: number } = {
        13: 1, 12: 1.25, 11: 1.5, 10: 1.75, 9: 2, 8: 2.25, 7: 2.5, 6: 2.75,
        5: 3, 4: 3.25, 3: 3.5, 2: 3.75, 1: 4
    };

    const pairs = [
        [1, 13], [2, 8], [3, 5], [5, 3], [8, 2], [13, 1], [21, 1], [34, 1],
        [55, 1], [89, 1], [144, 1], [233, 1], [377, 1], [610, 1], [987, 1]
    ];

    // Apply stretch rate
    pairs.forEach(pair => {
        pair[0] = pair[0] * 1;
        pair[1] = Math.floor(pair[1] * inverseValueDict[stretchRate]);
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
 * Create gradient between two rows of pixels (replicating Python create_gradient)
 */
function createGradient(twoRowArray: Uint8ClampedArray[], gradientSize: number, width: number): Uint8ClampedArray[] {
    const gradientArray: Uint8ClampedArray[] = [];

    // Initialize gradient array
    for (let i = 0; i < gradientSize + 2; i++) {
        gradientArray.push(new Uint8ClampedArray(width * 4));
    }

    // Set first and last rows
    gradientArray[0].set(twoRowArray[0]);
    gradientArray[gradientSize + 1].set(twoRowArray[1]);

    // Create gradient between rows
    for (let gradientRow = 1; gradientRow <= gradientSize; gradientRow++) {
        for (let col = 0; col < width; col++) {
            for (let c = 0; c < 3; c++) { // RGB only, keep A as 255
                const startVal = gradientArray[0][col * 4 + c];
                const endVal = gradientArray[gradientSize + 1][col * 4 + c];
                const step = (endVal - startVal) / (gradientSize + 1);
                gradientArray[gradientRow][col * 4 + c] = Math.round(startVal + step * gradientRow);
            }
            // Keep alpha channel
            gradientArray[gradientRow][col * 4 + 3] = 255;
        }
    }

    return gradientArray;
}

/**
 * Build new image using index list and gradients (replicating Python build_new_image)
 */
function buildNewImage(indexList: number[], sourceImageData: ImageData, startingPixel: number): StretchedImageData {
    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const sourceData = sourceImageData.data;

    console.log('Building new image with:', { width, height, startingPixel, indexListLength: indexList.length });

    // Calculate new height based on index list (don't constrain yet)
    let newHeight = startingPixel;
    for (let i = 0; i < Math.min(indexList.length, height - startingPixel - 1); i++) {
        newHeight += indexList[i] + 1;
    }

    console.log('Calculated new height:', newHeight);

    // Create new image data array
    const newData = new Uint8ClampedArray(newHeight * width * 4);

    // Copy rows before starting pixel unchanged
    for (let row = 0; row < startingPixel; row++) {
        const sourceStart = row * width * 4;
        const targetStart = row * width * 4;
        for (let i = 0; i < width * 4; i++) {
            newData[targetStart + i] = sourceData[sourceStart + i];
        }
    }

    let newRowIndex = startingPixel;
    let indexListIndex = 0;

    // Process rows from starting pixel using index list
    for (let sourceRow = startingPixel; sourceRow < height - 1 && indexListIndex < indexList.length; sourceRow++) {
        if (newRowIndex >= newHeight) break;

        const gradientSize = indexList[indexListIndex];

        // Get two adjacent rows
        const row1 = new Uint8ClampedArray(width * 4);
        const row2 = new Uint8ClampedArray(width * 4);

        for (let i = 0; i < width * 4; i++) {
            row1[i] = sourceData[sourceRow * width * 4 + i];
            row2[i] = sourceData[(sourceRow + 1) * width * 4 + i];
        }

        // Create gradient between the two rows
        const gradientArray = createGradient([row1, row2], gradientSize, width);

        // Copy gradient rows to new image
        for (let gradRow = 0; gradRow < gradientArray.length - 1 && newRowIndex < newHeight; gradRow++) {
            const targetStart = newRowIndex * width * 4;
            for (let i = 0; i < width * 4; i++) {
                newData[targetStart + i] = gradientArray[gradRow][i];
            }
            newRowIndex++;
        }

        indexListIndex++;
    }

    console.log('Final new image dimensions:', { width, height: newRowIndex });

    return {
        data: newData,
        width: width,
        height: newRowIndex
    };
}

/**
 * Crop stretched image to not exceed original dimensions
 */
function cropToOriginalSize(stretchedData: StretchedImageData, originalWidth: number, originalHeight: number, direction: 'up' | 'down' | 'left' | 'right'): StretchedImageData {
    const { width, height, data } = stretchedData;
    
    // Always crop to exact original dimensions
    const cropWidth = originalWidth;
    const cropHeight = originalHeight;
    
    // If already the correct size, return as-is
    if (width === cropWidth && height === cropHeight) {
        return stretchedData;
    }
    
    console.log('Cropping stretched image from', `${width}x${height}`, 'to', `${cropWidth}x${cropHeight}`, 'direction:', direction);
    
    // Create cropped data
    const croppedData = new Uint8ClampedArray(cropWidth * cropHeight * 4);
    
    // Determine starting positions based on direction
    let startX = 0;
    let startY = 0;
    
    switch (direction) {
        case 'down':
            // Keep top part, crop bottom
            startX = 0;
            startY = 0;
            break;
        case 'up':
            // Keep bottom part, crop top
            startX = 0;
            startY = Math.max(0, height - cropHeight);
            break;
        case 'right':
            // Keep left part, crop right
            startX = 0;
            startY = 0;
            break;
        case 'left':
            // Keep right part, crop left
            startX = Math.max(0, width - cropWidth);
            startY = 0;
            break;
    }
    
    // Copy the appropriate portion of the stretched image
    for (let y = 0; y < cropHeight; y++) {
        for (let x = 0; x < cropWidth; x++) {
            const sourceX = Math.min(startX + x, width - 1);
            const sourceY = Math.min(startY + y, height - 1);
            const sourceIndex = (sourceY * width + sourceX) * 4;
            const targetIndex = (y * cropWidth + x) * 4;
            
            for (let c = 0; c < 4; c++) {
                croppedData[targetIndex + c] = data[sourceIndex + c];
            }
        }
    }
    
    return {
        data: croppedData,
        width: cropWidth,
        height: cropHeight
    };
}

/**
 * Rotate image data 90 degrees clockwise or counterclockwise
 */
function rotateImageData(imageData: ImageData, clockwise: boolean = true): ImageData {
    const { width, height, data } = imageData;
    const newWidth = height;
    const newHeight = width;
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = (y * width + x) * 4;

            let newX, newY;
            if (clockwise) {
                newX = height - 1 - y;
                newY = x;
            } else {
                newX = y;
                newY = width - 1 - x;
            }

            const targetIndex = (newY * newWidth + newX) * 4;

            for (let c = 0; c < 4; c++) {
                newData[targetIndex + c] = data[sourceIndex + c];
            }
        }
    }

    return new ImageData(newData, newWidth, newHeight);
}

/**
 * Main stretch function with support for all directions
 */
export function stretchImage(
    imageData: ImageData,
    params: StretchParams
): StretchedImageData {
    const { stretchRate, startingPixel, direction } = params;

    console.log('stretchImage called with:', {
        imageWidth: imageData.width,
        imageHeight: imageData.height,
        stretchRate,
        startingPixel,
        direction
    });

    try {
        // Create index list for stretch rate
        const indexList = createIndexList(stretchRate);
        console.log('Index list created:', indexList.slice(0, 10));

        let workingImageData = imageData;
        let workingStartingPixel = startingPixel;

        // Rotate image and adjust starting pixel based on direction
        switch (direction) {
            case 'down':
                // No rotation needed, this is our base case
                workingStartingPixel = Math.min(startingPixel, imageData.height - 1);
                console.log('Down direction: no rotation needed');
                break;

            case 'up':
                // Rotate 180 degrees (rotate twice)
                workingImageData = rotateImageData(imageData, true);
                workingImageData = rotateImageData(workingImageData, true);
                workingStartingPixel = workingImageData.height - Math.min(startingPixel, imageData.height - 1) - 1;
                console.log('Up direction: rotated 180 degrees');
                break;

            case 'right':
                // Rotate 90 degrees clockwise so right becomes down
                workingImageData = rotateImageData(imageData, true);
                workingStartingPixel = workingImageData.height - Math.min(startingPixel, imageData.width - 1) - 1;
                console.log('Right direction: rotated 90° clockwise');
                break;

            case 'left':
                // Rotate 90 degrees counterclockwise so left becomes down
                workingImageData = rotateImageData(imageData, false);
                workingStartingPixel = Math.min(startingPixel, imageData.width - 1);
                console.log('Left direction: rotated 90° counterclockwise');
                break;

            default:
                console.log('Unknown direction, using down as default');
                workingStartingPixel = Math.min(startingPixel, imageData.height - 1);
        }

        console.log('Working image dimensions:', {
            width: workingImageData.width,
            height: workingImageData.height,
            startingPixel: workingStartingPixel
        });

        // Apply the stretch (always in downward direction now)
        if (workingStartingPixel < workingImageData.height) {
            console.log('Applying stretch from row', workingStartingPixel);

            let stretchedData = buildNewImage(indexList, workingImageData, workingStartingPixel);

            // Rotate back to original orientation
            switch (direction) {
                case 'down': {
                    // No rotation back needed
                    console.log('Down direction: no rotation back needed');
                    break;
                }

                case 'up': {
                    // Rotate 180 degrees back
                    const tempImageData1 = new ImageData(new Uint8ClampedArray(stretchedData.data), stretchedData.width, stretchedData.height);
                    let rotatedBack1 = rotateImageData(tempImageData1, true);
                    rotatedBack1 = rotateImageData(rotatedBack1, true);
                    stretchedData = {
                        data: rotatedBack1.data,
                        width: rotatedBack1.width,
                        height: rotatedBack1.height
                    };
                    console.log('Up direction: rotated back 180 degrees');
                    break;
                }

                case 'right': {
                    // Rotate 90 degrees counterclockwise back
                    const tempImageData2 = new ImageData(new Uint8ClampedArray(stretchedData.data), stretchedData.width, stretchedData.height);
                    const rotatedBack2 = rotateImageData(tempImageData2, false);
                    stretchedData = {
                        data: rotatedBack2.data,
                        width: rotatedBack2.width,
                        height: rotatedBack2.height
                    };
                    console.log('Right direction: rotated back 90° counterclockwise');
                    break;
                }

                case 'left': {
                    // Rotate 90 degrees clockwise back
                    const tempImageData3 = new ImageData(new Uint8ClampedArray(stretchedData.data), stretchedData.width, stretchedData.height);
                    const rotatedBack3 = rotateImageData(tempImageData3, true);
                    stretchedData = {
                        data: rotatedBack3.data,
                        width: rotatedBack3.width,
                        height: rotatedBack3.height
                    };
                    console.log('Left direction: rotated back 90° clockwise');
                    break;
                }
            }

            // Crop the stretched result to not exceed original image dimensions
            stretchedData = cropToOriginalSize(stretchedData, imageData.width, imageData.height, direction);

            console.log('Stretch complete:', {
                originalDimensions: `${imageData.width}x${imageData.height}`,
                finalDimensions: `${stretchedData.width}x${stretchedData.height}`,
                direction
            });

            return stretchedData;

        } else {
            console.log('Invalid starting pixel, returning original');
            return {
                data: new Uint8ClampedArray(imageData.data),
                width: imageData.width,
                height: imageData.height
            };
        }

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
