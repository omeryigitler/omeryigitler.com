// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -------------------------------------------------------------
// DİKKAT: AŞAĞIDAKİ BİLGİLERİ KENDİ FIREBASE PROJENLE DEĞİŞTİR
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "BURAYA_FIREBASE_API_KEY_GELECEK",
    authDomain: "BURAYA_PROJECT_ID.firebaseapp.com",
    projectId: "BURAYA_PROJECT_ID",
    storageBucket: "BURAYA_PROJECT_ID.appspot.com",
    messagingSenderId: "BURAYA_SENDER_ID",
    appId: "BURAYA_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to save message
async function saveMessage(name, email, message) {
    try {
        const docRef = await addDoc(collection(db, "messages"), {
            name: name,
            email: email,
            message: message,
            timestamp: new Date(),
            status: "new"
        });
        console.log("Document written with ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
}

// Helper function to get messages
async function getMessages() {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const messages = [];
    querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
    });
    return messages;
}

export { db, saveMessage, getMessages };
