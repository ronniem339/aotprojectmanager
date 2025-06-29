// creators-hub/js/auth.js

// Initialize Firebase
try {
    if (firebase.apps.length === 0) {
        firebase.initializeApp(window.CREATOR_HUB_CONFIG.FIREBASE_CONFIG);
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
}

const auth = firebase.auth();
const db = firebase.firestore();
