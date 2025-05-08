// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAj4lgN2mAuo_MMq_lHMOEDlfZSMNt9uxY",
  authDomain: "investai-ccf13.firebaseapp.com",
  projectId: "investai-ccf13",
  storageBucket: "investai-ccf13.firebasestorage.app",
  messagingSenderId: "453019114044",
  appId: "1:453019114044:web:928335e18f37bf977c4139",
  measurementId: "G-QKGX94S9SJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db   = getFirestore(app);
export const auth = getAuth(app);

export default app;