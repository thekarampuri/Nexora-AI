import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAOfL6Wqzuu6js3-_-LzpNWQv1RSQ-jdsE",
    authDomain: "chd-prediction.firebaseapp.com",
    projectId: "chd-prediction",
    storageBucket: "chd-prediction.appspot.com",
    messagingSenderId: "538966034256",
    appId: "1:538966034256:web:12217c10714b9c51322046"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
