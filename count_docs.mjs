import { initializeApp } from "firebase/app";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

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
    console.log("Counting documents in rawBeanContracts...");
    try {
        const coll = collection(db, "rawBeanContracts");
        const snapshot = await getCountFromServer(coll);
        console.log("Count:", snapshot.data().count);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
