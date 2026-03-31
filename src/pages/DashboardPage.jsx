import React, { useState, useEffect } from 'react';
import ExpenseSummaryBox from '../components/dashboard/ExpenseSummaryBox';
import FinancialTable from '../components/dashboard/FinancialTable';
import PrintReport from '../components/dashboard/PrintReport';
import { calculateTotal, formatKRW, formatUSD, isExcludedAccount } from '../utils/formatters';
import { Wallet, TrendingUp, Building2, Factory, FileText, Globe, ChevronDown, ChevronUp, ListFilter, ArrowRight, Printer } from 'lucide-react';

const DashboardPage = ({ selectedDate, composeAccounts: masterCompose, smartAccounts: masterSmart, fxSchedule, withdrawals = [], dailyStatuses = {}, dailyIssues = {}, onUpdateIssue, exchangeRate = 1520 }) => {
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // --- 마스터 계좌 기반 통화 판별 로직 (데이터 정합성 보장) ---
  const usdAccountSet = new Set([
    ...masterCompose.filter(a => a.isUSD).map(a => String(a.no).replace(/[^0-9]/g, '')),
    ...masterSmart.filter(a => a.isUSD).map(a => String(a.no).replace(/[^0-9]/g, ''))
  ]);

  const checkIsUSD = (accountNo) => {
    if (!accountNo) return false;
    return usdAccountSet.has(String(accountNo).replace(/[^0-9]/g, ''));
  };

  // --- 모든 자사 계좌번호 Set 정규화 (보안 및 정합성 강화) ---
  const allCompanyAccounts = new Set([
    ...masterCompose.map(a => String(a.no || '').replace(/[^0-9]/g, '')),
    ...masterSmart.map(a => String(a.no || '').replace(/[^0-9]/g, ''))
  ]);

  // 내부 이체 여부 판별 로직 고도화
  const checkIsInternal = (w) => {
    // 1. 명시적 플래그가 있으면 즉시 반환
    if (w.isInternal) return true;
    
    // 2. 출금/입금 계좌 번호 추출 및 정규화
    const toAccount = String(w.account || w.toAccount || '').replace(/[^0-9]/g, '');
    if (!toAccount) return false;

    // 3. 우리 회사의 마스터 계좌 리스트에 존재하는지 확인
    const isOurAccount = allCompanyAccounts.has(toAccount);
    
    // 4. 예금주명 검증 (완전 일치 또는 공식 법인명 변형만 허용)
    // "박석회(컴포즈커피)" 같은 가맹점주 거래를 내부이체로 오판하지 않도록 정확도 향상
    const internalPayeePatterns = [
      '컴포즈커피', '스마트팩토리', '제이엠씨에프티', '컴포즈커피스마트', '컴포즈커피스마트팩토리',
      '주식회사컴포즈커피', '주식회사스마트팩토리', '주식회사제이엠씨에프티', '주식회사컴포즈커피스마트', '주식회사컴포즈커피스마트팩토리',
      '컴포즈커피(주)', '스마트팩토리(주)', '제이엠씨에프티(주)', '컴포즈커피스마트(주)', '컴포즈커피스마트팩토리(주)'
    ];
    
    // (주) 등의 괄호와 공백을 모두 제거하고 핵심어 위주로 비교하여 판별력 강화
    const cleanPayee = String(w.payee || '').replace(/[\s()주식회사]/g, ''); 
    const isInternalPayee = internalPayeePatterns.some(p => p.replace(/[\s()주식회사]/g, '') === cleanPayee);
    
    return isOurAccount && isInternalPayee;
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

  // --- 계좌 중복 제거 로직 (동일 계좌번호가 여러 행일 경우 합산) ---
  const deduplicatedStatusDetails = Object.values(statusDetails.reduce((acc, d) => {
    const key = String(d.account).replace(/[^0-9]/g, '');
    if (!acc[key]) {
      acc[key] = { ...d };
    } else {
      // 이미 존재하는 계좌면 잔액 및 입출금액 합산
      acc[key].totalBalance = (acc[key].totalBalance || 0) + (d.totalBalance || 0);
      acc[key].prevBalance = (acc[key].prevBalance || 0) + (d.prevBalance || 0);
      acc[key].deposits = (acc[key].deposits || 0) + (d.deposits || 0);
      acc[key].withdrawals = (acc[key].withdrawals || 0) + (d.withdrawals || 0);
    }
    return acc;
  }, {}));

  // 2. 현재 선택된 날짜의 지출 내역 필터링 (Projection 및 로우 데이터용)
  const dailyWithdrawals = withdrawals.filter(w => w.paymentDate === selectedDate);

  // 엑셀 데이터를 테이블 형식으로 매핑하는 헬퍼
  const mapStatusToAccount = (d) => {
    const isUSD = checkIsUSD(d.account);
    if (isFinal) {
      // 확정 리포트 모드: 업로드된 수치 그대로 표시. 
      // 만약 엑셀 양식 문제로 입출금액이 0이지만 잔액이 변동되었다면 차액을 통해 입출금액을 역산하여 보정 (외화 계좌 대응)
      let finalWithdrawals = d.withdrawals || 0;
      let finalDeposits = d.deposits || 0;

      if (finalWithdrawals === 0 && finalDeposits === 0) {
        const diff = d.totalBalance - d.prevBalance;
        // 부동소수점 오차 방지를 위해 차이가 0.01 이상일 때만 반영
        if (diff > 0.001) finalDeposits = diff;
        else if (diff < -0.001) finalWithdrawals = Math.abs(diff);
      }

      return {
        id: d.id,
        no: d.account,
        type: d.bank,
        balance: d.prevBalance,
        withdraw: finalWithdrawals,
        internal: finalDeposits,
        final: d.totalBalance,
        isUSD,
        note: d.nickname || d.bank
      };
    } else {
      // 예측(Projection) 모드: 전일 종가 기반으로 오늘 지출 및 내부 유입 반영
      const accountWithdrawals = dailyWithdrawals.filter(w => 
        String(w.fromAccount || '').replace(/[^0-9]/g, '') === String(d.account).replace(/[^0-9]/g, '')
      );
      const todayWithdrawSum = accountWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      // 내부 입금(송입) 계산: 받는 사람 계좌(toAccount)가 현재 내 계좌(d.account)와 일치하는 내부 거래
      const accountInflows = dailyWithdrawals.filter(w => {
        const normalizedTo = String(w.account || w.toAccount || '').replace(/[^0-9]/g, '');
        const normalizedMine = String(d.account).replace(/[^0-9]/g, '');
        return normalizedTo === normalizedMine && checkIsInternal(w);
      });
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
  const composeAccounts = (deduplicatedStatusDetails.length > 0 
    ? deduplicatedStatusDetails.filter(d => d.entity.includes('컴포즈')).map(mapStatusToAccount)
    : masterCompose.filter(acc => !isExcludedAccount(acc)).map(a => ({ ...a, balance: 0, withdraw: 0, internal: 0, final: 0 }))
  ).filter(acc => acc.balance !== 0 || acc.withdraw !== 0 || acc.internal !== 0 || acc.final !== 0);

  const smartAccounts = (deduplicatedStatusDetails.length > 0 
    ? deduplicatedStatusDetails.filter(d => d.entity.includes('스마트')).map(mapStatusToAccount)
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
      const isInternal = checkIsInternal(w);
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

  // 3. 외화 송금 합계 계산 (송금 완료(집행)되지 않은 모든 건 합산)
  const pendingFXSchedules = fxSchedule.filter(item => item.status !== '송금 완료(집행)');
  const usdTotal = pendingFXSchedules.reduce((sum, item) => sum + item.amount, 0);
  const krwEquivalent = usdTotal * exchangeRate;

  const getEndOfWeek = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDay();
    const diffToSun = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diffToSun);
    return d.toISOString().split('T')[0];
  };
  const endOfWeekDate = getEndOfWeek(selectedDate);
  const usdThisWeek = pendingFXSchedules
    .filter(item => item.date >= selectedDate && item.date <= endOfWeekDate)
    .reduce((sum, item) => sum + item.amount, 0);
  const krwThisWeekEquivalent = usdThisWeek * exchangeRate;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">

      {/* ─── 인쇄 전용 PDF 보고서 컴포넌트 (화면에서는 숨겨짐) ─── */}
      <PrintReport
        selectedDate={selectedDate}
        composeAccounts={composeAccounts}
        smartAccounts={smartAccounts}
        composeTotal={composeTotal}
        smartTotal={smartTotal}
        fxSchedule={fxSchedule}
        dailyIssues={dailyIssues}
        exchangeRate={exchangeRate}
        isFinal={isFinal}
        usdPending={usdTotal}
        usdThisWeek={usdThisWeek}
        dailyWithdrawals={dailyWithdrawals}
      />

      {/* 1. 웹 전용 화면 (인쇄 시 숨김) */}
      <div className="print-hide space-y-8">
        {/* PDF 출력 버튼 (대시보드 우상단) */}
        <div className="flex justify-end -mb-4">
          <button
            onClick={() => {
              const prev = document.title;
              document.title = `compose_${selectedDate}`;
              setTimeout(() => {
                window.print();
                document.title = prev;
              }, 100);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-slate-200 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF 보고서 출력
          </button>
        </div>
        {/* 인쇄 전용 헤더 (Legacy - now in PrintReport) */}
        <div className="hidden mb-10 border-b-2 border-slate-900 pb-6">
          {/* ... */}
        </div>

        {/* 상단 요약 바 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">기초 가용 자산 (Baseline)</p>
              <h4 className="text-xl font-bold text-slate-600 tracking-tighter tabular-nums whitespace-nowrap">
                {formatKRW(composeTotal.krw.balance + smartTotal.krw.balance)}
              </h4>
              {(composeTotal.usd.balance + smartTotal.usd.balance) !== 0 && (
                <p className="text-[11px] font-black text-blue-500 font-mono mt-0.5 tabular-nums">
                  {formatUSD(composeTotal.usd.balance + smartTotal.usd.balance)} (USD)
                </p>
              )}
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 ml-2"><Wallet className="w-5 h-5" /></div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">금일 지출 (외부 집행)</p>
              <h4 className="text-xl font-bold text-red-500 tracking-tighter tabular-nums whitespace-nowrap">
                {formatKRW((composeSums.krwTotal - composeSums.krwInternal) + (smartSums.krwTotal - smartSums.krwInternal))}
              </h4>
              {((composeSums.usdTotal - composeSums.usdInternal) + (smartSums.usdTotal - smartSums.usdInternal)) !== 0 && (
                <p className="text-[11px] font-black text-blue-600 font-mono mt-0.5 tabular-nums">
                   {formatUSD((composeSums.usdTotal - composeSums.usdInternal) + (smartSums.usdTotal - smartSums.usdInternal))} (USD)
                </p>
              )}
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600 ml-2"><TrendingUp className="w-5 h-5" /></div>
          </div>

          <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg flex items-center justify-between group transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex-1">
              <p className="text-[10px] text-indigo-200 font-bold uppercase mb-1 tracking-widest">출금 후 예상 잔액 (Closing)</p>
              <h4 className="text-xl font-bold text-white tracking-tighter tabular-nums whitespace-nowrap">
                {formatKRW(composeTotal.krw.final + smartTotal.krw.final)}
              </h4>
              {(composeTotal.usd.final + smartTotal.usd.final) !== 0 && (
                <p className="text-[11px] font-black text-emerald-300 font-mono mt-0.5 tabular-nums">
                  {formatUSD(composeTotal.usd.final + smartTotal.usd.final)} (USD)
                </p>
              )}
            </div>
            <div className="p-3 bg-white/10 rounded-xl text-white ml-2"><Wallet className="w-5 h-5" /></div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl flex items-center justify-between col-span-1 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Globe className="w-24 h-24 text-white" /></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">외화 송금 대기 (USD)</p>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">금주 필요액</p>
                <h4 className="text-xl font-bold text-emerald-400 font-mono tracking-tight">{formatUSD(usdThisWeek)}</h4>
              </div>
              <div className="mt-2 text-slate-400">
                <span className="text-[10px] mr-2">총 필요액</span>
                <span className="text-sm font-bold font-mono text-emerald-600 border-b border-slate-700/50 pb-0.5">{formatUSD(usdTotal)}</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400">Rate: {formatKRW(exchangeRate)}</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">환전 필요 예상액</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">금주 예상액</p>
                <h4 className="text-xl font-bold text-amber-400 font-mono tracking-tighter">약 {(krwThisWeekEquivalent / 100000000).toFixed(1)} 억원</h4>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] text-slate-400 mr-2">총 예상액</span>
                <span className="text-sm font-bold font-mono text-amber-600 border-b border-slate-700/50 pb-0.5">약 {(krwEquivalent / 100000000).toFixed(1)} 억원</span>
              </div>
            </div>
          </div>
        </section>

        {/* 주요 이슈 사항 메모 (좌우 법인별 분리) */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 uppercase tracking-tight">
              <FileText className="w-4 h-4" /> 금일 주요 이슈 사항
            </h3>
            <span className="text-[9px] text-amber-500 font-bold bg-amber-100 px-2 py-0.5 rounded tracking-tighter">
              각 법인별 특이사항을 기록하세요. 입력창 밖을 클릭 시 자동 저장됩니다.
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 컴포즈커피 이슈 */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-indigo-700 flex items-center gap-1.5 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> [1] 컴포즈커피 이슈
              </label>
              <textarea 
                key={`${selectedDate}_compose`}
                defaultValue={typeof dailyIssues[selectedDate] === 'object' ? dailyIssues[selectedDate]?.compose : (dailyIssues[selectedDate] || '')} 
                onBlur={(e) => {
                  const current = typeof dailyIssues[selectedDate] === 'object' ? { ...dailyIssues[selectedDate] } : { compose: dailyIssues[selectedDate] || '', smart: '' };
                  onUpdateIssue(selectedDate, { ...current, compose: e.target.value });
                }}
                placeholder="컴포즈커피의 정기 지출, 법인세, 특이 자금 흐름 등" 
                className="w-full h-28 bg-white/70 border border-amber-200/50 rounded-xl p-4 text-[12px] font-medium outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all resize-none shadow-sm placeholder:text-slate-300"
              />
            </div>

            {/* 스마트팩토리 이슈 */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-emerald-700 flex items-center gap-1.5 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> [2] 스마트팩토리 이슈
              </label>
              <textarea 
                key={`${selectedDate}_smart`}
                defaultValue={typeof dailyIssues[selectedDate] === 'object' ? dailyIssues[selectedDate]?.smart : ''} 
                onBlur={(e) => {
                   const current = typeof dailyIssues[selectedDate] === 'object' ? { ...dailyIssues[selectedDate] } : { compose: dailyIssues[selectedDate] || '', smart: '' };
                   onUpdateIssue(selectedDate, { ...current, smart: e.target.value });
                }}
                placeholder="스마트팩토리의 생두 대금, 외화 송금 특이사항 등" 
                className="w-full h-28 bg-white/70 border border-amber-200/50 rounded-xl p-4 text-[12px] font-medium outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all resize-none shadow-sm placeholder:text-slate-300"
              />
            </div>
          </div>
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
                  <span className="text-slate-400">금주 필요 송금액</span>
                  <span className="font-mono font-bold text-emerald-400">{formatUSD(usdThisWeek)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">총 송금 대기 (잔액)</span>
                  <span className="font-mono font-bold text-emerald-600">{formatUSD(usdTotal)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 mt-2">
                  <span className="font-bold text-slate-300">금주 예상 한화</span>
                  <span className="font-mono font-black text-amber-400">{formatKRW(krwThisWeekEquivalent)}</span>
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
              <table className="w-full text-left text-[13px] border-collapse bg-white min-w-[700px]">
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
                  {fxSchedule.filter(s => s.date === selectedDate && s.status !== '송금 완료(집행)').map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors duration-150 bg-blue-50/10">
                      <td className="px-4 py-2.5 border-r border-slate-100/50 font-black text-blue-600">{s.date} (오늘)</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 font-bold text-slate-700">{s.client}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-right font-mono font-bold text-blue-600 tabular-nums">{formatUSD(s.amount)}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-center text-xs font-semibold">{s.bank}</td>
                      <td className="px-4 py-2.5 border-r border-slate-100/50 text-[11px] text-slate-400 leading-tight">{s.desc}</td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{s.status}</span></td>
                    </tr>
                  ))}
                  {fxSchedule.filter(s => s.date !== selectedDate && s.status !== '송금 완료(집행)').length > 0 && (
                    <>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-0 py-0">
                          <button 
                            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                            className="w-full px-4 py-2.5 flex items-center justify-between group hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-4">
                              {isScheduleOpen ? '미래 송금 일정 숨기기' : `미래 송금 일정 보기 (${fxSchedule.filter(s => s.date !== selectedDate && s.status !== '송금 완료(집행)').length}건)`}
                            </span>
                            {isScheduleOpen ? <ChevronUp className="w-4 h-4 text-slate-300 pr-4" /> : <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 pr-4" />}
                          </button>
                        </td>
                      </tr>
                      {isScheduleOpen && fxSchedule.filter(s => s.date !== selectedDate && s.status !== '송금 완료(집행)').map((s) => (
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
                <h3 className="font-bold text-sm tracking-tight">금일 출금 요청 로우 데이터 (법인별 분리)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Total {dailyWithdrawals.length} items for {selectedDate}</p>
              </div>
            </div>
            {isRawDataOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {isRawDataOpen && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              {['컴포즈커피', '스마트팩토리'].map((section) => {
                const sectionWithdrawals = dailyWithdrawals.filter(w => w.section === section);
                const sectionColor = section === '컴포즈커피' ? 'indigo' : 'emerald';
                
                // 해당 법인으로 들어온 내부 이체도 포함 (입금 행)
                const internalDeposits = dailyWithdrawals.filter(w => {
                  if (!checkIsInternal(w)) return false;
                  const toAcc = String(w.account || '').replace(/[^0-9]/g, '');
                  const isComposeAcc = masterCompose.some(a => String(a.no).replace(/[^0-9]/g, '') === toAcc);
                  const isSmartAcc = masterSmart.some(a => String(a.no).replace(/[^0-9]/g, '') === toAcc);
                  return (section === '컴포즈커피' && isComposeAcc) || (section === '스마트팩토리' && isSmartAcc);
                });

                const totalOut = sectionWithdrawals.reduce((sum, w) => sum + (w.isUSD ? 0 : w.amount), 0);
                const totalIn = internalDeposits.reduce((sum, w) => sum + (w.isUSD ? 0 : w.amount), 0);

                if (sectionWithdrawals.length === 0 && internalDeposits.length === 0) return null;

                return (
                  <div key={section} className="mb-8 last:mb-0">
                    <div className={`px-5 py-2.5 bg-${sectionColor}-50 border-y border-slate-100 flex justify-between items-center`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-${sectionColor}-500 animate-pulse`}></span>
                        <h4 className={`font-black text-xs text-${sectionColor}-900 underline underline-offset-4 decoration-2 decoration-${sectionColor}-200`}>
                          {section} 출금 요청 내역
                        </h4>
                      </div>
                      <div className="flex gap-4 text-[10px] font-black italic">
                        <span className="text-red-600">지출계: -{formatKRW(totalOut)}</span>
                        <span className="text-blue-600">입금액계: +{formatKRW(totalIn)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10.5px] border-collapse bg-white leading-tight min-w-[800px]">
                        <thead className="bg-slate-50/50 text-slate-400 font-black border-b border-slate-100 uppercase tracking-tighter">
                          <tr>
                            <th className="px-4 py-2 border-r border-slate-100/50">지급일</th>
                            <th className="px-4 py-2 border-r border-slate-100/50">출금계좌</th>
                            <th className="px-4 py-2 border-r border-slate-100/50">입금은행</th>
                            <th className="px-4 py-2 border-r border-slate-100/50">입금계좌번호</th>
                            <th className="px-4 py-2 border-r border-slate-100/50 text-right">금액</th>
                            <th className="px-4 py-2 border-r border-slate-100">예금주(구분)</th>
                            <th className="px-4 py-2">메모</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {sectionWithdrawals.map(w => {
                            const isInternal = checkIsInternal(w);
                            return (
                              <tr key={w.id} className={`transition-colors border-l-4 ${isInternal ? 'bg-indigo-50/30 border-l-indigo-400' : 'hover:bg-slate-50 border-l-transparent'}`}>
                                <td className="px-3 py-2.5 border-r border-slate-100/50 font-medium text-slate-400 whitespace-nowrap">{w.paymentDate}</td>
                                <td className="px-3 py-2.5 border-r border-slate-100/50 font-bold text-slate-600 whitespace-nowrap">{w.fromAccount}</td>
                                <td className="px-3 py-2.5 border-r border-slate-100/50 font-black text-slate-700 text-center">{w.bank}</td>
                                <td className="px-3 py-2.5 border-r border-slate-100/50 font-mono text-slate-400 whitespace-nowrap tracking-tighter">{w.account}</td>
                                <td className="px-3 py-2.5 border-r border-slate-100/50 text-right font-black tabular-nums whitespace-nowrap text-red-500">
                                  -{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                                </td>
                                <td className="px-3 py-2.5 border-r border-slate-100 min-w-[140px]">
                                  <div className="flex flex-col">
                                    <span className="font-black text-slate-800 tracking-tight leading-none break-keep">{w.payee}</span>
                                    {isInternal && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-1 whitespace-nowrap">★ 내부 자금 이체 (출금)</span>}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-400 text-[10px] italic truncate max-w-[120px]">{w.memo}</td>
                              </tr>
                            );
                          })}
                          {internalDeposits.map(w => (
                            <tr key={`${w.id}_dep`} className="bg-blue-50/30 border-l-4 border-l-blue-400 transition-colors">
                              <td className="px-3 py-2.5 border-r border-slate-100/50 font-medium text-slate-400 whitespace-nowrap">{w.paymentDate}</td>
                              <td className="px-3 py-2.5 border-r border-slate-100/50 font-bold text-blue-600 whitespace-nowrap bg-blue-100/10 tracking-tighter italic">TO: {w.account}</td>
                              <td className="px-3 py-2.5 border-r border-slate-100/50 font-black text-slate-300 text-center uppercase text-[8px]">Depo</td>
                              <td className="px-3 py-2.5 border-r border-slate-100/50 font-mono text-slate-400 whitespace-nowrap tracking-tighter italic">From: {w.fromAccount}</td>
                              <td className="px-3 py-2.5 border-r border-slate-100/50 text-right font-black tabular-nums whitespace-nowrap text-blue-600">
                                +{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100 min-w-[140px]">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800 tracking-tight leading-none break-keep">{w.payee}</span>
                                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter mt-1 whitespace-nowrap">★ 내부 자금 이체 (입금 반영)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-400 text-[10px] italic truncate max-w-[120px]">{w.memo}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black">
                           <tr>
                             <td colSpan={4} className="px-4 py-2 text-right text-slate-400 uppercase text-[9px] tracking-widest">SUBTOTAL ({section})</td>
                             <td className="px-4 py-2 text-right text-slate-900 font-black border-l border-slate-200">
                                <div className="text-red-500">-{formatKRW(totalOut)}</div>
                                <div className="text-blue-600 text-[9px]">+{formatKRW(totalIn)}</div>
                             </td>
                             <td colSpan={2} className="px-4 py-2 bg-slate-100/50">
                                <div className="text-[9px] text-slate-400">최종 순지출 합계 (입금액 제외)</div>
                                <div className="text-slate-900 font-black">{formatKRW(totalOut - totalIn)}</div>
                             </td>
                           </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
              {dailyWithdrawals.length === 0 && (
                <div className="px-4 py-12 text-center italic text-slate-300">데이터가 없습니다.</div>
              )}
            </div>
          )}
        </section>

      </div>

    </div>
  );
};

export default DashboardPage;
