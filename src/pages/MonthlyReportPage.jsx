import React from 'react';
import { formatKRW } from '../utils/formatters';
import { Download, Printer } from 'lucide-react';

const MonthlyReportPage = ({ recordDate = "2026-03-24", dailyStatuses = {}, exchangeRate = 1 }) => {
  // --- 데이터 연동 로직 ---
  const currentMonth = recordDate.substring(0, 7); // "2026-03"
  const monthName = parseInt(currentMonth.split('-')[1]) + "월";
  
  const monthData = Object.keys(dailyStatuses)
    .filter(date => date.startsWith(currentMonth))
    .sort()
    .map(date => ({ date, ...dailyStatuses[date] }));

  const monthlyInflow = monthData.reduce((sum, d) => sum + (d.inflow || 0), 0);
  const monthlyOutflow = monthData.reduce((sum, d) => sum + (d.outflow || 0), 0);
  const netChange = monthlyInflow - monthlyOutflow;
  const lastStatus = monthData.length > 0 ? monthData[monthData.length - 1] : null;

  // 법인별 집계 (상세 내역이 있을 경우)
  const composeData = lastStatus?.details?.filter(d => d.entity.includes('컴포즈커피') && !d.entity.includes('소계')) || [];
  const smartData = lastStatus?.details?.filter(d => d.entity.includes('스마트팩토리')) || [];

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
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">자금 수지 마감 보고 요약 ({monthName})</h1>
          <p className="text-xs text-slate-500 mt-1 font-bold">작성일: {recordDate} | 보고자: 재무본부</p>
        </div>
        <div className="flex gap-2 print:hidden">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
                <Printer className="w-4 h-4" /> 인쇄하기
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                <Download className="w-4 h-4" /> 엑셀 다운로드
            </button>
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
                <td className="px-2 py-1.5 font-bold">합계 (내부이체 제외)</td>
                <td className="px-2 py-1.5 text-right font-mono">{(lastStatus?.totalBalance - netChange || 0).toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono">{monthlyInflow.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono">{monthlyOutflow.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">{(lastStatus?.totalBalance || 0).toLocaleString()}</td>
                <td className="px-2 py-1.5"></td>
              </tr>
              <tr className="bg-[#fce4d6] divide-x divide-slate-300">
                <td colSpan={4} className="px-2 py-1.5 text-center font-bold">당 월 순 증 감 액</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">{netChange.toLocaleString()}</td>
                <td className="px-2 py-1.5"></td>
              </tr>
            </>
          }
        >
          <tr className="divide-x divide-slate-200 hover:bg-slate-50">
            <td className="px-2 py-1.5 font-bold">컴포즈커피</td>
            <td className="px-2 py-1.5 text-right font-mono">{(composeData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0) - composeData.reduce((s,i) => s + (i.deposits - i.withdrawals) * (i.currency === 'USD' ? exchangeRate : 1), 0)).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono">{composeData.reduce((s,i) => s + i.deposits * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono text-red-500">{composeData.reduce((s,i) => s + i.withdrawals * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono font-bold">{composeData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
            <td className="px-2 py-1.5"></td>
          </tr>
          <tr className="divide-x divide-slate-200 hover:bg-slate-50">
            <td className="px-2 py-1.5 font-bold">컴포즈커피스마트팩토리</td>
            <td className="px-2 py-1.5 text-right font-mono">{(smartData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0) - smartData.reduce((s,i) => s + (i.deposits - i.withdrawals) * (i.currency === 'USD' ? exchangeRate : 1), 0)).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono">{smartData.reduce((s,i) => s + i.deposits * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono text-red-500">{smartData.reduce((s,i) => s + i.withdrawals * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
            <td className="px-2 py-1.5 text-right font-mono font-bold">{smartData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
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
                    <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">{composeData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
                    <td className="px-2 py-1.5"></td>
                    </tr>
                }
                >
                {composeData.map((item, i) => (
                    <tr key={i} className="divide-x divide-slate-200">
                    <td className="px-2 py-1 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">{item.bank}</td>
                    <td className="px-2 py-1 font-mono text-slate-400">{item.account}</td>
                    <td className="px-2 py-1">{item.nickname}</td>
                    <td className="px-2 py-1 text-right font-mono font-bold">{item.totalBalance.toLocaleString()}</td>
                    <td className="px-2 py-1 text-[9px] text-slate-400 italic">{item.currency !== 'KRW' ? item.currency : ''}</td>
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
                    <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-red-500 bg-white">{smartData.reduce((s,i) => s + i.totalBalance * (i.currency === 'USD' ? exchangeRate : 1), 0).toLocaleString()}</td>
                    <td className="px-2 py-1.5"></td>
                    </tr>
                }
                >
                {smartData.map((item, i) => (
                    <tr key={i} className="divide-x divide-slate-200">
                    <td className="px-2 py-1 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-2 py-1">{item.bank}</td>
                    <td className="px-2 py-1 font-mono text-slate-400">{item.account}</td>
                    <td className="px-2 py-1">{item.nickname}</td>
                    <td className="px-2 py-1 text-right font-mono font-bold">{item.totalBalance.toLocaleString()}</td>
                    <td className="px-2 py-1 text-[9px] text-slate-400 italic">{item.currency !== 'KRW' ? item.currency : ''}</td>
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
