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
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase Initialized");
    }
    // Global DB Access
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = firebase.storage();
    console.log("✅ Window.DB & Storage Exposed");
} else {
    console.error("❌ Firebase SDK not found!");
}
