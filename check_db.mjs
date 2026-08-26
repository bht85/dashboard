import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZdEyOJC0bUMok7kDTXAAI5FyveH-CX1Y",
  authDomain: "dashboard-c6e06.firebaseapp.com",
  projectId: "dashboard-c6e06",
  storageBucket: "dashboard-c6e06.firebasestorage.app",
  messagingSenderId: "688408841449",
  appId: "1:688408841449:web:686c1c812b5ae0e1627478"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("Checking DB...");
    const snap = await getDocs(collection(db, "rawBeanSnapshots"));
    console.log("Snapshot count:", snap.docs.length);
    snap.docs.forEach(d => {
        console.log("ID:", d.id, "createdAt:", d.data().createdAt, "isAgg:", d.data().isAggregated);
    });
    process.exit(0);
}
check();
