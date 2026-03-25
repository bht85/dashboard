import React from 'react';
import { formatKRW, formatUSD } from '../utils/formatters';

const PrintReport = ({ selectedDate, composeAccounts, smartAccounts, fxSchedule, withdrawals, dailyStatuses, exchangeRate }) => {
  // 1. Calculate Totals for Summary
  const calculateTotal = (accounts) => {
    return accounts.reduce((acc, account) => {
      const balance = (account.balance || 0);
      const withdraw = (account.withdraw || 0);
      const internal = (account.internal || 0);
      const final = balance - withdraw + internal;
      
      if (account.isUSD) {
        acc.usd += final;
      } else {
        acc.krw += final;
      }
      return acc;
    }, { krw: 0, usd: 0 });
  };

  const composeTotals = calculateTotal(composeAccounts);
  const smartTotals = calculateTotal(smartAccounts);
  
  const totalKRW = composeTotals.krw + smartTotals.krw;
  const totalUSD = composeTotals.usd + smartTotals.usd;
  const grandTotalKRW = totalKRW + (totalUSD * exchangeRate);

  // 2. Filter today's withdrawals
  const todayWithdrawals = withdrawals.filter(w => w.paymentDate === selectedDate);
  const composeWithdrawals = todayWithdrawals.filter(w => w.section === '컴포즈커피');
  const smartWithdrawals = todayWithdrawals.filter(w => w.section === '스마트팩토리');

  return (
    <div className="hidden print:block bg-white text-slate-900 font-sans p-0 m-0 w-full">
      {/* PAGE 1: TITLE & SUMMARY */}
      <div className="page-break-after h-[287mm] flex flex-col pt-10 px-12">
        {/* Header */}
        <div className="border-b-4 border-slate-900 pb-8 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 mb-2">Treasury Report</h1>
            <p className="text-xl font-bold text-slate-500">{selectedDate} 자금 일보</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">(주)컴포즈커피</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">COMPOSE COFFEE / SMART FACTORY</p>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="mb-16">
          <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 border-l-4 border-indigo-600 pl-4 italic">
            01. Executive Financial Summary
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Total Liquid Assets (KRW Equivalent)</span>
              <p className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">{formatKRW(grandTotalKRW)}</p>
              <div className="flex gap-6 mt-6 border-t border-slate-200 pt-6">
                 <div>
                   <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Domestic (KRW)</span>
                   <p className="text-xl font-bold text-slate-800">{formatKRW(totalKRW)}</p>
                 </div>
                 <div>
                   <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Foreign (USD)</span>
                   <p className="text-xl font-bold text-indigo-600">{formatUSD(totalUSD)}</p>
                 </div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col justify-center">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Applied FX Rate</span>
               <p className="text-2xl font-black tabular-nums">1 USD = {exchangeRate.toLocaleString()} KRW</p>
            </div>
          </div>
        </div>

        {/* Section 2: Division Breakdown */}
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Compose Coffee Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">Total Accounts</span>
                <span className="text-sm font-bold text-slate-900">{composeAccounts.length} Units</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">Available Balance</span>
                <span className="text-sm font-bold text-slate-900">{formatKRW(composeTotals.krw)}</span>
              </div>
              <div className="flex justify-between font-black text-indigo-600 pt-2">
                <span className="text-sm">Today's Withdrawals</span>
                <span className="text-sm">-{formatKRW(composeWithdrawals.reduce((s,i)=>s+i.amount,0))}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Smart Factory Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">Total Accounts</span>
                <span className="text-sm font-bold text-slate-900">{smartAccounts.length} Units</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">KRW Balance</span>
                <span className="text-sm font-bold text-slate-900">{formatKRW(smartTotals.krw)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-600">USD Balance</span>
                <span className="text-sm font-bold text-indigo-600">{formatUSD(smartTotals.usd)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer for Page 1 */}
        <div className="mt-auto border-t border-slate-100 pt-6 pb-10 text-[9px] text-slate-300 font-bold uppercase tracking-widest flex justify-between">
          <span>COMPOSE TREASURY MANAGEMENT SYSTEM</span>
          <span>REPORT CONFIRMATION ID: {Date.now().toString(36).toUpperCase()}</span>
          <span>PAGE 01 / 02</span>
        </div>
      </div>

      {/* PAGE 2: TRANSACTION DETAILS */}
      <div className="flex flex-col pt-10 px-12 min-h-[297mm]">
        <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-8 border-l-4 border-indigo-600 pl-4 italic">
            02. Daily Transaction Details
        </h2>

        {/* Compose Withdrawals */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Compose Coffee Withdrawals</h3>
            <span className="text-[10px] font-bold text-slate-400">{composeWithdrawals.length} ITEMS</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Payee / Description</th>
                <th className="px-4 py-3 text-left">Bank / Account</th>
                <th className="px-4 py-3 text-right">Amount (KRW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {composeWithdrawals.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-300 italic text-xs">No transactions recorded.</td></tr>
              ) : composeWithdrawals.map(w => (
                <tr key={w.id} className="text-[11px]">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{w.payee}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{w.memo || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {w.bank} {w.account}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">
                    {formatKRW(w.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Foreign Exchange Commitments */}
        <div className="mb-12">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">Foreign Exchange Schedule</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client / Entity</th>
                <th className="px-4 py-3 text-right">Amount (USD)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fxSchedule.slice(0, 10).map(s => (
                <tr key={s.id} className="text-[11px]">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{s.date}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{s.client}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600 font-mono italic">{formatUSD(s.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400">{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-slate-100 pt-6 pb-10 text-[9px] text-slate-300 font-bold uppercase tracking-widest flex justify-between">
          <span>COMPOSE TREASURY MANAGEMENT SYSTEM</span>
          <span>GENERATED ON {new Date().toLocaleString()}</span>
          <span>PAGE 02 / 02</span>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;
