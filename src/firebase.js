import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZdEyOJC0bUMok7kDTXAAI5FyveH-CX1Y",
  authDomain: "dashboard-c6e06.firebaseapp.com",
  projectId: "dashboard-c6e06",
  storageBucket: "dashboard-c6e06.firebasestorage.app",
  messagingSenderId: "688408841449",
  appId: "1:688408841449:web:686c1c812b5ae0e1627478",
  measurementId: "G-07YMMVRP7H"
};

const app = initializeApp(firebaseConfig);

// QUIC 프로토콜 오류(ERR_QUIC_PROTOCOL_ERROR) 방지:
// experimentalAutoDetectLongPolling → 네트워크 환경에 따라 QUIC / Long Polling 자동 선택
// ignoreUndefinedProperties → undefined 값 저장 시 오류 방지
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);
export default app;

