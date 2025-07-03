# Gemini Reference

This document provides a reference for Gemini and other AI assistants interacting with this project. It outlines the correct procedures for committing changes and summarizes the application's architecture and functionality.

To ensure you have the latest context, please read the `ARCHITECTURE.md` file at the beginning of each new session. This will help you understand the application's structure and design principles.

## Committing Changes

To ensure that commits are made correctly and consistently, please follow these steps:

1.  **Create a Commit Message File:** Create a temporary file named `commit_message.txt` in the root of the project. This file will contain the full commit message, including the subject, body, and any additional information. This method is preferred to avoid issues with command length and special characters in the shell.

2.  **Stage Changes:** Use `git add <file1> <file2> ...` to stage the files you want to commit.

3.  **Commit with File:** Use the command `git commit -F commit_message.txt` to commit the staged changes. This will use the content of the `commit_message.txt` file as the commit message.

4.  **Push Changes:** Push the changes to the remote repository using `git push`.

5.  **Clean Up:** After the push is successful, delete the temporary commit message file. On Windows, use `del commit_message.txt`. On Linux or macOS, use `rm commit_message.txt`.

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
