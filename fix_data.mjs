import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, query, limit, startAfter, orderBy } from "firebase/firestore";

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
    console.log("Fetching current rawBeanContracts in chunks...");
    
    let allContracts = [];
    let lastVisible = null;
    let hasMore = true;
    
    while (hasMore) {
        let q;
        if (lastVisible) {
            // we can't sort by contractNo if it's missing, just use ID
            q = query(collection(db, "rawBeanContracts"), startAfter(lastVisible), limit(500));
        } else {
            q = query(collection(db, "rawBeanContracts"), limit(500));
        }
        
        const snap = await getDocs(q);
        if (snap.empty) {
            hasMore = false;
            break;
        }
        
        snap.docs.forEach(d => allContracts.push(d.data()));
        lastVisible = snap.docs[snap.docs.length - 1];
        console.log("Fetched chunk, total so far:", allContracts.length);
    }
    
    console.log("Total fetched contracts:", allContracts.length);

    if (allContracts.length === 0) {
        console.log("No contracts found!");
        process.exit(0);
    }

    const aggregated = allContracts.reduce((acc, curr) => {
        const mStr = `${curr.paymentYear}-${String(curr.paymentMonth).padStart(2, '0')}`;
        if (!acc[mStr]) acc[mStr] = { weight: 0, usd: 0, krw: 0, indexSum: 0, count: 0 };
        
        if (curr.invoiceWeight === '' || String(curr.invoiceWeight).trim() === '') return acc;
        const w = parseFloat(curr.invoiceWeight || curr.weight || 0);
        
        let usdAmount = parseFloat(curr.actualUSD);
        let krwAmount = parseFloat(curr.actualKRW);
        if (isNaN(usdAmount) || usdAmount === 0) {
            const unitPrice = curr.isFixedPrice ? (parseFloat(curr.fixedPrice) || 0) : ((parseFloat(curr.index) || 0) + (parseFloat(curr.differential) || 0)) * 22.046 / 1000;
            usdAmount = w * unitPrice;
        }
        if (isNaN(krwAmount) || krwAmount === 0) {
            krwAmount = usdAmount * parseFloat(curr.planExchangeRate || 1450);
        }
        acc[mStr].weight += w;
        acc[mStr].usd += usdAmount;
        acc[mStr].krw += krwAmount;
        
        const idxVal = parseFloat(curr.index);
        if (!isNaN(idxVal) && idxVal > 0) {
          acc[mStr].indexSum += idxVal;
          acc[mStr].count += 1;
        }
        return acc;
    }, {});

    const snapshotId = Date.now().toString();
    console.log("Saving snapshot as 2026-08-21...");
    await setDoc(doc(collection(db, "rawBeanSnapshots"), snapshotId), {
       createdAt: "2026-08-21T00:00:00.000Z",
       data: aggregated,
       isAggregated: true
    });
    console.log("Snapshot successfully saved!");
    process.exit(0);
}
run();
