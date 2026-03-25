import React from 'react';
import { formatKRW, formatUSD } from '../../utils/formatters';

const FinancialTable = ({ title, accounts, totals, icon: Icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-8">
    <div className="px-5 py-3 bg-[#0f172a] text-white flex items-center gap-2">
      <Icon className="w-4 h-4 text-blue-400" />
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] border-collapse bg-white">
        <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-bold border-r border-slate-100">계좌번호</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100">구분</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right">현재 잔액</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right">출금액</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right">내부 입금</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right text-indigo-600">출금 후 잔액</th>
            <th className="px-4 py-3 font-bold">별칭</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-indigo-50/30 font-bold text-slate-900 border-b border-indigo-100 text-sm">
            <td colSpan={2} className="px-4 py-3.5 text-center border-r border-indigo-100/50">합 계</td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 tabular-nums">{formatKRW(totals.balance)}</td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-red-600 tabular-nums">{formatKRW(totals.withdraw)}</td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-emerald-600 tabular-nums">{totals.internal > 0 ? formatKRW(totals.internal) : '-'}</td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-indigo-700 font-extrabold tabular-nums">{formatKRW(totals.final)}</td>
            <td className="px-4 py-3.5"></td>
          </tr>
          {accounts.map((acc) => (
            <tr key={acc.id} className="hover:bg-slate-50 transition-colors duration-150">
              <td className="px-4 py-3 border-r border-slate-100 font-mono text-slate-400 text-xs">{acc.no}</td>
              <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-600">{acc.type}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-semibold tabular-nums tracking-tight">{acc.isUSD ? formatUSD(acc.balance) : formatKRW(acc.balance)}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right text-red-500 font-mono font-semibold tabular-nums tracking-tight">{acc.withdraw > 0 ? formatKRW(acc.withdraw) : '-'}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right text-emerald-600 font-mono font-semibold tabular-nums tracking-tight">{acc.internal > 0 ? formatKRW(acc.internal) : '-'}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right font-bold font-mono text-indigo-900 tabular-nums tracking-tighter">{acc.isUSD ? formatUSD(acc.final) : formatKRW(acc.final)}</td>
              <td className="px-4 py-3 text-[11px] text-slate-400 font-medium leading-tight">{acc.note || acc.bank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default FinancialTable;
