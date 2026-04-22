// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyA1MDndH7W2GLbhMaWiIcyzzZ9nPyZntKE",
    authDomain: "english-app-master.firebaseapp.com",
    projectId: "english-app-master",
    storageBucket: "english-app-master.firebasestorage.app",
    messagingSenderId: "1090408504482",
    appId: "1:1090408504482:web:20f3647c854598d465cbfb",
    measurementId: "G-HJNME9R3L4"
};

const app = initializeApp(firebaseConfig);


export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);