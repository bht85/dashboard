import React from 'react';
import { formatKRW, formatUSD } from '../../utils/formatters';

const FinancialTable = ({ title, accounts, totals, icon: Icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-8">
    <div className="px-5 py-3 bg-[#0f172a] text-white flex items-center gap-2">
      <Icon className="w-4 h-4 text-blue-400" />
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] border-collapse bg-white" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-bold border-r border-slate-100 truncate">계좌번호</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 truncate">구분</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right truncate">현재 잔액</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right truncate">출금액</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right truncate">내부 입금</th>
            <th className="px-4 py-3 font-bold border-r border-slate-100 text-right text-indigo-600 truncate">출금 후 잔액</th>
            <th className="px-4 py-3 font-bold truncate">별칭</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-indigo-50/30 font-bold text-slate-900 border-b border-indigo-100 text-sm">
            <td colSpan={2} className="px-4 py-3.5 text-center border-r border-indigo-100/50 truncate">합 계</td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 tabular-nums truncate">
              <div>{formatKRW(totals.krw.balance)}</div>
              {totals.usd.balance > 0 && <div className="text-[10px] text-blue-600 font-mono mt-1 font-black">{formatUSD(totals.usd.balance)}</div>}
            </td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-red-600 tabular-nums truncate">
              <div>{formatKRW(totals.krw.withdraw)}</div>
              {totals.usd.withdraw > 0 && <div className="text-[10px] text-red-400 font-mono mt-1 font-black">{formatUSD(totals.usd.withdraw)}</div>}
            </td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-emerald-600 tabular-nums truncate">
              <div>{totals.krw.internal > 0 ? formatKRW(totals.krw.internal) : '-'}</div>
              {totals.usd.internal > 0 && <div className="text-[10px] text-emerald-400 font-mono mt-1 font-black">{formatUSD(totals.usd.internal)}</div>}
            </td>
            <td className="px-4 py-3.5 text-right border-r border-indigo-100/50 text-indigo-700 font-extrabold tabular-nums truncate">
              <div>{formatKRW(totals.krw.final)}</div>
              {totals.usd.final > 0 && <div className="text-[10px] text-blue-800 font-mono mt-1 font-black">{formatUSD(totals.usd.final)}</div>}
            </td>
            <td className="px-4 py-3.5 truncate"></td>
          </tr>
          {accounts.map((acc) => (
            <tr key={acc.id} className="hover:bg-slate-50 transition-colors duration-150">
              <td className="px-4 py-3 border-r border-slate-100 font-mono text-slate-400 text-xs truncate">{acc.no}</td>
              <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-600 truncate">{acc.type}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-semibold tabular-nums tracking-tight truncate">{acc.isUSD ? formatUSD(acc.balance) : formatKRW(acc.balance)}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right text-red-500 font-mono font-semibold tabular-nums tracking-tight truncate">{acc.withdraw > 0 ? (acc.isUSD ? formatUSD(acc.withdraw) : formatKRW(acc.withdraw)) : '-'}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right text-emerald-600 font-mono font-semibold tabular-nums tracking-tight truncate">{acc.internal > 0 ? (acc.isUSD ? formatUSD(acc.internal) : formatKRW(acc.internal)) : '-'}</td>
              <td className="px-4 py-3 border-r border-slate-100 text-right font-bold font-mono text-indigo-900 tabular-nums tracking-tighter truncate">{acc.isUSD ? formatUSD(acc.final) : formatKRW(acc.final)}</td>
              <td className="px-4 py-3 text-[11px] text-slate-400 font-medium leading-tight truncate">{acc.note || acc.bank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default FinancialTable;
