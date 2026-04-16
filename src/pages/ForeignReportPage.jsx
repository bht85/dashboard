import React from 'react';
import { formatUSD, formatKRW, formatForeign } from '../utils/formatters';
import { Printer, ChevronLeft } from 'lucide-react';

const ForeignReportPage = ({ 
  selectedMonth,
  fxSchedule = [],
  exchangeRate = 1450,
  exchangeRateEUR = 1580,
  exchangeRateJPY = 10,
  onBack
}) => {
  const [year, month] = selectedMonth.split('-');
  const formattedMonth = `${year}년 ${month}월`;

  // Filter schedules for the selected month
  const monthlySchedules = fxSchedule
    .filter(s => s.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Totals by currency
  const totals = monthlySchedules.reduce((acc, curr) => {
    const currency = curr.currency || 'USD';
    acc[currency] = (acc[currency] || 0) + Number(curr.amount || 0);
    return acc;
  }, {});

  // Convert to KRW
  const getKRW = (amount, currency) => {
    if (currency === 'EUR') return amount * exchangeRateEUR;
    if (currency === 'JPY') return amount * exchangeRateJPY;
    return amount * exchangeRate;
  };

  const totalKRW = Object.entries(totals).reduce((sum, [currency, amount]) => {
    return sum + getKRW(amount, currency);
  }, 0);

  const ReportTable = ({ headers, children }) => (
    <div className="mb-8">
      <table className="w-full text-[11px] border-collapse border-2 border-slate-800">
        <thead className="bg-slate-100/80">
          <tr className="divide-x divide-slate-800 border-b-2 border-slate-800">
            {headers.map((h, i) => (
              <th key={i} className={`px-2 py-2 font-black text-slate-900 border-slate-800 ${h.align === 'right' ? 'text-right' : 'text-center'}`} style={{ width: h.width }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-400">
          {children}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-10 print:p-0 print:bg-white">
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          돌아가기
        </button>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
        >
          <Printer className="w-4 h-4" />
          PDF로 저장하기
        </button>
      </div>

      {/* Page Content */}
      <div id="report-content" className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-2xl print:shadow-none print:p-0">
        
        {/* Report Header */}
        <div className="text-center mb-12 relative">
          <h1 className="text-3xl font-black text-slate-900 tracking-[0.2em] mb-4 border-b-4 border-slate-900 pb-4 inline-block px-12">
            외화 송금 계획 보고서
          </h1>
          <div className="flex justify-between items-end mt-4">
            <div className="text-left">
              <p className="text-sm font-black text-slate-800">대상 기간 : {formattedMonth}</p>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase">REMITTANCE SCHEDULE REPORT</p>
            </div>
            <div className="text-right border-2 border-slate-800 p-2 min-w-[200px]">
              <table className="w-full text-[10px] font-black">
                <tr className="border-b border-slate-300">
                  <td rowSpan={2} className="border-r border-slate-800 p-1 w-8 text-center bg-slate-50">결<br/>재</td>
                  <td className="border-r border-slate-800 p-1 w-16 text-center">담 당</td>
                  <td className="border-r border-slate-800 p-1 w-16 text-center">검 토</td>
                  <td className="p-1 w-16 text-center">승 인</td>
                </tr>
                <tr className="h-12 divide-x divide-slate-800">
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        {/* 1. Monthly Summary */}
        <section className="mb-10">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
            월간 송금 예정 요약
          </h2>
          <div className="grid grid-cols-3 gap-0 border-2 border-slate-800 text-center">
            {Object.entries(totals).length > 0 ? (
                Object.entries(totals).map(([currency, amount], i) => (
                    <div key={currency} className={`p-4 ${i !== 0 ? 'border-l-2 border-slate-800' : ''}`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{currency} Total</p>
                        <p className="text-xl font-black text-slate-900">{formatForeign(amount, currency)}</p>
                    </div>
                ))
            ) : (
                <div className="col-span-3 p-8 text-slate-300 font-bold italic">데이터가 없습니다.</div>
            )}
          </div>
          <div className="mt-2 text-right">
            <span className="text-[10px] font-black text-slate-400">환산 합계(예상): </span>
            <span className="text-sm font-black text-slate-900 ml-2">{formatKRW(totalKRW)}</span>
            <span className="text-[9px] text-slate-400 ml-1 font-bold italic">(적용환율: {exchangeRate}원/$)</span>
          </div>
        </section>

        {/* 2. Detailed Schedule */}
        <section className="mb-10">
          <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
            지급 대상 상세 내역
          </h2>
          <ReportTable 
            headers={[
              { label: '지급일', width: '12%' },
              { label: '거 래 처', width: '25%' },
              { label: '항 목 명 (적요)', align: 'left' },
              { label: '금액 (외화)', align: 'right', width: '15%' },
              { label: '예상 환산액', align: 'right', width: '18%' },
              { label: '상태', width: '10%' }
            ]}
          >
            {monthlySchedules.length > 0 ? (
                monthlySchedules.map((s, i) => (
                    <tr key={i} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-2 text-center font-mono">{s.date.split('-').slice(1).join('/')}</td>
                        <td className="px-2 py-2 font-black text-slate-800">{s.client}</td>
                        <td className="px-2 py-2 text-slate-500 font-medium">{s.desc || '-'}</td>
                        <td className="px-2 py-2 text-right font-black text-indigo-600 font-mono">
                            {formatForeign(s.amount, s.currency || 'USD')}
                        </td>
                        <td className="px-2 py-2 text-right font-black text-slate-900 font-mono">
                            {formatKRW(getKRW(s.amount, s.currency || 'USD'))}
                        </td>
                        <td className="px-2 py-2 text-center text-[9px] font-black">
                            <span className={s.status === '송금 완료(집행)' ? 'text-emerald-600' : 'text-slate-400'}>
                                {s.status === '송금 완료(집행)' ? '집행완료' : '지급예정'}
                            </span>
                        </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={6} className="px-2 py-20 text-center text-slate-300 font-bold italic">데이터가 존재하지 않습니다.</td>
                </tr>
            )}
          </ReportTable>
        </section>

        {/* 3. Notes / Bank Info */}
        <section className="mt-20">
            <div className="border-t-2 border-slate-800 pt-6">
                <p className="text-[11px] font-bold text-slate-500 mb-2 italic">※ 비고 :</p>
                <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                    <li>적용 환율은 작성일 기준 현재 시장가격을 반영한 예상치임.</li>
                    <li>지급 당일의 시장 환율 변동에 따라 최종 집행 금액이 달라질 수 있음.</li>
                    <li>집행 완료된 건은 전표 번호 및 증빙 서류 합철 필요.</li>
                </ul>
            </div>
        </section>

        {/* Footer Stamp */}
        <div className="mt-32 text-center">
            <div className="inline-block border-4 border-double border-slate-900 p-4 px-8">
                <p className="text-lg font-black tracking-[0.5em] text-slate-900 uppercase">컴포즈커피(주) 재무본부</p>
            </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
          #report-content {
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          button {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
};

export default ForeignReportPage;
