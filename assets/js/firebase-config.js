// Firebase Configuration
// Lütfen kendi Firebase Proje ayarlarınızla bu kısmı doldurun.
// Firebase Console -> Project Settings -> General -> Your Apps -> Config

const firebaseConfig = {
    apiKey: "BURAYA_API_KEY_GELECEK",
    authDomain: "BURAYA_AUTH_DOMAIN_GELECEK",
    projectId: "BURAYA_PROJECT_ID_GELECEK",
    storageBucket: "BURAYA_STORAGE_BUCKET_GELECEK",
    messagingSenderId: "BURAYA_MESSAGING_SENDER_ID",
    appId: "BURAYA_APP_ID"
};

// Bu dosya HTML sayfalarında script olarak yüklenecek
// ve 'firebaseConfig' değişkenini erişilebilir kılacak.
window.firebaseConfig = firebaseConfig;
