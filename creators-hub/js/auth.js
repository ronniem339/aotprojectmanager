// This script initializes Firebase and makes the auth and db objects
// globally available for other scripts to use.

// Initialize Firebase using the config from config.js
firebase.initializeApp(window.CREATOR_HUB_CONFIG.FIREBASE_CONFIG);

// Create global instances for Firebase services
window.auth = firebase.auth();
window.db = firebase.firestore();
