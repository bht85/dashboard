import React, { useState, useEffect } from 'react';
import ExpenseSummaryBox from '../components/dashboard/ExpenseSummaryBox';
import FinancialTable from '../components/dashboard/FinancialTable';
import { calculateTotal, formatKRW, formatUSD, isExcludedAccount } from '../utils/formatters';
import { Wallet, TrendingUp, Building2, Factory, FileText, Globe, ChevronDown, ChevronUp, ListFilter } from 'lucide-react';

const DashboardPage = ({ selectedDate, composeAccounts: masterCompose, smartAccounts: masterSmart, fxSchedule, withdrawals = [], dailyStatuses = {}, dailyIssues = {}, onUpdateIssue, exchangeRate = 1520 }) => {
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // --- 마스터 계좌 기반 통화 판별 로직 (데이터 정합성 보장) ---
  const usdAccountSet = new Set([
    ...masterCompose.filter(a => a.isUSD).map(a => String(a.no).replace(/[\s-]/g, '')),
    ...masterSmart.filter(a => a.isUSD).map(a => String(a.no).replace(/[\s-]/g, ''))
  ]);

  const checkIsUSD = (accountNo) => {
    if (!accountNo) return false;
    return usdAccountSet.has(String(accountNo).replace(/[\s-]/g, ''));
  };
  
  // 1. 해당 날짜 또는 가장 최근 과거의 시재 현황 데이터 추출 (Running Balance 기반)
  const getBaseStatus = () => {
    // 1순위: 선택한 날짜의 확정 데이터가 있으면 그대로 사용
    if (dailyStatuses[selectedDate]) {
      return { status: dailyStatuses[selectedDate], isFinal: true, sourceDate: selectedDate };
    }
    
    // 2순위: 선택한 날짜 이전의 가장 최신 시재를 찾아 시작점으로 삼음 (Projection 모드)
    const pastDates = Object.keys(dailyStatuses)
      .filter(d => d < selectedDate)
      .sort((a, b) => b.localeCompare(a));
      
    if (pastDates.length > 0) {
      return { status: dailyStatuses[pastDates[0]], isFinal: false, sourceDate: pastDates[0] };
    }
    
    return { status: null, isFinal: false, sourceDate: null };
  };

  const { status: baseStatus, isFinal, sourceDate } = getBaseStatus();
  const statusDetails = (baseStatus?.details || []).filter(d => !isExcludedAccount(d));

  // 2. 현재 선택된 날짜의 지출 내역 필터링 (Projection 및 로우 데이터용)
  const dailyWithdrawals = withdrawals.filter(w => w.paymentDate === selectedDate);

  // 엑셀 데이터를 테이블 형식으로 매핑하는 헬퍼
  const mapStatusToAccount = (d) => {
    const isUSD = checkIsUSD(d.account);
    if (isFinal) {
      // 확정 리포트 모드: 업로드된 수치 그대로 표시
      return {
        id: d.id,
        no: d.account,
        type: d.bank,
        balance: d.prevBalance,
        withdraw: d.withdrawals,
        internal: d.deposits,
        final: d.totalBalance,
        isUSD,
        note: d.nickname || d.bank
      };
    } else {
      // 예측(Projection) 모드: 전일 종가 기반으로 오늘 지출 및 내부 유입 반영
      const accountWithdrawals = dailyWithdrawals.filter(w => String(w.fromAccount) === String(d.account));
      const todayWithdrawSum = accountWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      // 내부 입금(송입) 계산: 보낸 사람 계좌(account)가 현재 내 계좌(d.account)와 일치하는 내부 거래
      const accountInflows = dailyWithdrawals.filter(w => 
        String(w.account) === String(d.account) && 
        (w.payee.includes('컴포즈') || w.payee.includes('스마트팩토리') || w.isInternal)
      );
      const todayInflowSum = accountInflows.reduce((sum, w) => sum + w.amount, 0);
      
      return {
        id: d.id,
        no: d.account,
        type: d.bank,
        balance: d.totalBalance, // 전일 최종 잔액이 오늘의 시작 잔액
        withdraw: todayWithdrawSum,
        internal: todayInflowSum,
        final: d.totalBalance - todayWithdrawSum + todayInflowSum,
        isUSD,
        note: d.nickname || d.bank
      };
    }
  };

  // 법인별 데이터 필터링 및 매핑
  const composeAccounts = (statusDetails.length > 0 
    ? statusDetails.filter(d => d.entity.includes('컴포즈')).map(mapStatusToAccount)
    : masterCompose.filter(acc => !isExcludedAccount(acc)).map(a => ({ ...a, balance: 0, withdraw: 0, internal: 0, final: 0 }))
  ).filter(acc => acc.balance !== 0 || acc.withdraw !== 0 || acc.internal !== 0 || acc.final !== 0);

  const smartAccounts = (statusDetails.length > 0 
    ? statusDetails.filter(d => d.entity.includes('스마트')).map(mapStatusToAccount)
    : masterSmart.filter(acc => !isExcludedAccount(acc)).map(a => ({ ...a, balance: 0, withdraw: 0, internal: 0, final: 0 }))
  ).filter(acc => acc.balance !== 0 || acc.withdraw !== 0 || acc.internal !== 0 || acc.final !== 0);

  // 합계 계산
  const masterLists = { compose: masterCompose, smart: masterSmart };
  const composeTotal = calculateTotal(composeAccounts, masterLists);
  const smartTotal = calculateTotal(smartAccounts, masterLists);
  
  // 로우 데이터 필터링 (UI 하단 표시용)
  const composeWithdrawals = dailyWithdrawals.filter(w => w.section === '컴포즈커피');
  const smartWithdrawals = dailyWithdrawals.filter(w => w.section === '스마트팩토리');
  // 2. 내부 이체(내부 출금) 합계 계산 (회사 내부에서 도는 돈)
  const calculateSeparatedSums = (list) => {
    return list.reduce((acc, w) => {
      const isInternal = w.payee.includes('컴포즈') || w.payee.includes('스마트팩토리') || w.isInternal;
      if (w.isUSD) {
        acc.usdTotal += w.amount;
        if (isInternal) acc.usdInternal += w.amount;
      } else {
        acc.krwTotal += w.amount;
        if (isInternal) acc.krwInternal += w.amount;
      }
      return acc;
    }, { krwTotal: 0, usdTotal: 0, krwInternal: 0, usdInternal: 0 });
  };
  
  const composeSums = calculateSeparatedSums(composeWithdrawals);
  const smartSums = calculateSeparatedSums(smartWithdrawals);

  // 3. 외화 송금 합계 계산 (송금 완료되지 않은 '송금 예정' 건만 합산)
  const pendingFXSchedules = fxSchedule.filter(item => item.status === '송금 예정');
  const usdTotal = pendingFXSchedules.reduce((sum, item) => sum + item.amount, 0);
  const krwEquivalent = usdTotal * exchangeRate;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* 1. 웹 전용 화면 (인쇄 시 숨김) */}
      <div className="print-hide space-y-8">
        {/* 인쇄 전용 헤더 (Legacy - now in PrintReport) */}
        <div className="hidden mb-10 border-b-2 border-slate-900 pb-6">
          {/* ... */}
        </div>

        {/* 상단 요약 바 */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">총 가용 자산</p>
              <h4 className="text-xl font-bold text-slate-800 tracking-tighter tabular-nums whitespace-nowrap">{formatKRW(composeTotal.krw.final + smartTotal.krw.final)}</h4>
              {(composeTotal.usd.final + smartTotal.usd.final) > 0 && (
                <p className="text-[11px] font-black text-blue-600 font-mono mt-0.5 tabular-nums animate-in fade-in slide-in-from-top-1">
                  {formatUSD(composeTotal.usd.final + smartTotal.usd.final)} (USD)
                </p>
              )}
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Wallet className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">금일 지출 (자금일보 기준)</p>
              <h4 className="text-xl font-bold text-red-500 tracking-tighter tabular-nums whitespace-nowrap">{formatKRW(composeSums.krwTotal + smartSums.krwTotal)}</h4>
              {(composeSums.usdTotal + smartSums.usdTotal) > 0 && (
                <p className="text-[11px] font-black text-blue-600 font-mono mt-0.5 tabular-nums">
                  {formatUSD(composeSums.usdTotal + smartSums.usdTotal)} (USD)
                </p>
              )}
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><TrendingUp className="w-6 h-6" /></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl flex items-center justify-between col-span-1 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Globe className="w-24 h-24 text-white" /></div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">외화 송금 대기 (USD)</p>
              <h4 className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">{formatUSD(usdTotal)}</h4>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400">Rate: {formatKRW(exchangeRate)}</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">환전 필요 예상액</p>
              </div>
              <h4 className="text-2xl font-bold text-amber-400 font-mono tracking-tighter">약 {(krwEquivalent / 100000000).toFixed(1)} 억원</h4>
            </div>
          </div>
        </section>

        {/* 주요 이슈 사항 메모 */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 금일 주요 이슈 사항
            </h3>
            <span className="text-[10px] text-amber-500 font-bold bg-amber-100/50 px-2 py-0.5 rounded italic">작성 후 입력창 밖을 클릭하면 자동 저장됩니다.</span>
          </div>
          <textarea 
            key={selectedDate} // 날짜 변경 시 로컬 상태 초기화 강제
            defaultValue={dailyIssues[selectedDate] || ''} 
            onBlur={(e) => onUpdateIssue(selectedDate, e.target.value)}
            placeholder="오늘의 특이사항이나 자금 흐름에 관한 주요 이슈를 기록하세요. (예: 정기예금 만기, 법인세 납부 등)" 
            className="w-full h-24 bg-white/60 border border-amber-200 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none shadow-inner"
          />
        </section>

        {/* 1. 컴포즈커피 섹션 */}
        <section>
          <FinancialTable 
            title={`1. 컴포즈커피 계좌 현황 (${isFinal ? '확정 리포트' : `기초 잔액: ${sourceDate || '없음'} 기반 예측치`})`} 
            accounts={composeAccounts} 
            totals={composeTotal} 
            icon={Building2} 
          />
          {composeAccounts.length === 0 && !isFinal && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center mb-6">
              <p className="text-slate-400 font-bold mb-2">시재 확정 내역이 없어 현재 실시간 대시보드가 활성화되지 않았습니다.</p>
              <p className="text-xs text-slate-300">[자금 시재 현황] 메뉴에서 전일 최종 시재를 업로드하시면 실시간 잔액 예측이 시작됩니다.</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ExpenseSummaryBox 
                title="> 금일 출금 요청 (컴포즈)" 
                data={{ 
                  count: composeWithdrawals.length, 
                  sums: composeSums
                }} 
              />
            </div>
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-center">
              <h4 className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 opacity-70" /> {isFinal ? '업로드된 세부 내역' : '금일 예정 지출 상세'}
              </h4>
              {composeWithdrawals.length > 0 ? (
                <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '310px' }}>
                  {composeWithdrawals.map((w, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex justify-between items-center text-[12px] shadow-sm hover:border-indigo-200 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{w.payee}</p>
                        <p className="text-slate-500 mt-0.5 text-[10px] italic">{w.withdrawLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-red-500 text-[15px] tabular-nums leading-none">{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium italic opacity-80">{w.bank} {w.account}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                  해당 날짜에 등록된 지출 내역이 없습니다.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. 스마트팩토리 섹션 */}
        <section>
          <FinancialTable 
            title={`2. 스마트팩토리 계좌 현황 (${isFinal ? '확정 리포트' : `기초 잔액: ${sourceDate || '없음'} 기반 예측치`})`} 
            accounts={smartAccounts} 
            totals={smartTotal} 
            icon={Factory} 
          />
          {smartAccounts.length === 0 && !isFinal && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center mb-6">
              <p className="text-slate-400 font-bold mb-2">시재 확정 내역이 없어 현재 실시간 대시보드가 활성화되지 않았습니다.</p>
              <p className="text-xs text-slate-300">[자금 시재 현황] 메뉴에서 전일 최종 시재를 업로드하시면 실시간 잔액 예측이 시작됩니다.</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ExpenseSummaryBox 
                title="> 금일 지출 (스마트팩토리)" 
                data={{ 
                  count: smartWithdrawals.length, 
                  sums: smartSums
                }} 
              />
            </div>
            
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
              <h4 className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 opacity-70" /> {isFinal ? '업로드된 세부 내역' : '금일 예정 지출 상세'}
              </h4>
              {smartWithdrawals.length > 0 ? (
                <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '310px' }}>
                  {smartWithdrawals.map((w, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex justify-between items-center text-[12px] shadow-sm hover:border-emerald-200 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{w.payee}</p>
                        <p className="text-slate-500 mt-0.5 text-[10px] italic">{w.withdrawLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-red-500 text-[14px] tabular-nums leading-none">{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}</p>
                        <p className="text-[8px] text-slate-400 mt-1 font-medium italic truncate max-w-[110px] opacity-80">{w.bank} {w.account}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex items-center justify-center text-slate-400 text-xs italic flex-1">
                  등록된 지출 내역이 없습니다.
                </div>
              )}
            </div>

            <div className="lg:col-span-1 bg-[#0f172a] text-white rounded-lg p-5 flex flex-col justify-center">
              <h4 className="text-xs font-bold text-emerald-400 mb-4 flex items-center gap-2">기타 외화 요약</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">송금 예정 총액</span>
                  <span className="font-mono font-bold text-emerald-400">{formatUSD(usdTotal)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">필요 외화 (KRW 환산)</span>
                  <span className="font-mono font-bold text-amber-400">{formatKRW(krwEquivalent)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="font-bold">합계 (예상)</span>
                  <span className="font-mono font-black text-amber-500">{formatKRW(krwEquivalent)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 외화 송금 일정 */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
           <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-[13px]">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Globe className="w-4 h-4 text-blue-500" /> 외화 송금 예정 일정 (스마트팩토리_생두)
             </h3>
             <span className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-bold">TOTAL: {fxSchedule.length}건</span>
           </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse bg-white">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-100/50">지급예정일</th>
                    <th className="px-4 py-3 border-r border-slate-100/50">거래처</th>
                    <th className="px-4 py-3 border-r border-slate-100/50 text-right">금액 (USD)</th>
                    <th className="px-4 py-3 border-r border-slate-100/50 text-center">은행명</th>
                    <th className="px-4 py-3 border-r border-slate-100/50">내용</th>
                    <th className="px-4 py-3">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {fxSchedule.filter(s => s.date === selectedDate).map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors duration-150 bg-blue-50/10">
                      <td className="px-4 py-2.5 border-r border-slate-100/50 font-black text-blue-600">{s.date} (오늘)</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 font-bold text-slate-700">{s.client}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-right font-mono font-bold text-blue-600 tabular-nums">{formatUSD(s.amount)}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-center text-xs font-semibold">{s.bank}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-[11px] text-slate-400 leading-tight">{s.desc}</td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{s.status}</span></td>
                    </tr>
                  ))}
                  {fxSchedule.filter(s => s.date !== selectedDate).length > 0 && (
                    <>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-0 py-0">
                          <button 
                            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                            className="w-full px-4 py-2.5 flex items-center justify-between group hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-4">
                              {isScheduleOpen ? '미래 송금 일정 숨기기' : `미래 송금 일정 보기 (${fxSchedule.filter(s => s.date !== selectedDate).length}건)`}
                            </span>
                            {isScheduleOpen ? <ChevronUp className="w-4 h-4 text-slate-300 pr-4" /> : <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 pr-4" />}
                          </button>
                        </td>
                      </tr>
                      {isScheduleOpen && fxSchedule.filter(s => s.date !== selectedDate).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 py-2.5 border-r border-slate-100/50 font-medium text-slate-400">{s.date}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100/50 font-bold text-slate-700">{s.client}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100/50 text-right font-mono font-bold text-slate-400 tabular-nums">{formatUSD(s.amount)}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100/50 text-center text-xs font-semibold text-slate-400">{s.bank}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100/50 text-[11px] text-slate-400 leading-tight">{s.desc}</td>
                          <td className="px-4 py-2.5"><span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded border border-slate-100">{s.status}</span></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
        </section>

        {/* 4. 지출 요청 로우 데이터 */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all">
          <button 
            onClick={() => setIsRawDataOpen(!isRawDataOpen)}
            className="w-full px-5 py-4 bg-slate-900 text-white flex justify-between items-center group active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg transition-colors ${isRawDataOpen ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                <ListFilter className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm tracking-tight">금일 출금 요청 로우 데이터</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Total {dailyWithdrawals.length} items for {selectedDate}</p>
              </div>
            </div>
            {isRawDataOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {isRawDataOpen && (
            <div className="animate-in slide-in-from-top-2 duration-300 overflow-x-auto">
              <table className="w-full text-left text-[10.5px] border-collapse bg-white leading-tight">
                <thead className="bg-[#f8fafc] text-[#64748b] font-black border-b border-slate-200 uppercase tracking-tighter">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-100">지급일</th>
                    <th className="px-4 py-3 border-r border-slate-100">법인</th>
                    <th className="px-4 py-3 border-r border-slate-100">출금계좌</th>
                     <th className="px-4 py-3 border-r border-slate-100">입금은행</th>
                    <th className="px-4 py-3 border-r border-slate-100">입금계좌번호</th>
                    <th className="px-4 py-3 border-r border-slate-100 text-right">금액</th>
                    <th className="px-4 py-3 border-r border-slate-100">예금주(구분)</th>
                    <th className="px-4 py-3">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {dailyWithdrawals.length > 0 ? dailyWithdrawals.flatMap(w => {
                    const isInternal = w.payee.includes('컴포즈') || w.payee.includes('스마트팩토리') || w.isInternal;
                    const rows = [];
                    
                    // 1. 출금 기록 (항상 표시)
                    rows.push(
                      <tr key={w.id} className={`transition-colors border-l-4 ${isInternal ? 'bg-indigo-50/30 border-l-indigo-400' : 'hover:bg-slate-50 border-l-transparent'}`}>
                          <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-400 whitespace-nowrap">{w.paymentDate}</td>
                          <td className="px-3 py-2 border-r border-slate-100">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter break-keep whitespace-nowrap ${w.section === '컴포즈커피' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {w.section}
                          </span>
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-600 whitespace-nowrap">{w.fromAccount}</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-black text-slate-700 text-center">{w.bank}</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-400 whitespace-nowrap tracking-tighter">{w.account}</td>
                          <td className={`px-3 py-2 border-r border-slate-100 text-right font-black tabular-nums whitespace-nowrap text-red-500`}>
                              -{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100 min-w-[140px]">
                              <div className="flex flex-col">
                                  <span className="font-black text-slate-800 tracking-tight leading-none break-keep">{w.payee}</span>
                                  {isInternal && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-1 whitespace-nowrap">★ 내부 자금 이체 (출금)</span>}
                              </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-[10px] italic truncate max-w-[120px]">{w.memo}</td>
                      </tr>
                    );

                    // 2. 내부 입금 기록 (입금 받는 계좌 입장에서 가상 행 생성)
                    if (isInternal) {
                      rows.push(
                        <tr key={`${w.id}_dep`} className="bg-blue-50/30 border-l-4 border-l-blue-400 transition-colors">
                            <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-400 whitespace-nowrap">{w.paymentDate}</td>
                            <td className="px-3 py-2 border-r border-slate-100">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter bg-blue-100 text-blue-700 uppercase">INTERNAL</span>
                            </td>
                            <td className="px-3 py-2 border-r border-slate-100 font-bold text-blue-600 whitespace-nowrap bg-blue-50/50">{w.account}</td>
                            <td className="px-3 py-2 border-r border-slate-100 font-black text-slate-700 text-center">-</td>
                            <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-400 whitespace-nowrap tracking-tighter">{w.fromAccount}</td>
                             <td className="px-3 py-2 border-r border-slate-100 text-right font-black tabular-nums whitespace-nowrap text-blue-600">
                                 +{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                             </td>
                            <td className="px-3 py-2 border-r border-slate-100 min-w-[140px]">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-800 tracking-tight leading-none break-keep">{w.payee}</span>
                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter mt-1 whitespace-nowrap">★ 내부 자금 이체 (입금)</span>
                                </div>
                            </td>
                            <td className="px-3 py-2 text-slate-400 text-[10px] italic truncate max-w-[120px]">{w.memo}</td>
                        </tr>
                      );
                    }
                    
                    return rows;
                  }) : (
                    <tr><td colSpan={8} className="px-4 py-8 text-center italic text-slate-300">데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

    </div>
  );
};

export default DashboardPage;
