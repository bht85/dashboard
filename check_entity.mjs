import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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
  console.log("=== dailyStatuses 최근 3건 entity 확인 ===");
  const q = query(collection(db, "dailyStatuses"), orderBy("__name__", "desc"), limit(3));
  const snap = await getDocs(q);

  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`\n📅 날짜: ${d.id}`);
    if (data.details && data.details.length > 0) {
      // entity 고유값 추출
      const entities = [...new Set(data.details.map(item => item.entity))];
      console.log("  entity 고유값:", entities);
      // 첫번째 detail 샘플
      const sample = data.details[0];
      console.log("  첫번째 detail 샘플:", JSON.stringify({
        entity: sample.entity,
        bank: sample.bank,
        account: sample.account,
        totalBalance: sample.totalBalance,
        currency: sample.currency,
      }));
    } else {
      console.log("  details 없음");
    }
  });

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
