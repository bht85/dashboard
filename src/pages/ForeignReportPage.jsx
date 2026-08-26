import React, { useState, useEffect } from 'react';
import { formatUSD, formatKRW, formatForeign } from '../utils/formatters';
import { Printer, ChevronLeft, Calendar, ArrowRightLeft, Package, Activity } from 'lucide-react';

const ForeignReportPage = ({ 
  selectedMonth,
  fxSchedule = [],
  exchangeResults = [],
  rawBeanContracts = [],
  rawBeanSnapshots = [],
  exchangeRate = 1450,
  exchangeRateEUR = 1580,
  exchangeRateJPY = 10,
  defaultTab = 'schedule',
  onBack
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'schedule', 'exchange', or 'beans'
  const [year, month] = selectedMonth.split('-');
  const [selectedCurrIndex, setSelectedCurrIndex] = useState(0);
  const [selectedPrevIndex, setSelectedPrevIndex] = useState(-1);

  // --- Beans Variation Logic ---
  const sortedSnapshots = [...rawBeanSnapshots].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentSnapData = sortedSnapshots[selectedCurrIndex]?.data || rawBeanContracts || [];
  const prevSnapData = selectedPrevIndex === -1 ? [] : (sortedSnapshots[selectedPrevIndex]?.data || []);

  const aggregateBeans = (data) => {
    if (!Array.isArray(data)) return data || {}; // Already aggregated (compressed snapshot)
    return data.reduce((acc, curr) => {
      // Clean non-numeric characters (e.g. "2025년", "5월" -> "2025", "05")
      const rawYear = String(curr.paymentYear || new Date().getFullYear()).replace(/[^0-9]/g, '');
      const rawMonth = String(curr.paymentMonth || '1').replace(/[^0-9]/g, '');
      const pYear = rawYear.length === 4 ? rawYear : String(new Date().getFullYear());
      const pMonth = rawMonth.padStart(2, '0');
      const key = pYear + '-' + pMonth;
      if (!acc[key]) acc[key] = { weight: 0, usd: 0, krw: 0, indexSum: 0, count: 0 };
      
      // 우선순위: 인보이스중량이 명시적으로 비어있으면(환불/양도로 삭제) 0처리. 없으면 계약수량.
      let w = 0;
      if (curr.invoiceWeight !== undefined && curr.invoiceWeight !== null) {
          w = (curr.invoiceWeight === '' || String(curr.invoiceWeight).trim() === '') ? 0 : (parseFloat(curr.invoiceWeight) || 0);
      } else {
          w = parseFloat(curr.weight) || 0;
      }
      
      // 만약 중량이 0이면 취소된 건이므로 집계에서 제외
      if (w === 0) return acc;
      
      // 우선순위: 실제 송금액 > 예상 송금액 > 계산값
      let usdAmount = parseFloat(curr.actualUSD);
      let krwAmount = parseFloat(curr.actualKRW);
      
      // 만약 엑셀에 금액이 아예 없다면 기존 계산식으로 Fallback
      if (isNaN(usdAmount) || usdAmount === 0) {
          let unitPrice = 0;
          if (curr.isFixedPrice) {
            unitPrice = parseFloat(curr.fixedPrice) || 0;
          } else {
            unitPrice = ((parseFloat(curr.index) || 0) + (parseFloat(curr.differential) || 0)) * 22.046 / 1000;
          }
          usdAmount = w * unitPrice;
      }
      
      if (isNaN(krwAmount) || krwAmount === 0) {
          krwAmount = usdAmount * parseFloat(curr.planExchangeRate || exchangeRate);
      }

      acc[key].weight += w;
      acc[key].usd += usdAmount;
      acc[key].krw += krwAmount;
      const idxVal = parseFloat(curr.index);
      if (!isNaN(idxVal) && idxVal > 0) {
        acc[key].indexSum += idxVal;
        acc[key].count += 1;
      }
      return acc;
    }, {});
  };


  const formatSnapDateShort = (iso) => {
    if(!iso) return null;
    const d = new Date(iso);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  };
  const formatSnapDate = (iso) => {
    if(!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 기준`;
  };
  const currDateStr = sortedSnapshots[selectedCurrIndex] ? formatSnapDateShort(sortedSnapshots[selectedCurrIndex].createdAt) : formatSnapDateShort(new Date().toISOString());
  const prevDateStr = sortedSnapshots[selectedPrevIndex] ? formatSnapDateShort(sortedSnapshots[selectedPrevIndex].createdAt) : '비교 대상 없음';
  
  const currentAgg = aggregateBeans(currentSnapData);
  const prevAgg = aggregateBeans(prevSnapData);
  // Filter by the currently selected year (e.g. '2026') so it doesn't show all years at once
  const allBeanMonths = Array.from(new Set([...Object.keys(currentAgg), ...Object.keys(prevAgg)]))
    .filter(k => k.startsWith(year + '-'))
    .sort();

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
    .filter(c => String(c.paymentYear || '').replace(/[^0-9]/g, '') === year)
    .sort((a, b) => {
      const yA = String(a.paymentYear || '').replace(/[^0-9]/g, '');
      const mA = String(a.paymentMonth || '1').replace(/[^0-9]/g, '').padStart(2, '0');
      const yB = String(b.paymentYear || '').replace(/[^0-9]/g, '');
      const mB = String(b.paymentMonth || '1').replace(/[^0-9]/g, '').padStart(2, '0');
      const dateA = `${yA}-${mA}`;
      const dateB = `${yB}-${mB}`;
      return dateA.localeCompare(dateB);
    });

  const contractTotals = yearlyContracts.reduce((acc, c) => {
    let w = 0;
    if (c.invoiceWeight !== undefined && c.invoiceWeight !== null) {
        w = (c.invoiceWeight === '' || String(c.invoiceWeight).trim() === '') ? 0 : (Number(c.invoiceWeight) || 0);
    } else {
        w = Number(c.weight || 0);
    }
    
    // 취소된 계약(중량 0)은 집계에서 제외
    if (w === 0) return acc;
    let amountUSD = Number(c.actualUSD);
    let amountKRW = Number(c.actualKRW);

    if (isNaN(amountUSD) || amountUSD === 0) {
        const unitPrice = c.isFixedPrice 
          ? Number(c.fixedPrice || 0)
          : (Number(c.index || 0) + Number(c.differential || 0)) * 22.046 / 1000;
        amountUSD = unitPrice * w;
    }
    if (isNaN(amountKRW) || amountKRW === 0) {
        const rate = Number(c.planExchangeRate || exchangeRate);
        amountKRW = amountUSD * rate;
    }
    
    acc.weight += w;
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
    
    let weight = 0;
    if (c.invoiceWeight !== undefined && c.invoiceWeight !== null) {
        weight = (c.invoiceWeight === '' || String(c.invoiceWeight).trim() === '') ? 0 : (Number(c.invoiceWeight) || 0);
    } else {
        weight = Number(c.weight || 0);
    }
    
    // 취소된 계약(중량 0)은 집계에서 제외
    if (weight === 0) return;

    const monthNum = Number(String(c.paymentMonth || '').replace(/[^0-9]/g, ''));
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return;
    const mStr = String(monthNum).padStart(2, '0');
    let amountUSD = Number(c.actualUSD);
    
    if (isNaN(amountUSD) || amountUSD === 0) {
        const unitPrice = c.isFixedPrice 
          ? Number(c.fixedPrice || 0)
          : (Number(c.index || 0) + Number(c.differential || 0)) * 22.046 / 1000;
        amountUSD = unitPrice * weight;
    }
    
    if (originMonthlyStats[origin] && originMonthlyStats[origin][mStr]) {
      originMonthlyStats[origin][mStr].weight += weight;
      originMonthlyStats[origin][mStr].usd += amountUSD;
    }
  });

  const tableGrandTotalUSD = origins.reduce((sum, origin) => {
    return sum + Object.values(originMonthlyStats[origin]).reduce((innerSum, m) => innerSum + m.usd, 0);
  }, 0);

  const tableGrandTotalWeight = origins.reduce((sum, origin) => {
    return sum + Object.values(originMonthlyStats[origin]).reduce((innerSum, m) => innerSum + m.weight, 0);
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
          <button 
            onClick={() => setActiveTab('variation')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'variation' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-500" /> 변동 분석 보고서
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
        ) : activeTab === 'beans' ? (
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

                <section className="mb-10">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                        산지(Origin)별 월별 외화 지급액 (천 USD)
                    </h2>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-[9px] border-collapse border-2 border-slate-800 text-center font-mono">
                            <thead className="bg-slate-100/80">
                                <tr className="divide-x divide-slate-800 border-b-2 border-slate-800 text-[9px] font-black text-slate-900">
                                    <th className="px-1 py-1.5 font-black text-left" style={{ width: '13%' }}>산지 (Origin)</th>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <th key={i} className="px-0.5 py-1.5 font-black" style={{ width: '6.5%' }}>{i + 1}월</th>
                                    ))}
                                    <th className="px-1 py-1.5 font-black" style={{ width: '9%' }}>소계</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400">
                                {origins.length > 0 ? (
                                    <>
                                        {origins.map((origin) => {
                                            const totalUSDForOrigin = Object.values(originMonthlyStats[origin]).reduce((sum, m) => sum + m.usd, 0);
                                            const displayRowTotal = totalUSDForOrigin > 0 ? Math.round(totalUSDForOrigin / 1000) : null;

                                            return (
                                                <tr key={origin} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors font-bold text-slate-800">
                                                    <td className="px-1 py-1.5 text-left font-sans text-slate-900">{origin}</td>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const mStr = String(i + 1).padStart(2, '0');
                                                        const stats = originMonthlyStats[origin][mStr];
                                                        const usd = stats.usd;
                                                        const displayVal = usd > 0 ? Math.round(usd / 1000) : null;
                                                        return (
                                                            <td key={mStr} className={`px-0.5 py-1.5 ${usd > 0 ? 'text-indigo-600 font-black' : 'text-slate-300'}`}>
                                                                {displayVal !== null ? displayVal.toLocaleString() : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-1 py-1.5 text-slate-900 font-black bg-slate-50/50">
                                                        {displayRowTotal !== null ? displayRowTotal.toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Monthly Subtotals Row */}
                                        <tr className="divide-x divide-slate-800 border-t-2 border-slate-800 bg-slate-100 font-black text-slate-900">
                                            <td className="px-1 py-2 text-left font-sans">소계 (월별)</td>
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const mStr = String(i + 1).padStart(2, '0');
                                                const monthlyTotal = origins.reduce((sum, origin) => sum + (originMonthlyStats[origin]?.[mStr]?.usd || 0), 0);
                                                const displayMonthlyTotal = monthlyTotal > 0 ? Math.round(monthlyTotal / 1000) : null;
                                                return (
                                                    <td key={mStr} className="px-0.5 py-2 text-indigo-700">
                                                        {displayMonthlyTotal !== null ? displayMonthlyTotal.toLocaleString() : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-1 py-2 text-rose-600 font-black bg-slate-200/50">
                                                {tableGrandTotalUSD > 0 ? Math.round(tableGrandTotalUSD / 1000).toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={14} className="px-2 py-8 text-center text-slate-300 font-bold italic">계약 내역이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mb-10">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">4</span>
                        산지(Origin)별 월별 계약 중량 (천 kg)
                    </h2>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-[9px] border-collapse border-2 border-slate-800 text-center font-mono">
                            <thead className="bg-slate-100/80">
                                <tr className="divide-x divide-slate-800 border-b-2 border-slate-800 text-[9px] font-black text-slate-900">
                                    <th className="px-1 py-1.5 font-black text-left" style={{ width: '13%' }}>산지 (Origin)</th>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <th key={i} className="px-0.5 py-1.5 font-black" style={{ width: '6.5%' }}>{i + 1}월</th>
                                    ))}
                                    <th className="px-1 py-1.5 font-black" style={{ width: '9%' }}>소계</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400">
                                {origins.length > 0 ? (
                                    <>
                                        {origins.map((origin) => {
                                            const totalWeightForOrigin = Object.values(originMonthlyStats[origin]).reduce((sum, m) => sum + m.weight, 0);
                                            const displayRowTotal = totalWeightForOrigin > 0 ? Math.round(totalWeightForOrigin / 1000) : null;

                                            return (
                                                <tr key={origin} className="divide-x divide-slate-400 hover:bg-slate-50 transition-colors font-bold text-slate-800">
                                                    <td className="px-1 py-1.5 text-left font-sans text-slate-900">{origin}</td>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const mStr = String(i + 1).padStart(2, '0');
                                                        const stats = originMonthlyStats[origin][mStr];
                                                        const weight = stats.weight;
                                                        const displayVal = weight > 0 ? Math.round(weight / 1000) : null;
                                                        return (
                                                            <td key={mStr} className={`px-0.5 py-1.5 ${weight > 0 ? 'text-indigo-600 font-black' : 'text-slate-300'}`}>
                                                                {displayVal !== null ? displayVal.toLocaleString() : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-1 py-1.5 text-slate-900 font-black bg-slate-50/50">
                                                        {displayRowTotal !== null ? displayRowTotal.toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Monthly Subtotals Row */}
                                        <tr className="divide-x divide-slate-800 border-t-2 border-slate-800 bg-slate-100 font-black text-slate-900">
                                            <td className="px-1 py-2 text-left font-sans">소계 (월별)</td>
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const mStr = String(i + 1).padStart(2, '0');
                                                const monthlyTotalWeight = origins.reduce((sum, origin) => sum + (originMonthlyStats[origin]?.[mStr]?.weight || 0), 0);
                                                const displayMonthlyTotal = monthlyTotalWeight > 0 ? Math.round(monthlyTotalWeight / 1000) : null;
                                                return (
                                                    <td key={mStr} className="px-0.5 py-2 text-indigo-700">
                                                        {displayMonthlyTotal !== null ? displayMonthlyTotal.toLocaleString() : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-1 py-2 text-rose-600 font-black bg-slate-200/50">
                                                {tableGrandTotalWeight > 0 ? Math.round(tableGrandTotalWeight / 1000).toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={14} className="px-2 py-8 text-center text-slate-300 font-bold italic">계약 내역이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>




            </>
        ) : activeTab === 'variation' ? (
            <>
                {/* 2. 주간 변동 분석 */}
                <section className="mb-10 print:break-before-page">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                           대금 지급월 기준 주간 변동 분석 (전주 대비)
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 tracking-tight">
                          <select 
                             value={selectedPrevIndex} 
                             onChange={(e) => setSelectedPrevIndex(Number(e.target.value))}
                             className="bg-transparent text-rose-600 outline-none cursor-pointer hover:bg-slate-200 rounded px-1 text-right print:appearance-none print:bg-transparent"
                          >
                             <option value={-1}>비교 대상 없음</option>
                             {sortedSnapshots.map((s, i) => (
                                 <option key={'p'+i} value={i}>[{formatSnapDateShort(s.createdAt)}]</option>
                             ))}
                          </select>
                          <span>vs</span>
                          <select 
                             value={selectedCurrIndex} 
                             onChange={(e) => setSelectedCurrIndex(Number(e.target.value))}
                             className="bg-transparent text-indigo-600 outline-none cursor-pointer hover:bg-slate-200 rounded px-1 print:appearance-none print:bg-transparent"
                          >
                             {sortedSnapshots.length === 0 && <option value={0}>[{formatSnapDateShort(new Date().toISOString())}]</option>}
                             {sortedSnapshots.map((s, i) => (
                                 <option key={'c'+i} value={i}>[{formatSnapDateShort(s.createdAt)}]</option>
                             ))}
                          </select>
                        </div>
                    </h2>
                    <div className="border-2 border-slate-900 overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 border-b-2 border-slate-900 font-black text-slate-800 text-[10px]">
                                <tr>
                                    <th className="px-2 py-2 border-r-2 border-slate-900 text-center">월</th>
                                    <th className="px-3 py-2 border-r border-slate-300 text-right">수량 (KG)</th>
                                    <th className="px-3 py-2 border-r border-slate-300 text-right">외화 합계 (USD)</th>
                                    <th className="px-3 py-2 border-r border-slate-300 text-right">원화 합계 (KRW)</th>
                                    <th className="px-3 py-2 text-right">평균 커피지수 (C/LB)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allBeanMonths.length > 0 ? allBeanMonths.map(mStr => {
                                    const c = currentAgg[mStr] || { weight: 0, usd: 0, krw: 0, indexSum: 0, count: 0 };
                                    const p = prevAgg[mStr] || { weight: 0, usd: 0, krw: 0, indexSum: 0, count: 0 };
                                    
                                    const diffWeight = c.weight - p.weight;
                                    const diffUsd = c.usd - p.usd;
                                    const diffKrw = c.krw - p.krw;
                                    
                                    const cAvgIdx = c.count > 0 ? (c.indexSum / c.count) : 0;
                                    const pAvgIdx = p.count > 0 ? (p.indexSum / p.count) : 0;
                                    const diffIdx = cAvgIdx - pAvgIdx;

                                    const renderDiff = (val, isIdx = false) => {
                                        if (Math.abs(val) < 0.01) return <span className="text-slate-300 ml-2 text-[9px]">-</span>;
                                        const sign = val > 0 ? '▲' : '▼';
                                        const color = val > 0 ? 'text-rose-600' : 'text-blue-600';
                                        const vStr = isIdx ? Math.abs(val).toFixed(2) : Math.abs(Math.round(val)).toLocaleString();
                                        return <span className={`ml-2 text-[9px] font-black ${color}`}>{sign} {vStr}</span>;
                                    };

                                    return (
                                        <tr key={mStr} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="px-3 py-2 border-r-2 border-slate-900 text-center font-bold text-slate-700">{parseInt(mStr.split('-')[1], 10)}월</td>
                                            <td className="px-3 py-2 border-r border-slate-300 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(c.weight).toLocaleString()}</span>
                                                {renderDiff(diffWeight)}
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-300 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(c.usd).toLocaleString()}</span>
                                                {renderDiff(diffUsd)}
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-300 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(c.krw).toLocaleString()}</span>
                                                {renderDiff(diffKrw)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{cAvgIdx > 0 ? cAvgIdx.toFixed(2) : '-'}</span>
                                                {renderDiff(diffIdx, true)}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-bold italic">비교할 주간 변동 데이터가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 2. 누적 업로드 기록 요약 */}
                <section className="mb-10 print:break-before-page">
                    <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                        기준일자별 전체 누적 합계 흐름 ({year}년도)
                    </h2>
                    <div className="border-2 border-slate-900 overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 border-b-2 border-slate-900 font-black text-slate-800 text-[10px]">
                                <tr>
                                    <th className="px-3 py-2 border-r-2 border-slate-900 text-center">기준일자</th>
                                    <th className="px-3 py-2 border-r border-slate-300 text-right">총 수량 (KG)</th>
                                    <th className="px-3 py-2 border-r border-slate-300 text-right">총 외화 합계 (USD)</th>
                                    <th className="px-3 py-2 text-right">총 원화 합계 (KRW)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSnapshots.map((snap, idx) => {
                                    const snapAgg = aggregateBeans(snap.data || []);
                                    let totalW = 0, totalU = 0, totalK = 0;
                                    Object.keys(snapAgg).filter(k => k.startsWith(year + '-')).forEach(k => {
                                        totalW += snapAgg[k].weight;
                                        totalU += snapAgg[k].usd;
                                        totalK += snapAgg[k].krw;
                                    });
                                    
                                    // Calculate diff from the previous (older) snapshot
                                    let diffW = 0, diffU = 0, diffK = 0;
                                    if (idx < sortedSnapshots.length - 1) {
                                        const olderSnapAgg = aggregateBeans(sortedSnapshots[idx + 1].data || []);
                                        let olderW = 0, olderU = 0, olderK = 0;
                                        Object.keys(olderSnapAgg).filter(k => k.startsWith(year + '-')).forEach(k => {
                                            olderW += olderSnapAgg[k].weight;
                                            olderU += olderSnapAgg[k].usd;
                                            olderK += olderSnapAgg[k].krw;
                                        });
                                        diffW = totalW - olderW;
                                        diffU = totalU - olderU;
                                        diffK = totalK - olderK;
                                    }

                                    const renderDiff = (val) => {
                                        if (Math.abs(val) < 0.01 || idx === sortedSnapshots.length - 1) return null;
                                        const sign = val > 0 ? '▲' : '▼';
                                        const color = val > 0 ? 'text-rose-600' : 'text-blue-600';
                                        return <span className={`ml-2 text-[9px] font-black ${color}`}>{sign} {Math.abs(Math.round(val)).toLocaleString()}</span>;
                                    };

                                    return (
                                        <tr key={snap.createdAt} className={`border-b border-slate-200 hover:bg-slate-50 ${idx === 0 ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="px-3 py-2 border-r-2 border-slate-900 text-center font-bold text-slate-700">
                                                {formatSnapDateShort(snap.createdAt)}
                                                {idx === 0 && <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] rounded">최신</span>}
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-300 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(totalW).toLocaleString()}</span>
                                                {renderDiff(diffW)}
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-300 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(totalU).toLocaleString()}</span>
                                                {renderDiff(diffU)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                <span className="text-slate-900 font-bold">{Math.round(totalK).toLocaleString()}</span>
                                                {renderDiff(diffK)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedSnapshots.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 font-bold italic">기록된 업로드 히스토리가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </>
        ) : null}

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
                ) : activeTab === 'variation' ? (
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                        <li>본 보고서는 가장 최근 업로드된 데이터와 직전 데이터의 주간 변동 내역을 대금 지급월 기준으로 분석한 자료입니다.</li>
                        <li>붉은색(▲)은 증가, 푸른색(▼)은 감소를 의미하며, 취소 및 양도 건은 제외하여 집계되었습니다.</li>
                    </ul>
                ) : (
                    <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                        <li>본 보고서는 등록된 {year}년도 지급분 생두 계약 데이터를 기준으로 작성되었습니다.</li>
                        <li>외화 지급액 및 계약 중량 표의 수치는 천 단위(천 USD, 천 kg)로 반올림하여 표시되었습니다.</li>
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
