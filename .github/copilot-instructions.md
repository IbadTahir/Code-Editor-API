<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Editron Frontend - Copilot Instructions

This is a React frontend application built with TypeScript, Vite, and Tailwind CSS that integrates with three backend APIs:

## Project Overview
- **User Management API**: Authentication, user roles, JWT tokens
- **Code Editor API**: Session management, code execution, room collaboration  
- **Educational Platform API**: Books, videos, AI evaluations

## Technology Stack
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- React Hook Form + Yup for form validation
- Axios for API calls
- React Hot Toast for notifications

## Project Structure
- `/src/components` - Reusable UI components
- `/src/pages` - Page components
- `/src/services` - API service layers
- `/src/context` - React contexts for state management
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utility functions
- `/src/hooks` - Custom React hooks

## API Integration Notes
- All API calls go through service layers in `/src/services`
- Authentication tokens are managed automatically via Axios interceptors
- API base URLs are configurable in `apiClient.ts`
- Error handling is centralized with toast notifications

## UI/UX Guidelines
- Use Tailwind CSS classes for styling
- Follow responsive design principles
- Maintain consistent spacing and typography
- Use the established color palette (primary: blue-600)
- Implement loading states and error handling

## Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use proper type definitions from `/src/types`
- Follow the existing naming conventions
- Keep components small and focused

When generating code, please follow these patterns and maintain consistency with the existing codebase.
