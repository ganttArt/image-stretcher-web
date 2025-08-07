# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a React TypeScript web application that replicates the functionality of a Python-based image stretching tool. The application allows users to upload images and apply artistic stretching effects in different directions.

## Key Features
- Image upload functionality
- Canvas-based image manipulation 
- Interactive controls: sliders for position selection, radio buttons for direction, intensity controls
- Real-time image processing and preview
- Image download/save functionality
- Responsive UI design

## Technical Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Image Processing**: HTML5 Canvas API
- **Styling**: CSS Modules or styled-components
- **State Management**: React hooks (useState, useEffect)

## Code Style Guidelines
- Use functional components with TypeScript
- Implement proper error handling for image processing
- Use semantic HTML and accessible UI components
- Follow React best practices for state management
- Implement proper file validation for image uploads
- Use modern ES6+ JavaScript features
- Maintain clean, readable code with proper TypeScript types

## ESLint and Code Quality
- **Always observe ESLint rules** - fix warnings and errors before committing
- **React Hooks Rules**: Be careful with useEffect dependencies to avoid infinite loops
    - When ESLint suggests adding a function to dependencies, consider if it will cause re-renders
    - Use `// eslint-disable-next-line react-hooks/exhaustive-deps` only when intentional
    - **It's acceptable to disable ESLint rules if they would cause bugs or infinite loops in the code**
- **TypeScript Rules**: Remove unused variables and imports
- **Switch Statement Rules**: Use block scopes `{}` for case statements with variable declarations
- **Code Organization**: Remove dead code and unused functions
- Run `npm run lint` to check for issues before making changes

## Image Processing Algorithm
The application should replicate the Python algorithm that:
1. Rotates images based on stretch direction
2. Creates index lists for stretching intensity
3. Builds gradients between pixel rows
4. Applies stretching effects using mathematical interpolation
5. Rotates the result back to original orientation
