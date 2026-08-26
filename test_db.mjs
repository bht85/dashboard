import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";
const app = initializeApp({ projectId: "dashboard-c6e06" });
const db = getFirestore(app);
async function check() {
  const q = query(collection(db, "rawBeanContracts"), limit(1));
  const snap = await getDocs(q);
  snap.forEach(d => console.log(d.data()));
  process.exit(0);
}
check();
