# Creator's Hub

An AI-powered co-pilot designed to streamline the workflow for content creators. From idea generation and scripting to publishing, Creator's Hub helps you manage your entire video and blog creation process.

## Table of Contents
* [About The Project](#about-the-project)
* [Key Features](#key-features)
* [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Architecture](#architecture)
* [License](#license)
* [Future Enhancements & Roadmap](#future-enhancements--roadmap)

## About The Project
Creator's Hub is a web-based platform that acts as an intelligent assistant for content creators. It leverages the power of the Google Gemini API to automate and enhance various aspects of content creation, including brainstorming, scriptwriting, and generating metadata. The application is built with a focus on project management, helping creators track their progress from an initial concept to a published piece of content on platforms like YouTube and WordPress.

## Key Features
* **Project Management:** Organize your work into projects, each containing multiple videos or blog posts.
* **AI-Powered Content Generation:**
    * Generate video titles, descriptions, chapters, and tags.
    * Brainstorm ideas for YouTube Shorts and blog posts.
    * Create complete video scripts and blog articles from simple prompts.
* **YouTube & WordPress Integration:**
    * Import projects directly from YouTube video or playlist URLs.
    * Publish generated content directly to your WordPress site.
* **Task-Based Workflow:** Track the status of each video through a checklist of tasks, from scripting to final upload.
* **Content Library:** Manage and reuse your existing footage and assets.
* **PWA Ready:** Installable on your desktop or mobile device for a native-app-like experience with offline capabilities.

## Built With
This project is built with a modern web stack, relying on robust and scalable technologies.
* **Frontend:**
    * React (loaded via CDN)
    * Tailwind CSS
* **Backend & Database:**
    * Firebase
        * Firestore: For all database needs.
        * Authentication: For user management.
        * Storage: For file and image uploads.
* **AI Engine:**
    * Google Gemini API
* **Deployment & Hosting:**
    * Netlify
    * Netlify Functions: For secure, server-side API interactions.

## Getting Started
To get a local copy up and running, follow these steps.

### Prerequisites
* Node.js installed on your machine.
* Netlify CLI installed globally. `npm install netlify-cli -g`

### Installation
1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd aotprojectmanager
    ```
2.  **Set up Firebase:**
    * Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    * In your new project, create a new "Web" app.
    * Navigate to Project Settings > General, and find your Firebase configuration object. It will look like this:
        ```javascript
        const firebaseConfig = {
          apiKey: "AIza...",
          authDomain: "your-project.firebaseapp.com",
          projectId: "your-project",
          storageBucket: "your-project.appspot.com",
          messagingSenderId: "...",
          appId: "..."
        };
        ```
    * Enable Email/Password sign-in method in the Authentication > Sign-in method tab.
    * Set up Firestore and Storage with the default security rules to get started.
3.  **Configure the Application:**
    * Open the file `creators-hub/js/config.js`.
    * Replace the placeholder Firebase configuration with the one from your Firebase project.
    * Add your Google Gemini API key and any other required API keys to this file.
4.  **Install Netlify Function Dependencies:**
    * The serverless functions in the `netlify/` directory have their own dependencies.
    ```bash
    npm install
    ```
5.  **Run the project locally:**
    * Use the Netlify CLI to run the project. This will serve the static files and run the serverless functions in a local environment.
    ```bash
    netlify dev
    ```
    The application should now be running on `http://localhost:8888`.

## Architecture
For a detailed explanation of the application's structure, components, data flow, and interdependencies, please see our Architecture Reference ([ARCHITECTURE.md](ARCHITECTURE.md)). This document is intended to help developers and AI tools quickly understand the codebase.

## License
Distributed under the MIT License. See `LICENSE.txt` for more information.
(Note: You will need to add a LICENSE.txt file to your repository if you wish to include a license.)

### Future Enhancements & Roadmap

We are continuously working to improve the Creator's Hub. Here are some key areas identified for future development:

* **Advanced AI Integration and User Experience:**
    * **Proactive AI Suggestions:** Explore implementing AI that provides real-time suggestions as users interact with the application, rather than only on explicit button clicks. This could include suggestions for rephrasing, content expansion, or alternative approaches based on the user's input and project context.
    * **Multimodal Input:** Investigate integrating capabilities for AI to process and understand non-textual inputs (e.g., analyzing video clips for content suggestions, processing audio for transcription insights). This would enhance the AI's ability to inform script suggestions and content creation.
    * **Personalized Knowledge Bases:** Develop functionality for users to upload and leverage their own private knowledge bases (e.g., past scripts, internal brand guidelines, personal research notes) to further fine-tune AI outputs and ensure highly personalized content generation.
    * *(Note: Foundational steps towards enhanced AI integration, such as the centralized `triggerAiTask` for robust AI operation and improved error handling, have already been implemented within the Scripting V2 workflow, paving the way for these advanced features.)*

* **Sophisticated Task Queueing and Management:**
    * Implement a more robust task management system, especially for long-running or asynchronous AI operations. This would provide clearer status updates (e.g., pending, in-progress, completed, failed, retrying), allow for task prioritization, and potentially enable cancellation of ongoing AI processes. This would improve transparency and user control over background operations.
    * *(Note: Initial capabilities for sophisticated task queueing and granular progress reporting for AI tasks have been introduced with the `triggerAiTask` handler in `useAppState.js`, providing a solid foundation for further expansion in this area.)*

* **Long-Term Architectural Evolution:**
    * **Modern Build Pipeline:** As the application grows in complexity and features, consider a gradual migration from the current CDN-first, browser-transpilation architecture to a modern build system (e.g., Vite, Webpack, or similar). This would enable better optimization (tree-shaking, code splitting), more robust development tooling, easier integration of npm packages, and potentially improved application load times and performance. This is a significant architectural shift that would be evaluated for long-term scalability and development efficiency.
    * **Comprehensive Testing Strategy:** Develop and implement a formal testing strategy encompassing unit tests for individual components and utility functions, integration tests for key workflows (especially involving AI and Firestore interactions), and end-to-end tests to ensure the overall application flow is robust and reliable. This is crucial for maintaining quality as the codebase evolves.
