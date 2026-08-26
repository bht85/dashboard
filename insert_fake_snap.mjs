import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

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

async function run() {
    console.log("Inserting fake snap...");
    await setDoc(doc(collection(db, "rawBeanSnapshots"), "test1"), {
        createdAt: "2026-08-21T00:00:00.000Z",
        data: { "2026-01": { weight: 100, usd: 200, krw: 300, indexSum: 1, count: 1 } },
        isAggregated: true
    });
    console.log("Done");
    process.exit(0);
}
run();
