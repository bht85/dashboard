import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore'; 
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
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW');
        const data = await response.json();
        if (data.rates && data.rates.KRW) {
          setExchangeRate(data.rates.KRW);
          console.log("Latest Exchange Rate (USD/KRW):", data.rates.KRW);
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

    // 1. Accounts Sync
    const unsubCompose = onSnapshot(collection(db, "composeAccounts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setComposeAccounts(data);
    });

    const unsubSmart = onSnapshot(collection(db, "smartAccounts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setSmartAccounts(data);
    });

    // 2. FX Schedule Sync
    const unsubFX = onSnapshot(query(collection(db, "fxSchedule"), orderBy("date")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFxSchedule(data);
    });

    // 3. Withdrawals Sync
    const unsubWith = onSnapshot(collection(db, "withdrawals"), (snapshot) => {
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Daily Status Sync
    const unsubStatus = onSnapshot(collection(db, "dailyStatuses"), (snapshot) => {
        const statuses = {};
        snapshot.docs.forEach(doc => { statuses[doc.id] = doc.data(); });
        setDailyStatuses(statuses);
    });

    return () => { unsubCompose(); unsubSmart(); unsubFX(); unsubWith(); unsubStatus(); };
  }, [user]);

  // --- Firestore Update Wrappers ---
  const saveDailyStatus = async (date, data) => {
      await setDoc(doc(db, "dailyStatuses", date), data);
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
          setComposeAccounts={setComposeAccounts}
          smartAccounts={smartAccounts} 
          setSmartAccounts={setSmartAccounts}
        />
      )}
      {currentView === 'transactions' && (
        <TransactionsPage 
          composeAccounts={composeAccounts} 
          setComposeAccounts={setComposeAccounts}
          smartAccounts={smartAccounts} 
          setSmartAccounts={setSmartAccounts}
          setWithdrawals={setWithdrawals}
        />
      )}
      {currentView === 'foreign' && (
        <ForeignSchedulePage 
          fxSchedule={fxSchedule} 
          setFxSchedule={setFxSchedule} 
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

