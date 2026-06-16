import React, { useState, useEffect } from 'react';
import { formatUSD, formatKRW, formatForeign } from '../utils/formatters';
import { Printer, ChevronLeft, Calendar, ArrowRightLeft, Package } from 'lucide-react';

const ForeignReportPage = ({ 
  selectedMonth,
  fxSchedule = [],
  exchangeResults = [],
  rawBeanContracts = [],
  exchangeRate = 1450,
  exchangeRateEUR = 1580,
  exchangeRateJPY = 10,
  defaultTab = 'schedule',
  onBack
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'schedule', 'exchange', or 'beans'
  const [year, month] = selectedMonth.split('-');
  const formattedMonth = `${year}년 ${month}월`;
  const formattedYear = `${year}년도`;

  useEffect(() => {
    let reportTitle = '';
    if (activeTab === 'schedule') {
      reportTitle = `외화_송금_계획_보고서_${selectedMonth}`;
    } else if (activeTab === 'exchange') {
      reportTitle = `환전_결과_분석_보고서_${year}년도`;
    } else {
      reportTitle = `생두_구매_계약_보고서_${year}년도`;
    }

    const originalTitle = document.title;
    document.title = reportTitle;

    return () => {
      document.title = originalTitle;
    };
  }, [activeTab, selectedMonth, year]);

  // --- 1. 송금 계획 데이터 처리 ---
  const monthlySchedules = fxSchedule
    .filter(s => s.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  const scheduleTotals = monthlySchedules.reduce((acc, curr) => {
    const currency = curr.currency || 'USD';
    acc[currency] = (acc[currency] || 0) + Number(curr.amount || 0);
    return acc;
  }, {});

  const getKRW = (amount, currency) => {
    if (currency === 'EUR') return amount * exchangeRateEUR;
    if (currency === 'JPY') return amount * exchangeRateJPY;
    return amount * exchangeRate;
  };

  const scheduleTotalKRW = Object.entries(scheduleTotals).reduce((sum, [currency, amount]) => {
    return sum + getKRW(amount, currency);
  }, 0);

  // --- 2. 환전 결과 분석 데이터 처리 ---
  // 선택한 연도의 구매(BUY) 데이터만 필터링
  const yearlyExchange = (Array.isArray(exchangeResults) ? exchangeResults : [])
    .filter(e => e.date.startsWith(year) && e.type === 'BUY');
  
  // 월별, 통화별 그룹화
  const exchangeByMonth = {};
  const currenciesInYear = new Set();
  
  for (let m = 1; m <= 12; m++) {
      exchangeByMonth[String(m).padStart(2, '0')] = {};
  }

  yearlyExchange.forEach(e => {
      const eMonth = e.date.split('-')[1]; // '01', '02', etc.
      const currency = e.currency || 'USD';
      currenciesInYear.add(currency);
      
      if (!exchangeByMonth[eMonth]) exchangeByMonth[eMonth] = {};
      if (!exchangeByMonth[eMonth][currency]) {
          exchangeByMonth[eMonth][currency] = { foreign: 0, krw: 0 };
      }
      
      exchangeByMonth[eMonth][currency].foreign += Math.abs(Number(e.usdAmount || 0));
      exchangeByMonth[eMonth][currency].krw += Math.abs(Number(e.krwAmount || 0));
  });

  const currenciesList = Array.from(currenciesInYear).sort();
  const detailedExchanges = yearlyExchange.sort((a, b) => a.date.localeCompare(b.date));

  // 연간 총합 계산
  const yearlyTotals = {};
  currenciesList.forEach(c => {
      yearlyTotals[c] = { foreign: 0, krw: 0 };
      for (let m = 1; m <= 12; m++) {
          const mStr = String(m).padStart(2, '0');
          if (exchangeByMonth[mStr] && exchangeByMonth[mStr][c]) {
              yearlyTotals[c].foreign += exchangeByMonth[mStr][c].foreign;
              yearlyTotals[c].krw += exchangeByMonth[mStr][c].krw;
          }
      }
  });

  // --- 3. 생두 계약 데이터 처리 ---
  // 선택한 연도의 생두 계약만 필터링 (paymentYear 기준)
  const yearlyContracts = (Array.isArray(rawBeanContracts) ? rawBeanContracts : [])
    .filter(c => c.paymentYear === year)
    .sort((a, b) => {
      const dateA = `${a.paymentYear}-${String(a.paymentMonth).padStart(2, '0')}`;
      const dateB = `${b.paymentYear}-${String(b.paymentMonth).padStart(2, '0')}`;
      return dateA.localeCompare(dateB);
    });

  const contractTotals = yearlyContracts.reduce((acc, c) => {
    const unitPrice = c.isFixedPrice 
      ? Number(c.fixedPrice || 0)
      : (Number(c.index || 0) + Number(c.differential || 0)) * 22.046 / 1000;
    const amountUSD = unitPrice * Number(c.weight || 0);
    const rate = Number(c.planExchangeRate || exchangeRate);
    const amountKRW = amountUSD * rate;
    
    acc.weight += Number(c.weight || 0);
    acc.containers += Number(c.containerCount || 0);
    acc.usd += amountUSD;
    acc.krw += amountKRW;
    return acc;
  }, { weight: 0, containers: 0, usd: 0, krw: 0 });

  // 산지(Origin)별 월별 평균 단가 계산
  const origins = Array.from(new Set(yearlyContracts.map(c => c.origin).filter(Boolean))).sort();
  const originMonthlyStats = {};
  
  origins.forEach(origin => {
    originMonthlyStats[origin] = {};
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      originMonthlyStats[origin][mStr] = { weight: 0, usd: 0 };
    }
  });

  yearlyContracts.forEach(c => {
    const origin = c.origin;
    if (!origin) return;
    const monthNum = Number(c.paymentMonth);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return;
    const mStr = String(monthNum).padStart(2, '0');
    
    const unitPrice = c.isFixedPrice 
      ? Number(c.fixedPrice || 0)
      : (Number(c.index || 0) + Number(c.differential || 0)) * 22.046 / 1000;
    const weight = Number(c.weight || 0);
    const amountUSD = unitPrice * weight;
    
    if (originMonthlyStats[origin] && originMonthlyStats[origin][mStr]) {
      originMonthlyStats[origin][mStr].weight += weight;
      originMonthlyStats[origin][mStr].usd += amountUSD;
    }
  });

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-10 print:p-0 print:bg-white">
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          돌아가기
        </button>
        
        {/* Tab Selection */}
        <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
          <button 
            onClick={() => setActiveTab('schedule')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar className="w-3.5 h-3.5" /> 송금 계획 보고서
          </button>
          <button 
            onClick={() => setActiveTab('exchange')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'exchange' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> 환전 결과 분석 보고서
          </button>
          <button 
            onClick={() => setActiveTab('beans')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'beans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package className="w-3.5 h-3.5 text-indigo-500" /> 생두 계약 보고서
          </button>
        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
        >
          <Printer className="w-4 h-4" />
          PDF로 저장하기
        </button>
      </div>

      {/* Page Content */}
      <div id="report-content" className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-2xl print:shadow-none print:p-[10mm]">
        
        {/* Report Header */}
        <div className="text-center mb-12 relative">
          <h1 className="text-3xl font-black text-slate-900 tracking-[0.2em] mb-4 border-b-4 border-slate-900 pb-4 inline-block px-12">
            {activeTab === 'schedule' 
              ? '외화 송금 계획 보고서' 
              : activeTab === 'exchange' 
                ? '환전 결과 분석 보고서' 
                : '생두 구매 계약 보고서'}
          </h1>
          <div className="flex justify-between items-end mt-4">
            <div className="text-left">
              <p className="text-sm font-black text-slate-800">
                  대상 기간 : {activeTab === 'schedule' ? formattedMonth : formattedYear}
              </p>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase">
                  {activeTab === 'schedule' 
                    ? 'REMITTANCE SCHEDULE REPORT' 
                    : activeTab === 'exchange' 
                      ? 'FOREIGN EXCHANGE ANALYSIS REPORT' 
                      : 'RAW BEAN CONTRACT REPORT'}
              </p>
            </div>
          </div>
        </div>

        {activeTab === 'schedule' ? (
            <>
                {/* 1. Monthly Summary */}
                <section className="mb-10">
                <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    월간 송금 예정 요약
                </h2>
                <div className="grid grid-cols-3 gap-0 border-2 border-slate-800 text-center">
                    {Object.entries(scheduleTotals).length > 0 ? (
                        Object.entries(scheduleTotals).map(([currency, amount], i) => (
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
                    <span className="text-sm font-black text-slate-900 ml-2">{formatKRW(scheduleTotalKRW)}</span>
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
            </>
        ) : activeTab === 'exchange' ? (
            <>
                {/* 환전 결과 분석 보고서 렌더링 */}
                {currenciesList.length > 0 ? (
                    <>
                        {currenciesList.map((currency) => (
                            <section key={currency} className="mb-12">
                                <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                        {currenciesList.indexOf(currency) + 1}
                                    </span>
                                    {currency} 매수 현황 (월별 비교)
                                </h2>
                                <ReportTable 
                                    headers={[
                                        { label: '월', width: '10%' },
                                        { label: '외화 매수액 (BUY)', align: 'right', width: '30%' },
                                        { label: '원화 투입액 (KRW)', align: 'right', width: '30%' },
                                        { label: '평균 매수 환율', align: 'right', width: '30%' }
                                    ]}
                                >
                                    {Array.from({length: 12}).map((_, i) => {
                                        const mStr = String(i + 1).padStart(2, '0');
                                        const data = exchangeByMonth[mStr]?.[currency] || { foreign: 0, krw: 0 };
                                        const avgRate = data.foreign > 0 ? data.krw / data.foreign : 0;
                                        
                                        return (
                                            <tr key={mStr} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors">
                                                <td className="px-2 py-2 text-center font-bold text-slate-800">{i + 1}월</td>
                                                <td className="px-2 py-2 text-right font-black text-indigo-600 font-mono">
                                                    {data.foreign > 0 ? formatForeign(data.foreign, currency) : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-right font-black text-slate-700 font-mono">
                                                    {data.krw > 0 ? formatKRW(data.krw) : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-right font-black text-slate-900 font-mono">
                                                    {avgRate > 0 ? `${avgRate.toFixed(2)} 원` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Row */}
                                    <tr className="divide-x divide-slate-800 border-t-2 border-slate-800 bg-slate-100">
                                        <td className="px-2 py-3 text-center font-black text-slate-900">Total</td>
                                        <td className="px-2 py-3 text-right font-black text-indigo-700 font-mono text-sm">
                                            {formatForeign(yearlyTotals[currency].foreign, currency)}
                                        </td>
                                        <td className="px-2 py-3 text-right font-black text-slate-900 font-mono text-sm">
                                            {formatKRW(yearlyTotals[currency].krw)}
                                        </td>
                                        <td className="px-2 py-3 text-right font-black text-rose-600 font-mono text-sm">
                                            {yearlyTotals[currency].foreign > 0 
                                                ? `${(yearlyTotals[currency].krw / yearlyTotals[currency].foreign).toFixed(2)} 원` 
                                                : '-'}
                                        </td>
                                    </tr>
                                </ReportTable>
                            </section>
                        ))}

                        {/* 2. Detailed Exchange Results */}
                        <section className="mb-10 page-break-before">
                            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                                <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                    {currenciesList.length + 1}
                                </span>
                                세부 환전 내역 (거래일순)
                            </h2>
                            <ReportTable 
                                headers={[
                                    { label: '일자', width: '12%' },
                                    { label: '법인', width: '10%' },
                                    { label: '환종', width: '8%' },
                                    { label: '외화 매수액', align: 'right', width: '18%' },
                                    { label: '원화 투입액', align: 'right', width: '20%' },
                                    { label: '적용 환율', align: 'right', width: '15%' },
                                    { label: '적요 (비고)', align: 'left' }
                                ]}
                            >
                                {detailedExchanges.length > 0 ? (
                                    detailedExchanges.map((e, i) => {
                                        const currency = e.currency || 'USD';
                                        const rate = Math.abs(e.krwAmount) / Math.abs(e.usdAmount);
                                        const displaySection = (e.section === '컴포즈커피' || e.section?.includes('컴포즈'))
                                            ? '컴포즈'
                                            : (e.section === '스마트팩토리' || e.section?.includes('스마트'))
                                                ? '스마트'
                                                : (e.section || '-');
                                        return (
                                            <tr key={i} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors">
                                                <td className="px-2 py-2 text-center font-mono">{e.date.replace(/-/g, '/')}</td>
                                                <td className="px-2 py-2 text-center font-black text-slate-800">{displaySection}</td>
                                                <td className="px-2 py-2 text-center font-black text-slate-700">{currency}</td>
                                                <td className="px-2 py-2 text-right font-black text-indigo-600 font-mono">
                                                    {formatForeign(Math.abs(e.usdAmount), currency)}
                                                </td>
                                                <td className="px-2 py-2 text-right font-black text-slate-900 font-mono">
                                                    {formatKRW(Math.abs(e.krwAmount))}
                                                </td>
                                                <td className="px-2 py-2 text-right font-black text-slate-900 font-mono">
                                                    {rate > 0 ? rate.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-slate-500 font-medium truncate max-w-[150px]" title={e.desc || ''}>
                                                    {e.desc || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-2 py-20 text-center text-slate-300 font-bold italic">세부 내역이 존재하지 않습니다.</td>
                                    </tr>
                                )}
                            </ReportTable>
                        </section>
                    </>
                ) : (
                    <div className="p-20 text-center text-slate-400 font-bold italic border-2 border-dashed border-slate-300 rounded-xl">
                        해당 연도({year}년)에 기록된 외화 매수 내역이 없습니다.
                    </div>
                )}
            </>
        ) : (
            <>
                {/* 3. 생두 구매 계약 보고서 렌더링 */}
                <section className="mb-10">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                        연간 생두 계약 요약 ({year}년도)
                    </h2>
                    <div className="grid grid-cols-3 gap-0 border-2 border-slate-800 text-center">
                        <div className="p-4 border-r-2 border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">총 계약 중량</p>
                            <p className="text-base font-black text-slate-900">{Math.round(contractTotals.weight).toLocaleString()} kg</p>
                        </div>
                        <div className="p-4 border-r-2 border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">총 외화 금액</p>
                            <p className="text-base font-black text-slate-900">
                                {'$' + Math.round(contractTotals.usd).toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">총 원화 환산액</p>
                            <p className="text-base font-black text-slate-900">{formatKRW(contractTotals.krw)}</p>
                        </div>
                    </div>
                </section>

                <section className="mb-10">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                        산지(Origin)별 월별 평균 계약 단가 (USD/KG)
                    </h2>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-[9px] border-collapse border-2 border-slate-800 text-center font-mono">
                            <thead className="bg-slate-100/80">
                                <tr className="divide-x divide-slate-800 border-b-2 border-slate-800 text-[9px] font-black text-slate-900">
                                    <th className="px-1 py-1.5 font-black text-left" style={{ width: '13%' }}>산지 (Origin)</th>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <th key={i} className="px-0.5 py-1.5 font-black" style={{ width: '6.5%' }}>{i + 1}월</th>
                                    ))}
                                    <th className="px-1 py-1.5 font-black" style={{ width: '9%' }}>연평균</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400">
                                {origins.length > 0 ? (
                                    origins.map((origin) => {
                                        const totalUSDForOrigin = Object.values(originMonthlyStats[origin]).reduce((sum, m) => sum + m.usd, 0);
                                        const totalWeightForOrigin = Object.values(originMonthlyStats[origin]).reduce((sum, m) => sum + m.weight, 0);
                                        const yearlyAvgPrice = totalWeightForOrigin > 0 ? totalUSDForOrigin / totalWeightForOrigin : 0;

                                        return (
                                            <tr key={origin} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors font-bold text-slate-800">
                                                <td className="px-1 py-1.5 text-left font-sans text-slate-900">{origin}</td>
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const mStr = String(i + 1).padStart(2, '0');
                                                    const stats = originMonthlyStats[origin][mStr];
                                                    const avgPrice = stats.weight > 0 ? stats.usd / stats.weight : 0;
                                                    return (
                                                        <td key={mStr} className={`px-0.5 py-1.5 ${avgPrice > 0 ? 'text-indigo-600 font-black' : 'text-slate-300'}`}>
                                                            {avgPrice > 0 ? avgPrice.toFixed(1) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-1 py-1.5 text-rose-600 font-black">
                                                    {yearlyAvgPrice > 0 ? yearlyAvgPrice.toFixed(1) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={14} className="px-2 py-8 text-center text-slate-300 font-bold italic">계약 내역이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
 
                <section className="mb-10 page-break-before">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                        상세 생두 구매 계약 리스트
                    </h2>
                    <ReportTable 
                        headers={[
                            { label: '지급시기', width: '8%' },
                            { label: '산지/공급업체', align: 'left', width: '20%' },
                            { label: '계약번호/차수', width: '16%' },
                            { label: '중량 (KG)', align: 'right', width: '10%' },
                            { label: '단가 (USD/KG)', align: 'right', width: '11%' },
                            { label: '외화 금액', align: 'right', width: '15%' },
                            { label: '원화 환산액 (원)', align: 'right', width: '20%' }
                        ]}
                    >
                        {yearlyContracts.length > 0 ? (
                            yearlyContracts.map((c, i) => {
                                const unitPrice = c.isFixedPrice 
                                    ? Number(c.fixedPrice || 0)
                                    : (Number(c.index || 0) + Number(c.differential || 0)) * 22.046 / 1000;
                                const amountUSD = unitPrice * Number(c.weight || 0);
                                const amountKRW = amountUSD * Number(c.planExchangeRate || exchangeRate);
                                
                                return (
                                    <tr key={i} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors">
                                        <td className="px-2 py-2 text-center font-mono">
                                            {c.paymentYear}/{String(c.paymentMonth).padStart(2, '0')}
                                        </td>
                                        <td className="px-2 py-2 text-left font-black text-slate-800">
                                            <div className="font-bold">{c.origin}</div>
                                            <div className="text-[9px] text-slate-400">{c.supplier}</div>
                                        </td>
                                        <td className="px-2 py-2 text-center font-bold font-mono">
                                            <div>{c.contractNo || '-'}</div>
                                            <div className="text-[9px] text-slate-400">
                                                {c.installment ? `${c.installment}차` : '-'} ({c.containerCount || 0} CTN)
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-right font-black text-slate-800 font-mono">
                                            {Number(c.weight || 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 text-right font-black text-slate-600 font-mono">
                                            ${unitPrice.toFixed(4)}
                                        </td>
                                        <td className="px-2 py-2 text-right font-black text-indigo-600 font-mono">
                                            {formatUSD(amountUSD)}
                                        </td>
                                        <td className="px-2 py-2 text-right font-black text-slate-900 font-mono">
                                            {Math.floor(amountKRW).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-2 py-20 text-center text-slate-300 font-bold italic">계약 내역이 존재하지 않습니다.</td>
                            </tr>
                        )}
                    </ReportTable>
                </section>
            </>
        )}

        {/* 3. Notes / Bank Info */}
        <section className="mt-20">
            <div className="border-t-2 border-slate-800 pt-6">
                <p className="text-[11px] font-bold text-slate-500 mb-2 italic">※ 비고 :</p>
                {activeTab === 'schedule' ? (
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                        <li>적용 환율은 작성일 기준 현재 시장가격을 반영한 예상치임.</li>
                        <li>지급 당일의 시장 환율 변동에 따라 최종 집행 금액이 달라질 수 있음.</li>
                        <li>집행 완료된 건은 전표 번호 및 증빙 서류 합철 필요.</li>
                    </ul>
                ) : activeTab === 'exchange' ? (
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                        <li>본 보고서는 선택된 연도의 환전 결과(매수 건) 데이터를 기준으로 작성되었습니다.</li>
                        <li>월별 평균 매수 환율 = 해당 월의 원화 투입액 총합 / 외화 매수액 총합.</li>
                        <li>매도 건은 제외된 순수 매수(BUY) 기록 분석 자료입니다.</li>
                    </ul>
                ) : (
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                        <li>본 보고서는 등록된 {year}년도 지급분 생두 계약 데이터를 기준으로 작성되었습니다.</li>
                        <li>원화 환산액 = 총 계약 금액 (USD) * 기안 환율 (KRW).</li>
                        <li>시장가 연동 계약의 경우 산정 단가는 적용 시점의 인덱스 지수와 디퍼런셜 합산가 기준입니다.</li>
                    </ul>
                )}
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
          @page {
            size: A4 portrait !important;
            margin: 10mm !important;
          }
          #root {
            display: block !important;
          }
          aside, header, footer, .print\\:hidden {
            display: none !important;
          }
          .lg\\:ml-64, .lg\\:ml-20 {
            margin-left: 0 !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            max-width: none !important;
          }
          .max-w-7xl {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
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
            padding: 10mm !important;
          }
          button, .print\\:hidden {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .page-break-before {
            page-break-before: always !important;
          }
        }
      `}} />
    </div>
  );
};

export default ForeignReportPage;
