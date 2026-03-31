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
import FinancialChartPage from './pages/FinancialChartPage';
import AuthPage from './pages/AuthPage';
import * as XLSX from 'xlsx';
import { isExcludedAccount } from './utils/formatters';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [exchangeRate, setExchangeRate] = useState(1520); // 초기값 (폴백)

  // --- Auth State Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Auto Logout Timer (10 Minutes) ---
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("Auto logging out due to inactivity...");
        auth.signOut();
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

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
  const [dailyIssues, setDailyIssues] = useState({}); // { "2024-03-26": "이슈내용..." }

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
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComposeAccounts(data.filter(a => {
          if (!a) return false;
          const vals = Object.values(a).map(v => String(v).replace(/[\s-]/g, ''));
          const isPension = vals.some(v => v.includes('퇴직연금신탁') || v.includes('71452') || v.includes('48252') || v.includes('10291017771452'));
          return !isPension;
      }));
    }, logAndHandle("composeAccounts"));

    const unsubSmart = onSnapshot(collection(db, "smartAccounts"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSmartAccounts(data.filter(a => {
          if (!a) return false;
          const vals = Object.values(a).map(v => String(v).replace(/[\s-]/g, ''));
          const isPension = vals.some(v => v.includes('퇴직연금신탁') || v.includes('71452') || v.includes('48252') || v.includes('10291017771452'));
          return !isPension;
      }));
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

    // 5. Daily Issues/Memos Sync (Object mapping 지원)
    const unsubIssues = onSnapshot(collection(db, "dailyIssues"), (snapshot) => {
        const data = {};
        snapshot.docs.forEach(d => { 
          const docData = d.data();
          data[d.id] = docData.content; // content 자체가 객체일 수도, 기존처럼 문자열일 수도 있음
        });
        setDailyIssues(data);
    }, logAndHandle("dailyIssues"));

    // 4. Daily Status Sync
    const unsubStatus = onSnapshot(collection(db, "dailyStatuses"), (snapshot) => {
        const statuses = {};
        snapshot.docs.forEach(d => { 
          const data = d.data();
          if (data && data.statusData) {
              // Handle potentially nested statusData if it exists
              // (Based on common patterns in previous turns)
          }
          
          if (data.details) {
            // Apply THE MOST aggressive filter right here
            data.details = data.details.filter(item => {
                if (!item) return false;
                // Double redundant check to be absolutely sure
                const entries = Object.values(item).map(v => String(v).replace(/[\s-]/g, ''));
                const isPension = entries.some(v => v.includes('퇴직연금신탁') || v.includes('71452') || v.includes('48252') || v.includes('10291017771452'));
                return !isPension;
            });
            
            // Recalculate summary fields to ensure pension funds aren't summed
            data.inflow = data.details.reduce((s, i) => s + (i.currency === 'KRW' ? i.deposits : 0), 0);
            data.outflow = data.details.reduce((s, i) => s + (i.currency === 'KRW' ? i.withdrawals : 0), 0);
            data.totalBalance = data.details.reduce((s, i) => s + (i.currency === 'KRW' ? i.totalBalance : 0), 0);
            data.netChange = data.details.reduce((s, i) => s + (i.currency === 'KRW' ? (i.deposits - i.withdrawals) : 0), 0);
          }
          statuses[d.id] = data; 
        });
        setDailyStatuses(statuses);
    }, logAndHandle("dailyStatuses"));

    return () => { unsubCompose(); unsubSmart(); unsubFX(); unsubWith(); unsubStatus(); unsubIssues(); };
  }, [user]);

  // --- Firestore Update Wrappers ---
  const saveDailyStatus = async (date, data) => {
      if (!date || typeof date !== 'string') return;
      console.log(`Saving Daily Status: ${date}`);
      await setDoc(doc(collection(db, "dailyStatuses"), date), data);

      // --- 자동 계좌 등록 및 별칭(Nickname) 동기화 로직 ---
      if (data.details && data.details.length > 0) {
        for (const entry of data.details) {
          const section = entry.entity.includes('컴포즈') ? 'compose' : 'smart';
          const masterList = section === 'compose' ? composeAccounts : smartAccounts;
          
          // 계좌 번호(account) 기준으로 기존 계좌 검색
          const existingAccount = masterList.find(a => String(a.no) === String(entry.account));
          
          if (!existingAccount) {
            // 1. 신규 계좌 자동 등록
            console.log(`Auto-registering new account: ${entry.account}`);
            await updateAccount(section, {
              id: Date.now() + Math.random(),
              no: entry.account,
              bank: entry.bank,
              type: entry.nickname || entry.type || entry.bank, // 별칭을 '구분'으로 저장
              balance: 0,
              withdraw: 0,
              internal: 0,
              final: 0,
              isUSD: entry.currency === 'USD'
            });
          } else if (entry.nickname && existingAccount.type !== entry.nickname) {
            // 2. 기존 계좌 별칭(Type) 동기화 (엑셀 내용이 더 최신이라고 가정)
            console.log(`Updating nickname for account ${entry.account}: ${entry.nickname}`);
            await updateAccount(section, {
              ...existingAccount,
              type: entry.nickname
            });
          }
        }
      }
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

  const updateDailyIssue = async (date, content) => {
    if (!date) return;
    // content는 { compose: string, smart: string } 객체 또는 기존 문자열
    await setDoc(doc(collection(db, "dailyIssues"), date), { 
      content, 
      updatedAt: new Date().toISOString() 
    });
  };

  const deleteWithdrawal = async (withdrawId, accountId, section, amount) => {
    try {
      if (!withdrawId) return;
      console.log(`Deleting Withdrawal: ${withdrawId} from account: ${accountId}`);
      
      // 1. Delete from Firestore
      await deleteDoc(doc(collection(db, "withdrawals"), String(withdrawId)));

      // 2. Update Account Balance (Reversion)
      const accounts = section === '컴포즈커피' ? composeAccounts : smartAccounts;
      const account = accounts.find(a => String(a.id) === String(accountId));
      
      if (account) {
        const newWithdraw = (account.withdraw || 0) - amount;
        const updatedAccount = {
          ...account,
          withdraw: newWithdraw,
          final: (account.balance || 0) - newWithdraw + (account.internal || 0)
        };
        await updateAccount(section === '컴포즈커피' ? 'compose' : 'smart', updatedAccount);
      }
    } catch (err) {
      console.error("Delete withdrawal error:", err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const deleteWithdrawalBatch = async (batchId, accountId, section, totalAmount) => {
    try {
      if (!batchId || !accountId) return;
      if (!window.confirm(`선택한 업로드 내역 전체(${totalAmount.toLocaleString()}원)를 삭제하시겠습니까?`)) return;

      console.log(`Deleting Batch: ${batchId} from account: ${accountId}`);
      
      // 1. Find all items in the batch
      const batchItems = withdrawals.filter(w => w.batchId === batchId && String(w.accountId) === String(accountId));
      
      // 2. Delete from Firestore
      for (const item of batchItems) {
        await deleteDoc(doc(collection(db, "withdrawals"), String(item.id)));
      }

      // 3. Update Account Balance (Reversion)
      const accounts = section === '컴포즈커피' ? composeAccounts : smartAccounts;
      const account = accounts.find(a => String(a.id) === String(accountId));
      
      if (account) {
        const newWithdraw = (account.withdraw || 0) - totalAmount;
        const updatedAccount = {
          ...account,
          withdraw: newWithdraw,
          final: (account.balance || 0) - newWithdraw + (account.internal || 0)
        };
        await updateAccount(section === '컴포즈커피' ? 'compose' : 'smart', updatedAccount);
      }
    } catch (err) {
      console.error("Batch delete error:", err);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    }
  };

  // --- Excel Export Helper ---
  const handleExport = () => {
    try {
      let data = [];
      let filename = `Report_${selectedDate}.xlsx`;

      if (currentView === 'dashboard') {
        let status = dailyStatuses[selectedDate];
        let isPredicted = false;

        if (!status) {
          // 1. 선택한 날짜 이전의 가장 최신 시재를 찾아 시작점으로 삼음 (Projection 모드)
          const pastDates = Object.keys(dailyStatuses)
            .filter(d => d < selectedDate)
            .sort((a, b) => b.localeCompare(a));
            
          if (pastDates.length > 0) {
            status = dailyStatuses[pastDates[0]];
            isPredicted = true;
          }
        }

        if (!status) {
          alert('해당 날짜의 확정 데이터 또는 기초 시재가 없어 엑셀을 생성할 수 없습니다.');
          return;
        }

        // 예측 모드일 경우 해당 날짜의 지출 내역을 반영하여 계산
        const dayWithdrawals = withdrawals.filter(w => w.date === selectedDate);

        data = (status.details || [])
          .filter(d => !isExcludedAccount(d))
          .map(d => {
            const accWiths = dayWithdrawals.filter(w => w.accountId === d.id);
            const currentWith = accWiths.reduce((sum, w) => sum + w.amount, 0);
            
            return {
              '법인': d.entity,
              '은행': d.bank,
              '계좌번호': d.account,
              '별칭': d.nickname || '',
              '통화': d.currency,
              '전일잔액': isPredicted ? d.totalBalance : d.prevBalance,
              '입금액': isPredicted ? 0 : d.deposits,
              '출금액': isPredicted ? currentWith : d.withdrawals,
              '당일총잔액': isPredicted ? (d.totalBalance - currentWith) : d.totalBalance
            };
          });
        filename = `자금일보_${selectedDate}${isPredicted ? '_예상' : ''}.xlsx`;
      } else if (currentView === 'cashStatus') {
        const status = dailyStatuses[selectedDate];
        if (!status) {
          alert('내보낼 확정 데이터가 없습니다.');
          return;
        }
        data = (status.details || [])
          .filter(d => !isExcludedAccount(d))
          .map(d => ({
            '법인': d.entity,
            '은행': d.bank,
            '계좌번호': d.account,
            '별칭': d.nickname || '',
            '통화': d.currency,
            '전일잔액': d.prevBalance,
            '입금액': d.deposits,
            '출금액': d.withdrawals,
            '당일총잔액': d.totalBalance
          }));
        filename = `시재현황_${selectedDate}.xlsx`;
      } else {
        alert('이 화면에서는 엑셀 내보내기를 지원하지 않습니다.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export error:", err);
      alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
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
      onExport={handleExport}
    >
      {currentView === 'dashboard' && (
        <DashboardPage 
          selectedDate={selectedDate}
          composeAccounts={composeAccounts} 
          smartAccounts={smartAccounts} 
          fxSchedule={fxSchedule} 
          withdrawals={withdrawals}
          dailyStatuses={dailyStatuses}
          dailyIssues={dailyIssues}
          onUpdateIssue={updateDailyIssue}
          exchangeRate={exchangeRate}
        />
      )}
      {currentView === 'analytics' && (
        <FinancialChartPage 
          dailyStatuses={dailyStatuses}
          recordDate={selectedDate}
          exchangeRate={exchangeRate}
        />
      )}
      {currentView === 'monthly' && (
        <MonthlyReportPage 
          recordDate={selectedDate}
          dailyStatuses={dailyStatuses}
          exchangeRate={exchangeRate}
          composeAccounts={composeAccounts}
          smartAccounts={smartAccounts}
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
          withdrawals={withdrawals}
          fxSchedule={fxSchedule}
          onUpdateAccount={updateAccount}
          onSaveWithdrawals={saveWithdrawals}
          onDeleteWithdrawal={deleteWithdrawal}
          onDeleteBatch={deleteWithdrawalBatch}
          onUpdateFXSchedule={updateFXSchedule}
          exchangeRate={exchangeRate}
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
          exchangeRate={exchangeRate}
          composeAccounts={composeAccounts}
          smartAccounts={smartAccounts}
        />
      )}
    </Layout>
  );
};

export default App;

