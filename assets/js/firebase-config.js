// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -------------------------------------------------------------
// FIREBASE CONFIGURATION
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM",
    authDomain: "omeryigitler-5abfb.firebaseapp.com",
    projectId: "omeryigitler-5abfb",
    storageBucket: "omeryigitler-5abfb.firebasestorage.app",
    messagingSenderId: "1082547983896",
    appId: "1:1082547983896:web:ac493bc4092f6cdae7156d",
    measurementId: "G-FX3R67T7S7"
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
    try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        return messages;
    } catch (e) {
        console.error("Error fetching messages:", e);
        return [];
    }
}

export { db, saveMessage, getMessages };
