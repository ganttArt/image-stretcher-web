# Image Stretcher Web App

A React TypeScript web application that replicates the functionality of a Python-based image stretching tool. This application allows users to upload images and apply artistic stretching effects in different directions using HTML5 Canvas and modern web technologies.

## Features

- **Image Upload**: Support for various image formats (JPEG, PNG, GIF, etc.)
- **Interactive Controls**: 
  - Intensity slider (1-13) for controlling stretch effect strength
  - Position slider for selecting starting pixel
  - Direction radio buttons (Up, Down, Left, Right)
  - Random button for random parameter generation
- **Real-time Processing**: Live preview of stretching effects
- **Canvas-based Rendering**: High-quality image processing using HTML5 Canvas
- **Download Functionality**: Save processed images to your device
- **Responsive Design**: Works on desktop and mobile devices

## Algorithm

The application replicates the Python image stretching algorithm:

1. **Image Rotation**: Rotates the image based on stretch direction
2. **Index List Creation**: Generates stretching patterns using Fibonacci-based sequences
3. **Gradient Generation**: Creates smooth transitions between pixel rows
4. **Stretching Application**: Applies the stretching effect using mathematical interpolation
5. **Final Rotation**: Rotates the result back to original orientation

## Technology Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **HTML5 Canvas API** for image processing
- **CSS Grid & Flexbox** for responsive layout
- **Modern ES6+** JavaScript features

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Usage

1. **Upload an Image**: Click the "Open Image" button and select an image file
2. **Adjust Parameters**:
   - Use the intensity slider to control stretch strength (1 = maximum stretch, 13 = minimal stretch)
   - Use the starting pixel slider to choose where the stretch begins
   - Select direction using radio buttons (Up, Down, Left, Right)
3. **Preview**: The stretched image updates automatically as you adjust parameters
4. **Save**: Click "Save Image" to download the processed image
5. **Random**: Click "Random" to generate random parameters for creative effects

## Examples

The stretching algorithm creates artistic effects similar to:
- Waterfall-like flowing effects
- Face distortions and artistic portraits
- Architectural stretching for unique perspectives
- Abstract art generation from photographs

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Optimized for images up to 2000x2000 pixels
- Processing time varies based on image size and intensity
- Real-time preview for immediate feedback

## Contributing

Feel free to submit issues and enhancement requests!
