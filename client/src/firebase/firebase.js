import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBAoCUetN3nDtohmClxwDdu4m9zuP3JaGk",
  authDomain: "quantacon-3e441.firebaseapp.com",
  projectId: "quantacon-3e441",
  storageBucket: "quantacon-3e441.firebasestorage.app",
  messagingSenderId: "14424168418",
  appId: "1:14424168418:web:417a90b3c183870ede0bbb",
  measurementId: "G-82J04Y3T41"
};

const app = initializeApp(firebaseConfig);
export const db=getDatabase(app);