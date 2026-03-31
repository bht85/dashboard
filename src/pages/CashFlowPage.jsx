import React, { useState } from 'react';
import { Calendar, Layers, Building2, Factory } from 'lucide-react';
import { formatKRW } from '../utils/formatters';

const CashFlowPage = ({ cashFlowSchedules, fxSchedule, exchangeRate, dailyStatuses = {}, withdrawals = [] }) => {
  const [boardEntity, setBoardEntity] = useState('TOTAL');

  // 기존 외화결제 일정을 합산해서 리스트로 만들기 (계산 기준용)
  const mergedSchedules = [
    ...cashFlowSchedules,
    ...fxSchedule
      .filter((fx) => fx.status !== '송금 완료(집행)')
      .map((fx) => ({
        id: `fx_${fx.id}`,
        date: fx.date,
        type: 'OUTFLOW',
        category: '외화송금(생두)',
        amount: fx.amount * exchangeRate,
        currency: 'USD',
        originalAmount: fx.amount,
        entity: '스마트팩토리',
        desc: `${fx.client} - ${fx.desc}`,
        isReadOnly: true,
      }))
  ].sort((a, b) => (new Date(a.date) - new Date(b.date)));

  // === [월별 자금 수지 요약 알고리즘] ===
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayStr = today.toISOString().split('T')[0];
  const months = [];
  
  // 1월부터 12월까지 연간 대시보드 표시
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yyyyMM = `${year}-${month}`;
    months.push({
      id: yyyyMM,
      label: `${i + 1}월`,
      isPast: i < currentMonth,
      isCurrent: i === currentMonth,
      isFuture: i > currentMonth
    });
  }

  const getEntityMatch = (entityStr) => {
    if (boardEntity === 'TOTAL') return true;
    if (boardEntity === 'COMPOSE') return entityStr && entityStr.includes('컴포즈');
    if (boardEntity === 'SMART') return entityStr && entityStr.includes('스마트');
    return false;
  };

  const boardData = [];
  let runningBalance = 0; // 이월 잔액용

  for (let m of months) {
    let base = 0, inflow = 0, outflowGen = 0, outflowSpec = 0;
    
    // 1. Act (실적) 데이터 축적: 해당 월에 속하는 dailyStatuses 추출
    const daysInMonth = Object.keys(dailyStatuses).filter(d => d.startsWith(m.id)).sort();
    
    if (daysInMonth.length > 0) {
      // Act 누적 입출금 계산
      for (const day of daysInMonth) {
         const details = dailyStatuses[day].details || [];
         for (const det of details) {
           if (getEntityMatch(det.entity)) {
             // 원화 환산 가정 (혹은 이미 KRW 통계만 주로 보는 로직)
             // 여기서 USD의 경우 이미 KRW/USD 환산 없이 수치만 존재할 수 있으므로, formatKRW로 보여줄때 유의해야함
             const rate = det.currency === 'USD' ? exchangeRate : 1; 
             inflow += (det.deposits || 0) * rate;
             outflowGen += (det.withdrawals || 0) * rate; // 과거 실적은 기본적으로 일반 출금으로 뭉침
           }
         }
      }
      // 기말 잔액은 그 달의 마지막 기록 기준
      let ebal = 0;
      const lastDayDetails = dailyStatuses[daysInMonth[daysInMonth.length - 1]].details || [];
      for (const det of lastDayDetails) {
         if (getEntityMatch(det.entity)) {
             const rate = det.currency === 'USD' ? exchangeRate : 1;
             ebal += (det.totalBalance || 0) * rate;
         }
      }
      base = ebal - inflow + outflowGen; // 역산(기초)
      runningBalance = ebal; 
    } else if (m.isPast) {
      base = runningBalance;
    } else if (m.isFuture) {
      base = runningBalance; // 앞달의 기말잔액 인계
    }

    // 2. Plan (추정) 데이터 더하기: 현재 달이거나 미래 달인 경우, 남은 스케줄을 처리
    if (m.isCurrent || m.isFuture) {
      // 해당 월의 계획 데이터 중 (현재달이면 오늘 이후 것만, 미래달이면 전체)
      const isTodayOrLater = (dateStr) => {
          if (m.isFuture) return true;
          return dateStr >= todayStr;
      };

      const planItems = mergedSchedules.filter(s => s.date.startsWith(m.id) && isTodayOrLater(s.date) && getEntityMatch(s.entity));
      
      let planIn = 0, planOutGen = 0, planOutSpec = 0;
      for (const item of planItems) {
         // USD 스케줄(외화송금)은 원래 통화로 되어있으므로 KRW 환산 값 사용(item.amount는 이미 환산됨)
         let amt = item.amount;
         if (item.type === 'INFLOW') {
           planIn += amt;
         } else {
           // 특수 분류 기준 키워드 검사 (외화, 생두, 법인세, 배당금 등)
           const isSpecial = ['외화', '생두', '배당', '유상감자', '법인세'].some(k => item.category?.includes(k) || item.desc?.includes(k));
           if (isSpecial) planOutSpec += amt;
           else planOutGen += amt;
         }
      }
      
      inflow += planIn;
      outflowGen += planOutGen;
      outflowSpec += planOutSpec;
      
      if (m.isFuture) {
        runningBalance = base + inflow - outflowGen - outflowSpec;
      } else if (m.isCurrent) {
        // 당월의 경우, (현재까지의 Actual 기말잔액) + 남은 달의 Plan 합산
        runningBalance = runningBalance + planIn - planOutGen - planOutSpec;
      }
    }

    boardData.push({
      ...m,
      statusLabel: m.isPast ? 'Act' : (m.isCurrent ? 'Act & Plan' : 'Plan'),
      base,
      inflow,
      outflowGen,
      outflowSpec,
      endBalance: runningBalance
    });
  }
  // === [/월별 자금 수지 요약 알고리즘] ===

  const formatThousands = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return '0';
    return Math.round(val / 1000).toLocaleString();
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" /> 자금 흐름 추정 (Cash Flow Projection)
        </h2>
        <p className="text-sm text-slate-500">
          과거의 실적(Act)과 미래의 예상 일정(Plan)을 결합하여 잔고 추이를 시뮬레이션합니다. (단위: 천원, 외화환산적용)
        </p>
      </div>

      {/* --- 월별 요약 보드 시작 --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 animate-in slide-in-from-bottom-2">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> 입금/출금/잔액 요약 보드
          </h3>
          
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            <button 
                onClick={() => setBoardEntity('TOTAL')}
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${boardEntity === 'TOTAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >통합 (컴포즈+스마트)</button>
            <button 
                onClick={() => setBoardEntity('COMPOSE')}
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${boardEntity === 'COMPOSE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Building2 className="w-3.5 h-3.5" /> 컴포즈
            </button>
            <button 
                onClick={() => setBoardEntity('SMART')}
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${boardEntity === 'SMART' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Factory className="w-3.5 h-3.5" /> 스마트
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11.5px] border-collapse bg-white">
            <thead className="text-[10px] font-black tracking-widest uppercase">
              {/* 상단 라벨 (Act vs Plan) */}
              <tr className="bg-slate-100 text-slate-400 border-b border-slate-200">
                <th className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-left">구분</th>
                {boardData.map(m => (
                  <th key={`h1-${m.id}`} className={`px-4 py-2 border-r border-slate-200 text-center ${m.isCurrent ? 'bg-indigo-50/50 text-indigo-500' : ''}`}>
                    {m.statusLabel}
                  </th>
                ))}
              </tr>
              {/* 월 라벨 */}
              <tr className="bg-slate-50 text-slate-700 border-b-2 border-slate-300">
                <th className="px-4 py-3 border-r border-slate-200 text-left">항목</th>
                {boardData.map(m => (
                  <th key={`h2-${m.id}`} className={`px-4 py-3 border-r border-slate-200 text-center font-black ${m.isCurrent ? 'bg-indigo-50/30' : ''}`}>
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {/* 기초 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200 text-left font-bold text-slate-800 bg-slate-50 whitespace-nowrap">기초 잔액</td>
                {boardData.map(m => (
                  <td key={`base-${m.id}`} className={`px-4 py-3 border-r border-slate-200 tabular-nums whitespace-nowrap ${m.isCurrent ? 'bg-indigo-50/10' : ''}`}>
                    {formatThousands(m.base)}
                  </td>
                ))}
              </tr>
              {/* 입금 */}
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200 text-left font-bold text-blue-800 bg-blue-50/50 whitespace-nowrap">입금</td>
                {boardData.map(m => (
                  <td key={`in-${m.id}`} className={`px-4 py-3 border-r border-slate-200 tabular-nums text-blue-600 whitespace-nowrap ${m.isCurrent ? 'bg-indigo-50/10' : ''}`}>
                    +{formatThousands(m.inflow)}
                  </td>
                ))}
              </tr>
              {/* 출금 (일반) */}
              <tr className="hover:bg-red-50/30 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200 text-left font-bold text-red-800 bg-red-50/50 whitespace-nowrap">출금 (일반)</td>
                {boardData.map(m => (
                  <td key={`outg-${m.id}`} className={`px-4 py-3 border-r border-slate-200 tabular-nums text-red-500 whitespace-nowrap ${m.isCurrent ? 'bg-indigo-50/10' : ''}`}>
                    -{formatThousands(m.outflowGen)}
                  </td>
                ))}
              </tr>
              {/* 출금 (특수) */}
              <tr className="hover:bg-amber-50/30 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200 text-left font-bold text-amber-800 bg-amber-50/50 flex items-center justify-between whitespace-nowrap">
                  <span>출금 (특수)</span>
                  <span className="text-[8px] font-medium text-amber-500 ml-2">생두/세금/배당</span>
                </td>
                {boardData.map(m => (
                  <td key={`outs-${m.id}`} className={`px-4 py-3 border-r border-slate-200 tabular-nums text-amber-600 whitespace-nowrap ${m.isCurrent ? 'bg-indigo-50/10' : ''}`}>
                    -{formatThousands(m.outflowSpec)}
                  </td>
                ))}
              </tr>
              {/* 잔액 */}
              <tr className="hover:bg-slate-100 bg-slate-50 transition-colors font-black">
                <td className="px-4 py-3.5 border-r border-slate-300 text-left text-slate-900 border-t-2 whitespace-nowrap">최종 예상(실제) 잔액</td>
                {boardData.map(m => (
                  <td key={`end-${m.id}`} className={`px-4 py-3.5 border-r border-slate-200 tabular-nums text-slate-900 border-t-2 whitespace-nowrap ${m.endBalance < 0 ? 'text-red-500 bg-red-50' : ''} ${m.isCurrent ? 'bg-indigo-50/50 text-indigo-600' : ''}`}>
                    {formatThousands(m.endBalance)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* --- 월별 요약 보드 끝 --- */}
    </div>
  );
};

export default CashFlowPage;
