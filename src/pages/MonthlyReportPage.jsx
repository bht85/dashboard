import React from 'react';
import { formatKRW, formatUSD, isExcludedAccount } from '../utils/formatters';
import { Download, Printer } from 'lucide-react';

const MonthlyReportPage = ({ 
  recordDate = "2026-03-24", 
  dailyStatuses = {}, 
  exchangeRate = 1,
  composeAccounts = [],
  smartAccounts = []
}) => {
  // --- 마스터 계좌 기반 통화 판별 로직 (데이터 정합성 보장) ---
  const usdAccountSet = new Set([
    ...composeAccounts.filter(a => a.isUSD).map(a => String(a.no).replace(/[\s-]/g, '')),
    ...smartAccounts.filter(a => a.isUSD).map(a => String(a.no).replace(/[\s-]/g, ''))
  ]);

  const checkIsUSD = (accountNo) => {
    if (!accountNo) return false;
    return usdAccountSet.has(String(accountNo).replace(/[\s-]/g, ''));
  };

  // --- 데이터 연동 로직 ---
  const currentMonth = recordDate.substring(0, 7); // "2026-03"
  const monthName = parseInt(currentMonth.split('-')[1]) + "월";
  
  const monthData = Object.keys(dailyStatuses)
    .filter(date => date.startsWith(currentMonth))
    .sort()
    .map(date => {
      const raw = dailyStatuses[date];
      const filteredDetails = (raw.details || []).filter(item => !isExcludedAccount(item));
      return { 
        ...raw,
        date, 
        details: filteredDetails,
        inflow: filteredDetails.reduce((s, i) => s + (!checkIsUSD(i.account) ? Number(i.deposits || 0) : 0), 0),
        outflow: filteredDetails.reduce((s, i) => s + (!checkIsUSD(i.account) ? Number(i.withdrawals || 0) : 0), 0),
        inflowUSD: filteredDetails.reduce((s, i) => s + (checkIsUSD(i.account) ? Number(i.deposits || 0) : 0), 0),
        outflowUSD: filteredDetails.reduce((s, i) => s + (checkIsUSD(i.account) ? Number(i.withdrawals || 0) : 0), 0),
        totalBalance: filteredDetails.reduce((s, i) => s + (!checkIsUSD(i.account) ? Number(i.totalBalance || 0) : 0), 0),
        totalBalanceUSD: filteredDetails.reduce((s, i) => s + (checkIsUSD(i.account) ? Number(i.totalBalance || 0) : 0), 0),
      };
    });

  const lastStatus = monthData.length > 0 ? monthData[monthData.length - 1] : null;
  const firstStatus = monthData.length > 0 ? monthData[0] : null;

  // 법인별 월간 집계 헬퍼
  const getEntityStats = (entityKeyword) => {
    const lastDetails = lastStatus?.details?.filter(d => d.entity.includes(entityKeyword)) || [];
    const firstDetails = firstStatus?.details?.filter(d => d.entity.includes(entityKeyword)) || [];
    const hasUSD = lastDetails.some(d => checkIsUSD(d.account));
    
    // 마감 잔액 (기말 시점)
    const closingKRW = lastDetails.reduce((s, i) => s + (!checkIsUSD(i.account) ? Number(i.totalBalance || 0) : 0), 0);
    const closingUSD = lastDetails.reduce((s, i) => s + (checkIsUSD(i.account) ? Number(i.totalBalance || 0) : 0), 0);
    
    // 이월 잔액 (기초 시점 - 해당 월 첫 기록의 전일 잔액 직접 참조)
    const openingKRW = firstDetails.reduce((s, i) => s + (!checkIsUSD(i.account) ? Number(i.prevBalance || 0) : 0), 0);
    const openingUSD = firstDetails.reduce((s, i) => s + (checkIsUSD(i.account) ? Number(i.prevBalance || 0) : 0), 0);
    
    // 월간 입출금 합계 (전체 기간 합산)
    const inflowKRW = monthData.reduce((sum, day) => 
      sum + day.details.filter(d => d.entity.includes(entityKeyword) && !checkIsUSD(d.account)).reduce((s, i) => s + Number(i.deposits || 0), 0), 0);
    const outflowKRW = monthData.reduce((sum, day) => 
      sum + day.details.filter(d => d.entity.includes(entityKeyword) && !checkIsUSD(d.account)).reduce((s, i) => s + Number(i.withdrawals || 0), 0), 0);
    const inflowUSD = monthData.reduce((sum, day) => 
      sum + day.details.filter(d => d.entity.includes(entityKeyword) && checkIsUSD(d.account)).reduce((s, i) => s + Number(i.deposits || 0), 0), 0);
    const outflowUSD = monthData.reduce((sum, day) => 
      sum + day.details.filter(d => d.entity.includes(entityKeyword) && checkIsUSD(d.account)).reduce((s, i) => s + Number(i.withdrawals || 0), 0), 0);

    return {
      details: lastDetails,
      hasUSD,
      closingKRW,
      closingUSD,
      inflowKRW,
      outflowKRW,
      inflowUSD,
      outflowUSD,
      openingKRW,
      openingUSD
    };
  };

  const composeStats = getEntityStats('컴포즈');
  const smartStats = getEntityStats('스마트팩토리');

  // --- REPORT SUMMARY ALIGNMENT ---
  // We sum ONLY the entities displayed in this report to avoid confusion with global system data
  const monthlyInflow = composeStats.inflowKRW + smartStats.inflowKRW;
  const monthlyOutflow = composeStats.outflowKRW + smartStats.outflowKRW;
  const monthlyInflowUSD = composeStats.inflowUSD + smartStats.inflowUSD;
  const monthlyOutflowUSD = composeStats.outflowUSD + smartStats.outflowUSD;
  
  const netChange = monthlyInflow - monthlyOutflow;
  const netChangeUSD = monthlyInflowUSD - monthlyOutflowUSD;

  // 전체 요약용 합계 (기초/기말 잔액 포함)
  const openingKRWTotal = (composeStats.openingKRW + smartStats.openingKRW);
  const openingUSDTotal = (composeStats.openingUSD + smartStats.openingUSD);
  const closingKRWTotal = (composeStats.closingKRW + smartStats.closingKRW);
  const closingUSDTotal = (composeStats.closingUSD + smartStats.closingUSD);

  // --- 공식 보고서 스타일 테이블 컴포넌트 ---
  const ReportTable = ({ title, headers, children, footer }) => (
    <div className="mb-8 overflow-x-auto">
      <h3 className="text-sm font-black text-slate-900 mb-3 ml-1 flex items-center gap-2">
        {title}
      </h3>
      <table className="w-full text-[11px] border-collapse border border-slate-300">
        <thead className="bg-[#002060] text-white">
          <tr className="divide-x divide-slate-400">
            {headers.map((h, i) => (
              <th key={i} className={`px-2 py-1.5 font-bold border-b border-slate-400 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'}`} style={{ width: h.width }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {children}
        </tbody>
        {footer && (
          <tfoot className="bg-[#d9e1f2] font-black text-slate-800">
            {footer}
          </tfoot>
        )}
      </table>
      <div className="text-right mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">(단위: 원)</div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 bg-white p-10 shadow-sm border border-slate-200 max-w-5xl mx-auto my-8 print:shadow-none print:border-none print:p-0">
      {/* 리포트 헤더 */}
      <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">월간 자금 일보 ({monthName})</h1>
          <p className="text-xs text-slate-500 mt-1 font-bold">작성일: {recordDate} | 보고자: 재무본부</p>
        </div>
        <div className="flex gap-2 print:hidden italic text-[10px] text-slate-400">
            데이터 자동 산출 (비공식 리포트)
        </div>
      </div>

      {/* 1. 월 자금수지 마감 보고 요약 */}
      <section>
        <h2 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2 border-l-4 border-[#002060] pl-3">
          1. 월 자금수지 마감 보고 요약
        </h2>
        
        <ReportTable 
          title="1) 법인별 현금성 자산 잔액"
          headers={[
            { label: '구 분', width: '20%' },
            { label: '전 월 잔 액', align: 'right' },
            { label: '입 금', align: 'right' },
            { label: '출 금', align: 'right' },
            { label: '마 감 잔 액', align: 'right' },
            { label: '비 고', width: '15%' }
          ]}
          footer={
            <>
              <tr className="divide-x divide-slate-300">
                <td className="px-2 py-1.5 font-bold bg-slate-100/50">합계 (KRW/USD)</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  <div>{openingKRWTotal.toLocaleString()}</div>
                  {openingUSDTotal > 0 && <div className="text-blue-600 font-bold">{formatUSD(openingUSDTotal)}</div>}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  <div>{monthlyInflow.toLocaleString()}</div>
                  {monthlyInflowUSD > 0 && <div className="text-blue-600 font-bold">{formatUSD(monthlyInflowUSD)}</div>}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  <div>{monthlyOutflow.toLocaleString()}</div>
                  {monthlyOutflowUSD > 0 && <div className="text-red-500 font-bold">{formatUSD(monthlyOutflowUSD)}</div>}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">
                  <div>{closingKRWTotal.toLocaleString()}</div>
                  {closingUSDTotal > 0 && <div className="text-blue-600 font-black">{formatUSD(closingUSDTotal)}</div>}
                </td>
                <td className="px-2 py-1.5 text-center text-[9px] text-slate-400">Currency Breakdown</td>
              </tr>
              {closingUSDTotal > 0 && (
                <tr className="divide-x divide-slate-300 bg-indigo-50/50">
                  <td className="px-2 py-1.5 font-bold italic text-indigo-700">합계 (원화 환산액)</td>
                  <td className="px-2 py-1.5 text-right font-mono text-indigo-700">
                    {(openingKRWTotal + openingUSDTotal * exchangeRate).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-indigo-700">
                    {(monthlyInflow + monthlyInflowUSD * exchangeRate).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-indigo-700">
                    {(monthlyOutflow + monthlyOutflowUSD * exchangeRate).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-black text-indigo-900 bg-white border-2 border-indigo-200">
                    {(closingKRWTotal + closingUSDTotal * exchangeRate).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-[8px] text-indigo-400 font-bold text-center">Appx. Total KRW<br/>(Rate: {exchangeRate})</td>
                </tr>
              )}
              <tr className="bg-[#fce4d6] divide-x divide-slate-300">
                <td colSpan={4} className="px-2 py-1.5 text-center font-bold uppercase tracking-widest">당 월 순 증 감 액</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">
                  <div>{netChange.toLocaleString()}</div>
                  {netChangeUSD !== 0 && <div className="text-blue-600">{formatUSD(netChangeUSD)}</div>}
                </td>
                <td className="px-2 py-1.5"></td>
              </tr>
            </>
          }
        >
          <tr className="divide-x divide-slate-200 hover:bg-slate-50">
            <td className="px-2 py-1.5 font-bold">컴포즈커피</td>
            <td className="px-2 py-1.5 text-right font-mono text-[10px]">
              <div>{composeStats.openingKRW.toLocaleString()}</div>
              {composeStats.hasUSD && <div className="text-blue-600 font-bold">{formatUSD(composeStats.openingUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-[10px]">
              <div>{composeStats.inflowKRW.toLocaleString()}</div>
              {composeStats.hasUSD && <div className="text-blue-600 font-bold">{formatUSD(composeStats.inflowUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-red-500 text-[10px]">
              <div>{composeStats.outflowKRW.toLocaleString()}</div>
              {composeStats.hasUSD && <div className="text-red-400 font-bold">{formatUSD(composeStats.outflowUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono font-bold text-[10px]">
              <div>{composeStats.closingKRW.toLocaleString()}</div>
              {composeStats.hasUSD && <div className="text-blue-600 font-black">{formatUSD(composeStats.closingUSD)}</div>}
            </td>
            <td className="px-2 py-1.5"></td>
          </tr>
          <tr className="divide-x divide-slate-200 hover:bg-slate-50">
            <td className="px-2 py-1.5 font-bold">컴포즈커피스마트팩토리</td>
            <td className="px-2 py-1.5 text-right font-mono text-[10px]">
              <div>{smartStats.openingKRW.toLocaleString()}</div>
              {smartStats.hasUSD && <div className="text-blue-600 font-bold">{formatUSD(smartStats.openingUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-[10px]">
              <div>{smartStats.inflowKRW.toLocaleString()}</div>
              {smartStats.hasUSD && <div className="text-blue-600 font-bold">{formatUSD(smartStats.inflowUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-red-500 text-[10px]">
              <div>{smartStats.outflowKRW.toLocaleString()}</div>
              {smartStats.hasUSD && <div className="text-red-400 font-bold">{formatUSD(smartStats.outflowUSD)}</div>}
            </td>
            <td className="px-2 py-1.5 text-right font-mono font-bold text-[10px]">
              <div>{smartStats.closingKRW.toLocaleString()}</div>
              {smartStats.hasUSD && <div className="text-blue-600 font-black">{formatUSD(smartStats.closingUSD)}</div>}
            </td>
            <td className="px-2 py-1.5"></td>
          </tr>
        </ReportTable>
      </section>

      {/* 2. 법인별 계좌별 잔액 */}
      <section className="mt-12">
        <h2 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2 border-l-4 border-[#002060] pl-3">
          2. 법인별 계좌별 잔액 상세 (기말 시점)
        </h2>

        {lastStatus ? (
            <>
                <ReportTable 
                title="1) 컴포즈커피"
                headers={[
                    { label: 'no', width: '5%', align: 'center' },
                    { label: '은 행 명', width: '15%' },
                    { label: '계 좌 번 호', width: '25%' },
                    { label: '계 좌 별 칭', width: '25%' },
                    { label: '마감 잔 액', align: 'right', width: '18%' },
                    { label: '비 고' }
                ]}
                footer={
                    <tr className="divide-x divide-slate-300">
                    <td colSpan={4} className="px-2 py-1.5 text-center font-bold">소 계</td>
                    <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">
                      <div>{composeStats.closingKRW.toLocaleString()} 원</div>
                      {composeStats.hasUSD && <div className="text-blue-600 font-black">{formatUSD(composeStats.closingUSD)}</div>}
                    </td>
                    <td className="px-2 py-1.5"></td>
                    </tr>
                }
                >
                {composeStats.details.filter(d => Number(d.totalBalance || 0) !== 0).map((item, i) => (
                    <tr key={i} className="divide-x divide-slate-200">
                    <td className="px-2 py-1 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">{item.bank}</td>
                    <td className="px-2 py-1 font-mono text-slate-400">{item.account}</td>
                    <td className="px-2 py-1 font-black text-slate-700">{item.nickname || item.type || '-'}</td>
                    <td className="px-2 py-1 text-right font-mono font-bold">{checkIsUSD(item.account) ? formatUSD(item.totalBalance) : item.totalBalance.toLocaleString()}</td>
                    <td className="px-2 py-1 text-[9px] text-slate-400 italic">{checkIsUSD(item.account) ? item.currency : ''}</td>
                    </tr>
                ))}
                </ReportTable>

                <ReportTable 
                title="2) 컴포즈커피스마트팩토리"
                headers={[
                    { label: 'no', width: '5%', align: 'center' },
                    { label: '은 행 명', width: '15%' },
                    { label: '계 좌 번 호', width: '25%' },
                    { label: '계 좌 별 칭', width: '25%' },
                    { label: '마감 잔 액', align: 'right', width: '18%' },
                    { label: '비 고' }
                ]}
                footer={
                    <tr className="divide-x divide-slate-300">
                    <td colSpan={4} className="px-2 py-1.5 text-center font-bold">소 계</td>
                    <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">
                      <div>{smartStats.closingKRW.toLocaleString()} 원</div>
                      {smartStats.hasUSD && <div className="text-blue-600 font-black">{formatUSD(smartStats.closingUSD)}</div>}
                    </td>
                    <td className="px-2 py-1.5"></td>
                    </tr>
                }
                >
                {smartStats.details.filter(d => Number(d.totalBalance || 0) !== 0).map((item, i) => (
                    <tr key={i} className="divide-x divide-slate-200">
                    <td className="px-2 py-1 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">{item.bank}</td>
                    <td className="px-2 py-1 font-mono text-slate-400">{item.account}</td>
                    <td className="px-2 py-1 font-black text-slate-700">{item.nickname || item.type || '-'}</td>
                    <td className="px-2 py-1 text-right font-mono font-bold">{checkIsUSD(item.account) ? formatUSD(item.totalBalance) : item.totalBalance.toLocaleString()}</td>
                    <td className="px-2 py-1 text-[9px] text-slate-400 italic">{checkIsUSD(item.account) ? item.currency : ''}</td>
                    </tr>
                ))}
                </ReportTable>
            </>
        ) : (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                선택하신 월({monthName})의 마감 데이터가 존재하지 않습니다. <br/>
                [자금 시재 현황] 메뉴에서 엑셀을 업로드해 주세요.
            </div>
        )}
      </section>

      {/* 3. 인센티브 및 기타 보고 사항 */}
      <section className="mt-20 border-t pt-8">
          <p className="mt-4 text-center text-sm font-black text-slate-900 tracking-[0.5em] border-t-2 border-double pt-8 uppercase">
              끝.
          </p>
      </section>
    </div>
  );
};

export default MonthlyReportPage;
