import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA4DneN4ZlbSi9Nw0YpSeK86L3rPjCbS8E",
  authDomain: "solutionchallenge-27bf1.firebaseapp.com",
  projectId: "solutionchallenge-27bf1",
  storageBucket: "solutionchallenge-27bf1.firebasestorage.app",
  messagingSenderId: "102708874138",
  appId: "1:102708874138:web:562f5d26a3a8746b0d0823"
};

let app;
let auth;
let googleProvider;
let isMock = false;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FALLBACK_API_KEY" && firebaseConfig.apiKey !== "") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Auth initialized successfully.");
  } catch (error) {
    console.warn("Failed to initialize Firebase Auth, falling back to mock mode:", error);
    isMock = true;
  }
} else {
  console.log("No Firebase API key provided. Operating in Local Mock Authentication mode.");
  isMock = true;
}

// Local mock store for users
let mockUser = null;
const mockCallbacks = new Set();

const triggerMockAuthChange = (user) => {
  mockCallbacks.forEach(cb => cb(user));
};

export const loginMockUser = (name = "Demo Judge", email = "judge@solutionchallenge.org") => {
  const user = {
    uid: "mock-demo-user-id",
    displayName: name,
    email: email,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
    getIdToken: async () => `mock-demo-user-id`
  };
  mockUser = user;
  localStorage.setItem("mock_user", JSON.stringify(user));
  triggerMockAuthChange(user);
  return Promise.resolve(user);
};

export const logoutMockUser = () => {
  mockUser = null;
  localStorage.removeItem("mock_user");
  triggerMockAuthChange(null);
  return Promise.resolve();
};

// Unified Auth API
export const authService = {
  isMockMode: () => isMock,
  
  signInWithGoogle: async () => {
    if (isMock) {
      return loginMockUser();
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      console.error("Google Sign-In failed, switching to Mock User:", err);
      return loginMockUser();
    }
  },

  signOut: async () => {
    if (isMock) {
      return logoutMockUser();
    }
    return signOut(auth);
  },

  onAuthStateChanged: (callback) => {
    if (isMock) {
      const savedUserStr = localStorage.getItem("mock_user");
      if (savedUserStr) {
        try {
          const user = JSON.parse(savedUserStr);
          user.getIdToken = async () => `mock-demo-user-id`;
          mockUser = user;
        } catch {
          mockUser = null;
        }
      }
      mockCallbacks.add(callback);
      setTimeout(() => callback(mockUser), 0);
      return () => {
        mockCallbacks.delete(callback);
      };
    } else {
      return onAuthStateChanged(auth, callback);
    }
  }
};
