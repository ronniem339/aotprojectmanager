// A comprehensive service worker for PWA installability and offline functionality.

const CACHE_NAME = 'aot-pm-cache-v1';
// This list MUST include every external resource the app needs to load.
const urlsToCache = [
  // The entry points
  '.',
  'index.html',
  'manifest.json',
  'style.css',
  'icons/AOT-lg.png',

  // External Fonts, Icons, and CSS
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdn.tailwindcss.com',

  // Core Libraries
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',

  // Firebase SDKs
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage-compat.js',

  // Configs & Utilities
  'js/config.js',
  'js/utils/aiUtils.js',
  'js/utils/imageUploadUtils.js',
  'js/utils/wordpressUtils.js',

  // App Components
  'js/components/common.js',
  'js/components/NewProjectWizard/WizardStep_AIParse.js',
  'js/components/NewProjectWizard/WizardStep1_Foundation.js',
  'js/components/NewProjectWizard/WizardStep2_Inventory.js',
  'js/components/NewProjectWizard/WizardStep3_Keywords.js',
  'js/components/NewProjectWizard/WizardStep4_Title.js',
  'js/components/NewProjectWizard/WizardStep5_Description.js',
  'js/components/NewProjectWizard/WizardStep6_Review.js',
  'js/components/NewProjectWizard.js',
  'js/components/Dashboard.js',
  'js/components/SettingsMenu.js',
  'js/components/WordpressSettings.js',
  'js/components/TechnicalSettingsView.js',
  'js/components/MyStudioView.js',
  'js/components/ProjectSelection.js',
  'js/components/ImportProjectView.js',
  'js/components/KnowledgeBaseView.js',

  // Tools & Sub-components
  'js/components/ToolsView.js',
  'js/components/ShortsTool.js',
  'js/components/ContentLibrary.js',
  'js/components/GeneratedPostViewer.js',
  'js/components/TaskQueue.js',
  'js/components/WordpressPublisher.js',
  'js/components/BlogTool.js',

  // Project View Components
  'js/components/ProjectView/ProjectHeader.js',
  'js/components/ProjectView/VideoList.js',
  'js/components/ProjectView/EditProjectModal.js',
  'js/components/ProjectView/EditVideoModal.js',
  'js/components/ProjectView/FullScreenScriptView.js',
  'js/components/ProjectView/VideoDetailsSidebar.js',
  'js/components/ProjectView/tasks/SimpleConfirmationTask.js',
  'js/components/ProjectView/tasks/ScriptingTask.js',
  'js/components/ProjectView/tasks/EditVideoTask.js',
  'js/components/ProjectView/tasks/TitleTask.js',
  'js/components/ProjectView/tasks/DescriptionTask.js',
  'js/components/ProjectView/tasks/ChaptersTask.js',
  'js/components/ProjectView/tasks/TagsTask.js',
  'js/components/ProjectView/tasks/ThumbnailTask.js',
  'js/components/ProjectView/tasks/UploadToYouTubeTask.js',
  'js/components/ProjectView/tasks/FirstCommentTask.js',
  'js/components/ProjectView/VideoWorkspace.js',
  'js/components/ProjectView/ManageFootageModal.js',
  'js/components/ProjectView.js',
  'js/components/ProjectView/ShortsIdeasToolModal.js',
  'js/components/NewVideoWizardModal.js',

  // Main App Entry Point
  'js/app.js'
];

// Install event: Open a cache and add all the app shell files to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache app shell:', error);
      })
  );
});

// Activate event: Clean up any old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: Serve cached content when available, fall back to network.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the resource is in the cache, return it.
        if (response) {
          return response;
        }
        // Otherwise, fetch from the network.
        return fetch(event.request);
      })
  );
});
