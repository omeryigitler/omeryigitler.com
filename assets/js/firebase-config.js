// Firebase Configuration
// Ömer Yiğitler - Web App
const firebaseConfig = {
    apiKey: "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM",
    authDomain: "omeryigitler-5abfb.firebaseapp.com",
    projectId: "omeryigitler-5abfb",
    storageBucket: "omeryigitler-5abfb.firebasestorage.app",
    messagingSenderId: "1082547983896",
    appId: "1:1082547983896:web:ac493bc4092f6cdae7156d",
    measurementId: "G-FX3R67T7S7"
};

// Global Exposure
window.firebaseConfig = firebaseConfig;

// AUTO-INITIALIZE
const shouldAutoInitializeFirebase =
    !(window.location && /\/admin\.html$/i.test(window.location.pathname));

if (typeof firebase !== 'undefined' && shouldAutoInitializeFirebase) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase Initialized");
    }
    // Global DB Access
    if (typeof firebase.firestore === 'function') {
        window.db = firebase.firestore();
    }
    if (typeof firebase.auth === 'function') {
        window.auth = firebase.auth();
    }
    if (typeof firebase.storage === 'function') {
        window.storage = firebase.storage();
    }
    console.log("✅ Window.DB & Storage Exposed");
} else if (typeof firebase !== 'undefined') {
    console.log("Firebase auto-init skipped for admin-managed initialization.");
} else {
    console.error("❌ Firebase SDK not found!");
}
