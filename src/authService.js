
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import app, { db } from "./firebaseConfig";   

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();


export const signup = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    ); // register user
    const user = userCredential.user; // grab user 

   
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
    }); // save user in the users collection

    return user;
  } catch (error) {
    throw error;
  }
};


export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


export const googleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    await setDoc(
      doc(db, "users", user.uid),
      { email: user.email },
      { merge: true }
    );  // merge user record

    return user;
  } catch (error) {
    throw error;
  }
};  

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};
