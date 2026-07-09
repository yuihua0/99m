import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8x7Sg2Az-sQ71hKqrTOLU0F2v6FXnCcQ",
  authDomain: "multiplying-21bd8.firebaseapp.com",
  projectId: "multiplying-21bd8",
  storageBucket: "multiplying-21bd8.firebasestorage.app",
  messagingSenderId: "1077294448518",
  appId: "1:1077294448518:web:4dda8f82bb25c6518ff607",
  measurementId: "G-9D1ZHGQP6R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
