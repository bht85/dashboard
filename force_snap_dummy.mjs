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
    console.log("Saving snapshot...");
    await setDoc(doc(collection(db, "rawBeanSnapshots"), "test_20260821"), {
       createdAt: "2026-08-21T00:00:00.000Z",
       data: {
         "2026-01": { weight: 579751, usd: 5082532, krw: 7490171322, indexSum: 382.59, count: 1 }
       },
       isAggregated: true
    });
    console.log("Snapshot successfully saved!");
    process.exit(0);
}
run();
