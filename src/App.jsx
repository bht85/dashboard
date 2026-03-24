import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore'; 
import { useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AccountManagementPage from './pages/AccountManagementPage';
import TransactionsPage from './pages/TransactionsPage';
import ForeignSchedulePage from './pages/ForeignSchedulePage';
import CashStatusPage from './pages/CashStatusPage';
import MonthlyReportPage from './pages/MonthlyReportPage';

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState("2026-03-24");

  // --- 데이터 상태 관리 ---
  const [composeAccounts, setComposeAccounts] = useState([
    { id: 1, no: '102-910168-09952', type: 'MMT', balance: 43065136044, withdraw: 0, internal: 0, final: 43065136044, bank: '하나은행' },
    { id: 2, no: '102-910076-37204', type: '일반_고정지출외', balance: 1283254585, withdraw: 11840400, internal: 0, final: 1271414185, bank: '하나은행' },
    { id: 3, no: '102-910075-85804', type: '일반_개설및인테리어', balance: 644430477, withdraw: 0, internal: 0, final: 644430477, bank: '하나은행' },
    { id: 4, no: '102-910077-19904', type: '일반_상품대', balance: 3127739995, withdraw: 0, internal: 0, final: 3127739995, bank: '하나은행' },
    { id: 5, no: '102-910076-38904', type: '일반_로열티외', balance: 85939585, withdraw: 0, internal: 0, final: 85939585, bank: '하나은행' },
    { id: 6, no: '102-910080-71804', type: '일반_직영점', balance: 71656940, withdraw: 0, internal: 0, final: 71656940, bank: '하나은행' },
    { id: 7, no: '102-910082-36704', type: '일반_해외 전용계좌', balance: 24005391, withdraw: 0, internal: 0, final: 24005391, bank: '하나은행' },
  ]);

  const [smartAccounts, setSmartAccounts] = useState([
    { id: 8, no: '102-910168-08252', type: 'MMT', balance: 8450857359, withdraw: 2400000000, internal: 0, final: 6050857359, bank: '하나은행' },
    { id: 9, no: '102-910076-52504', type: '일반', balance: 178999317, withdraw: 0, internal: 2400000000, final: 2578999317, bank: '하나은행' },
    { id: 10, no: '102-910019-69438', type: 'USD', balance: 3314.20, withdraw: 0, internal: 0, final: 3314.20, bank: '하나은행', isUSD: true, note: '4,905,016' },
  ]);

  const [fxSchedule, setFxSchedule] = useState([
    { id: 1, date: '2026-03-27', client: '블레스빈', amount: 575232.00, bank: '기업', account: '475-050850-56-00011', desc: '티오피아 대금지급 2-2차', status: '지출결의 확인' },
    { id: 2, date: '2026-03-27', client: '블레스빈', amount: 181260.00, bank: '기업', account: '475-050850-56-00011', desc: '디카페인 대금지급 3-1차', status: '지출결의 확인' },
    { id: 3, date: '2026-04-03', client: '더드립', amount: 652787.61, bank: '기업', account: '075-087879-04-017', desc: '콜롬비아 대금지급 7-1차', status: '지출결의 미확인' },
  ]);

  const [withdrawals, setWithdrawals] = useState([]);
  const [dailyStatuses, setDailyStatuses] = useState({});

  // --- Real-time Firestore Sync ---
  useEffect(() => {
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
  }, []);

  // --- Firestore Update Wrappers ---
  const saveDailyStatus = async (date, data) => {
      await setDoc(doc(db, "dailyStatuses", date), data);
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} selectedDate={selectedDate} setSelectedDate={setSelectedDate}>
      {currentView === 'dashboard' && (
        <DashboardPage 
          selectedDate={selectedDate}
          composeAccounts={composeAccounts} 
          smartAccounts={smartAccounts} 
          fxSchedule={fxSchedule} 
          withdrawals={withdrawals}
          dailyStatuses={dailyStatuses}
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
