import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZdEyOJC0bUMok7kDTXAAI5FyveH-CX1Y",
  authDomain: "dashboard-c6e06.firebaseapp.com",
  projectId: "dashboard-c6e06",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function check() {
  try {
    await signInAnonymously(auth);
    const q = query(collection(db, "rawBeanSnapshots"), orderBy("createdAt", "desc"), limit(2));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} snapshots`);
    snap.forEach(d => {
      console.log(d.id, "=>", JSON.stringify(d.data(), null, 2));
    });
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
