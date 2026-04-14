import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, getDocFromServer, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists to preserve role and limits
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    const isAdmin = user.email === "amirkiss1983@gmail.com";

    // Update user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastSeen: new Date().toISOString(),
      isOnline: true,
      role: userData?.role || (isAdmin ? 'admin' : 'user'),
      usageLimit: userData?.usageLimit ?? (isAdmin ? 999999 : 5),
      usageCount: userData?.usageCount ?? 0
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  if (auth.currentUser) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      isOnline: false,
      lastSeen: new Date().toISOString()
    }, { merge: true });
  }
  return auth.signOut();
};

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();
