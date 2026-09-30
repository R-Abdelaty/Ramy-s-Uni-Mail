import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingSettings = ['apiKey', 'authDomain', 'projectId', 'appId'].filter((key) => !firebaseConfig[key])
export const firebaseSetupError = missingSettings.length
  ? `Firebase web settings are missing: ${missingSettings.join(', ')}. Set the Firebase web settings in .env.local or the hosting build environment, then rebuild.`
  : ''

let services

export function getFirebaseServices() {
  if (firebaseSetupError) throw new Error(firebaseSetupError)
  if (!services) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    services = {
      auth: getAuth(app),
      provider: new GoogleAuthProvider(),
      db: getFirestore(app),
    }
  }
  return services
}
