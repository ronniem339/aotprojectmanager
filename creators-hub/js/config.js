// This file centralizes configuration.
// By attaching them to the global `window` object, they become accessible 
// to all other scripts loaded after this one, without needing imports.

window.CREATOR_HUB_CONFIG = {
  // IMPORTANT: Replace with your actual Firebase API Key
  // You can find this in your Firebase project settings.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDMyKgfdFF55V8OKp_1u684IWeWkpWtQNA", 
    authDomain: "aot-project-manager.firebaseapp.com",
    projectId: "aot-project-manager",
    storageBucket: "aot-project-manager.appspot.com",
    messagingSenderId: "732535263997",
    appId: "1:732535263997:web:c9281e5696b8830f0f6494"
  },
  
  // These are environment variables that will be provided in the runtime environment.
  APP_ID: typeof __app_id !== 'undefined' ? __app_id : 'creators-hub-deploy',
  INITIAL_AUTH_TOKEN: typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null,

  // --- YouTube SEO Knowledge Base ---
  YOUTUBE_SEO_KNOWLEDGE_BASE: `
      **YouTube SEO Best Practices:**
      1.  **Titles:** Include main keywords naturally at the beginning. Keep it under 70 characters. Use numbers or intrigue to boost CTR. For playlists, the title should be broad but compelling.
      2.  **Descriptions:** The first 2-3 sentences are crucial. Include main keywords and a hook. Write a detailed mini-blog post (200-300 words) explaining the video's content and value. Use keywords naturally. Include timestamps and relevant links.
      3.  **Tags:** Use a mix of broad and long-tail tags (15-30 total). Your first tag should be your main target keyword.
      4.  **Thumbnails:** High-contrast, clear, emotionally compelling. Use bold, minimal text. Bright colors draw the eye. It must visually represent the title's promise.
      5.  **Playlists:** A playlist is a series. The title and description should reflect the entire journey and explain why someone should watch it in order.
  `,

  // Define TASK_PIPELINE globally in config
  // **FIX**: Refactored the single metadata task into three distinct tasks.
  TASK_PIPELINE: [
      { id: 'scripting', title: 'Scripting & Recording' },
      { id: 'videoEdited', title: 'Edit Video & Log Changes' },
      { id: 'titleGenerated', title: 'Finalize Title' },
      { id: 'descriptionGenerated', title: 'Finalize Description' },
      { id: 'chaptersGenerated', title: 'Finalize Chapters' },
      { id: 'thumbnailsGenerated', title: 'Generate Thumbnails' },
      { id: 'videoUploaded', title: 'Upload to YouTube' },
      { id: 'firstCommentGenerated', title: 'Generate First Comment'}
  ]
};
