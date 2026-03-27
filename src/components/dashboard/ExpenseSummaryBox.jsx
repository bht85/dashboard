import React from 'react';
import { formatKRW, formatUSD } from '../../utils/formatters';
import { ArrowUpRight } from 'lucide-react';

const ExpenseSummaryBox = ({ title, data }) => {
  const { sums } = data;
  
  const renderAmount = (krw, usd, colorClass = "text-slate-800") => {
    return (
      <div className="flex flex-col">
        {krw > 0 && <span className={`text-xl font-bold ${colorClass} tabular-nums leading-none`}>{formatKRW(krw)}</span>}
        {usd > 0 && (
          <span className={`text-[12px] font-black text-blue-600 font-mono ${krw > 0 ? 'mt-1.5' : 'text-lg'}`}>
            {formatUSD(usd)} (USD)
          </span>
        )}
        {krw === 0 && usd === 0 && <span className="text-xl font-bold text-slate-300">-</span>}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="bg-slate-800 text-white px-4 py-2 text-[11px] font-bold flex items-center justify-between uppercase tracking-wider">
        <span>{title}</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-80" />
      </div>
      <div className="flex-1 grid grid-cols-2 bg-slate-100 gap-px">
        <div className="bg-white p-4">
          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">건수</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{data.count}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">총 지출금액</p>
          {renderAmount(sums.krwTotal, sums.usdTotal, "text-red-500")}
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">내부 출금/입금</p>
          {renderAmount(sums.krwInternal, sums.usdInternal, "text-slate-400")}
        </div>
        <div className="bg-indigo-50/50 p-4 border-l border-indigo-100">
          <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase tracking-tighter">지출액 (순지출)</p>
          {renderAmount(sums.krwTotal - sums.krwInternal, sums.usdTotal - sums.usdInternal, "text-indigo-700")}
        </div>
      </div>
    </div>
  );
};

export default ExpenseSummaryBox;
