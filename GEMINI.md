# Gemini Reference

This document provides a reference for Gemini and other AI assistants interacting with this project. It summarizes the application's architecture and functionality.

To ensure you have the latest context, please read the `ARCHITECTURE.md` file at the beginning of each new session. This will help you understand the application's structure and design principles.

## Application Overview

### Purpose

The "Creator's Hub" is an AI-powered web application designed to assist content creators with their entire workflow, from initial brainstorming and scripting to publishing on platforms like YouTube and WordPress.

### Core Technologies

*   **Frontend:** React, with styling primarily handled by Tailwind CSS and some global styles in `style.css`.
*   **Backend:** Firebase for authentication, Firestore (NoSQL database), and Storage.
*   **AI:** Google Gemini API is the primary AI engine.
*   **Deployment:** Netlify for hosting and serverless functions.

### Project Structure

*   **`creators-hub/`**: The main application directory.
    *   **`js/`**: Contains the core JavaScript for the application.
        *   **`app.js`**: The main application component, managing state and routing.
        *   **`config.js`**: Centralizes configuration for Firebase and API keys.
        *   **`components/`**: Contains all React components, organized by feature.
        *   **`utils/ai/`**: Contains all AI-related utility functions.
    *   **`netlify/functions/`**: Contains serverless functions for secure interactions with external APIs.

### Key Functionality

*   **Project Management:** Users can create and manage video projects, tracking their progress through a series of tasks.
*   **AI Content Generation:** The application can generate video titles, descriptions, scripts, blog posts, and more.
*   **YouTube/WordPress Integration:** Users can import projects from YouTube and publish content directly to WordPress.
*   **Task-Based Workflow:** The application uses a task-based workflow to guide creators through the content creation process.
*   **Shot List Feature:** A "paper edit" of the video, generated from the script and on-camera dialogue, with user-provided locations and available footage.