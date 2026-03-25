import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AccountManagementPage from './pages/AccountManagementPage';
import TransactionsPage from './pages/TransactionsPage';
import ForeignSchedulePage from './pages/ForeignSchedulePage';
import CashStatusPage from './pages/CashStatusPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import AuthPage from './pages/AuthPage';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState("2026-03-24");
  const [exchangeRate, setExchangeRate] = useState(1520); // 초기값 (폴백)

  // --- Auth State Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Exchange Rate Fetching ---
  useEffect(() => {
    const fetchRate = async () => {
      try {
        // Switching to a more CORS-friendly API
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates && data.rates.KRW) {
          setExchangeRate(data.rates.KRW);
          console.log("Exchange Rate Updated (USD/KRW):", data.rates.KRW);
        }
      } catch (error) {
        console.error("Exchange rate fetch error:", error);
      }
    };
    fetchRate();
  }, []);


  // --- 데이터 상태 관리 ---
  const [composeAccounts, setComposeAccounts] = useState([]);
  const [smartAccounts, setSmartAccounts] = useState([]);
  const [fxSchedule, setFxSchedule] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [dailyStatuses, setDailyStatuses] = useState({});

  // --- Real-time Firestore Sync ---
  useEffect(() => {
    if (!user) return;

    // Helper for error handling and logging
    const logAndHandle = (name) => (err) => {
        console.error(`Firestore Sync Error [${name}]:`, err);
    };

    console.log("Initializing Firestore Listeners...");

    // 1. Accounts Sync
    const unsubCompose = onSnapshot(collection(db, "composeAccounts"), (snapshot) => {
      setComposeAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, logAndHandle("composeAccounts"));

    const unsubSmart = onSnapshot(collection(db, "smartAccounts"), (snapshot) => {
      setSmartAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, logAndHandle("smartAccounts"));

    // 2. FX Schedule Sync (Simplified query to debug TypeError)
    const unsubFX = onSnapshot(collection(db, "fxSchedule"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort locally if needed
      setFxSchedule(data.sort((a,b) => (a.date > b.date ? 1 : -1)));
    }, logAndHandle("fxSchedule"));

    // 3. Withdrawals Sync
    const unsubWith = onSnapshot(collection(db, "withdrawals"), (snapshot) => {
        setWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, logAndHandle("withdrawals"));

    // 4. Daily Status Sync
    const unsubStatus = onSnapshot(collection(db, "dailyStatuses"), (snapshot) => {
        const statuses = {};
        snapshot.docs.forEach(d => { statuses[d.id] = d.data(); });
        setDailyStatuses(statuses);
    }, logAndHandle("dailyStatuses"));

    return () => { unsubCompose(); unsubSmart(); unsubFX(); unsubWith(); unsubStatus(); };
  }, [user]);

  // --- Firestore Update Wrappers ---
  const saveDailyStatus = async (date, data) => {
      if (!date || typeof date !== 'string') return;
      console.log(`Saving Daily Status: ${date}`);
      await setDoc(doc(collection(db, "dailyStatuses"), date), data);
  };

  const updateAccount = async (section, data) => {
    const colName = section === 'compose' ? "composeAccounts" : "smartAccounts";
    const docId = data.id ? String(data.id) : Date.now().toString();
    console.log(`Updating Account in ${colName}: ${docId}`);
    await setDoc(doc(collection(db, colName), docId), data);
  };

  const deleteAccount = async (section, id) => {
    if (!id) return;
    const colName = section === 'compose' ? "composeAccounts" : "smartAccounts";
    console.log(`Deleting Account from ${colName}: ${id}`);
    await deleteDoc(doc(collection(db, colName), String(id)));
  };

  const saveWithdrawals = async (newWithdrawals) => {
    console.log(`Saving ${newWithdrawals.length} withdrawals...`);
    for (const item of newWithdrawals) {
      const docId = item.id ? String(item.id) : Date.now().toString();
      await setDoc(doc(collection(db, "withdrawals"), docId), item);
    }
  };

  const updateFXSchedule = async (data) => {
    const docId = data.id ? String(data.id) : Date.now().toString();
    console.log(`Updating FX Schedule: ${docId}`);
    await setDoc(doc(collection(db, "fxSchedule"), docId), data);
  };

  const deleteFXSchedule = async (id) => {
    if (!id) return;
    console.log(`Deleting FX Schedule: ${id}`);
    await deleteDoc(doc(collection(db, "fxSchedule"), String(id)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout 
      currentView={currentView} 
      setCurrentView={setCurrentView} 
      selectedDate={selectedDate} 
      setSelectedDate={setSelectedDate}
      user={user}
    >
      {currentView === 'dashboard' && (
        <DashboardPage 
          selectedDate={selectedDate}
          composeAccounts={composeAccounts} 
          smartAccounts={smartAccounts} 
          fxSchedule={fxSchedule} 
          withdrawals={withdrawals}
          dailyStatuses={dailyStatuses}
          exchangeRate={exchangeRate}
        />
      )}
      {currentView === 'monthly' && (
        <MonthlyReportPage 
          recordDate={selectedDate}
          dailyStatuses={dailyStatuses}
        />
      )}
      {currentView === 'accounts' && (
        <AccountManagementPage 
          composeAccounts={composeAccounts} 
          smartAccounts={smartAccounts} 
          onAddAccount={updateAccount}
          onDeleteAccount={deleteAccount}
        />
      )}
      {currentView === 'transactions' && (
        <TransactionsPage 
          composeAccounts={composeAccounts} 
          smartAccounts={smartAccounts} 
          onUpdateAccount={updateAccount}
          onSaveWithdrawals={saveWithdrawals}
        />
      )}
      {currentView === 'foreign' && (
        <ForeignSchedulePage 
          fxSchedule={fxSchedule} 
          onUpdateSchedule={updateFXSchedule}
          onDeleteSchedule={deleteFXSchedule}
          exchangeRate={exchangeRate}
        />
      )}
      {currentView === 'cashStatus' && (
        <CashStatusPage 
          selectedDate={selectedDate}
          dailyStatuses={dailyStatuses}
          setDailyStatuses={saveDailyStatus} // Use DB worker
        />
      )}
    </Layout>
  );
};

export default App;

