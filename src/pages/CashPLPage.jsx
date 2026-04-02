import React, { useState, useMemo, useEffect } from 'react';
import { formatKRW, isExcludedAccount } from '../utils/formatters';
import { TrendingUp, Factory, Building2, ChevronDown, ChevronRight, Printer } from 'lucide-react';

// ─── 손익계산서 계정 분류 구조 ───────────────────────────────────────────
// 컴포즈커피 P&L 구조
const COMPOSE_PL_STRUCTURE = {
  sections: [
    {
      id: 'revenue',
      label: 'I. 매출액',
      type: 'revenue',
      subjects: ['상품매출', '공사매출', '가맹비매출', '용역매출'],
    },
    {
      id: 'cogs',
      label: 'II. 매출원가',
      type: 'expense',
      subjects: ['상품매출원가'], // 당기공사원가는 원가명세서에서 합계로 가져옴
    },
    {
      id: 'grossProfit',
      label: 'III. 매출총이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs,
    },
    {
      id: 'sga',
      label: 'IV. 판매비와 관리비',
      type: 'expense',
      subjects: ['임원급여', '직원급여', '상여금', '퇴직급여', '복리후생비', '여비교통비', '접대비', '통신비', '수도광열비', '전력비', '세금과공과금', '감가상각비', '지급임차료', '보험료', '차량유지비', '운반비', '교육훈련비', '도서인쇄비', '사무용품비', '소모품비', '지급수수료', '광고선전비', '판매촉진비', '대손상각비', '건물관리비', '무형고정자산상각', '리스료', '자동이체'],
    },
    {
      id: 'operatingProfit',
      label: 'V. 영업이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga,
    },
    {
      id: 'nonOpIncome',
      label: 'VI. 영업외수익',
      type: 'revenue',
      subjects: ['이자수익', '배당금수익', '외환차익', '판매장려금', '잡이익'],
    },
    {
      id: 'nonOpExpense',
      label: 'VII. 영업외비용',
      type: 'expense',
      subjects: ['외환차손', '기부금', '유형자산처분손실', '잡손실'],
    },
    {
      id: 'pretaxProfit',
      label: 'VIII. 법인세차감전이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga + sums.nonOpIncome - sums.nonOpExpense,
    },
    {
      id: 'tax',
      label: 'IX. 법인세등',
      type: 'expense',
      subjects: ['법인세등'],
    },
    {
      id: 'netProfit',
      label: 'X. 당기순이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga + sums.nonOpIncome - sums.nonOpExpense - sums.tax,
    },
  ],
};

// 컴포즈커피 공사원가명세서
const COMPOSE_COST_STRUCTURE = [
  { id: 'rawMaterial', label: 'I. 공사원재료비', subjects: ['원재료(도급)'] },
  { id: 'labor', label: 'II. 노 무 비', subjects: [] },
  { id: 'outsourcing', label: 'III. 외 주 비', subjects: [] },
  {
    id: 'overhead', label: 'IV. 경 비',
    subjects: ['복리후생비(도급)', '여비교통비(도급)', '접대비(도급)', '감가상각비(도급)', '보험료(도급)', '차량유지비(도급)', '운반비(도급)', '사무용품비(도급)', '소모품비(도급)', '지급수수료(도급)', '외주공사비(도급)'],
  },
];

// 스마트팩토리 P&L 구조
const SMART_PL_STRUCTURE = {
  sections: [
    {
      id: 'revenue',
      label: 'I. 매출액',
      type: 'revenue',
      subjects: ['제품매출'],
    },
    {
      id: 'cogs',
      label: 'II. 매출원가',
      type: 'expense',
      subjects: ['제품매출원가'],
    },
    {
      id: 'grossProfit',
      label: 'III. 매출총이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs,
    },
    {
      id: 'sga',
      label: 'IV. 판매비와 관리비',
      type: 'expense',
      subjects: ['복리후생비', '지급수수료', '자동이체'],
    },
    {
      id: 'operatingProfit',
      label: 'V. 영업이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga,
    },
    {
      id: 'nonOpIncome',
      label: 'VI. 영업외수익',
      type: 'revenue',
      subjects: ['이자수익', '외환차익', '잡이익'],
    },
    {
      id: 'nonOpExpense',
      label: 'VII. 영업외비용',
      type: 'expense',
      subjects: ['이자비용', '외환차손'],
    },
    {
      id: 'pretaxProfit',
      label: 'VIII. 법인세차감전이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga + sums.nonOpIncome - sums.nonOpExpense,
    },
    {
      id: 'tax',
      label: 'IX. 법인세등',
      type: 'expense',
      subjects: ['법인세등'],
    },
    {
      id: 'netProfit',
      label: 'X. 당기순이익',
      type: 'subtotal',
      formula: (sums) => sums.revenue - sums.cogs - sums.sga + sums.nonOpIncome - sums.nonOpExpense - sums.tax,
    },
  ],
};

// 스마트팩토리 원가명세서
const SMART_COST_STRUCTURE = [
  { id: 'rawMaterial', label: 'I. 재 료 비', subjects: ['원재료매입액(원가)', '원재료비'] },
  {
    id: 'labor', label: 'II. 노 무 비',
    subjects: ['급여(원가)', '퇴직급여(원가)', '상여금(원가)'],
  },
  {
    id: 'overhead', label: 'III. 경 비',
    subjects: ['복리후생비(원가)', '여비교통비(원가)', '접대비(원가)', '통신비(원가)', '가스수도료(원가)', '전력비(원가)', '세금과공과금(원가)', '감가상각비(원가)', '보험료(원가)', '차량유지비(원가)', '운반비(원가)', '교육훈련비(원가)', '소모품비(원가)', '지급수수료(원가)', '외주가공비(원가)'],
  },
];

// ─── 데이터 집계 함수 ────────────────────────────────────────────────────
function aggregateBySubject(withdrawals, section, month, exchangeRate) {
  const result = {};
  withdrawals.forEach(w => {
    if (w.section !== section) return;
    const wMonth = (w.paymentDate || '').substring(0, 7);
    if (wMonth !== month) return;
    if (!w.accountSubject) return;

    const subject = w.accountSubject;
    if (!result[subject]) result[subject] = 0;
    
    // 외화 금액이면 현재 환율로 환산하여 집계 (손익계산서 통합용)
    const amount = (w.isUSD || w.currency === 'USD') ? (w.amount * exchangeRate) : (w.amount || 0);
    result[subject] += amount;
  });
  return result;
}

function getSectionTotal(subjectMap, subjects) {
  return subjects.reduce((sum, s) => sum + (subjectMap[s] || 0), 0);
}

// ─── 소계 행 컴포넌트 ────────────────────────────────────────────────────
const SubtotalRow = ({ label, value, highlight = false, isProfit }) => {
  const isNegative = value < 0;
  return (
    <tr className={`border-t-2 ${highlight ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-[#d9e1f2]'}`}>
      <td colSpan={2} className={`px-4 py-2 font-black text-sm ${highlight ? 'text-white' : 'text-slate-800'}`}>
        {label}
      </td>
      <td className={`px-4 py-2 text-right font-black text-sm font-mono ${
        highlight ? (isNegative ? 'text-red-400' : 'text-emerald-300') :
        (isNegative ? 'text-red-600' : 'text-slate-900')
      }`}>
        {isNegative ? `(${formatKRW(Math.abs(value))})` : formatKRW(value)}
      </td>
    </tr>
  );
};

// ─── 원가명세서 테이블 컴포넌트 ──────────────────────────────────────────
const CostStatementTable = ({ title, structure, subjectMap, sums, totalLabel, color, openSections, toggleSection }) => {
  const monthLabel = sums?.month ? sums.month : ''; // Month info if needed
  
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className={`px-8 py-5 flex items-center gap-3 border-b border-slate-100 ${color === 'indigo' ? 'bg-indigo-700' : 'bg-slate-800'}`}>
        <Factory className={`w-5 h-5 ${color === 'indigo' ? 'text-indigo-200' : 'text-emerald-400'}`} />
        <div>
          <h3 className="font-black text-white text-lg tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">기간별 원가명세서 (Cash Basis)</p>
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#002060] text-white">
            <tr>
              <th className="px-4 py-2 text-center w-8 text-[10px] font-bold"></th>
              <th className="px-4 py-2 text-left text-[11px] font-bold tracking-widest uppercase">과 목</th>
              <th className="px-4 py-2 text-right text-[11px] font-bold w-40 tracking-widest uppercase">금 액</th>
            </tr>
          </thead>
          <tbody>
            {structure.map(sec => {
              const secKey = `cost_${title}_${sec.id}`;
              const total = sums[sec.id] || 0;
              const isOpen = openSections[secKey] !== false;

              return (
                <React.Fragment key={sec.id}>
                  <SectionHeader
                    label={sec.label}
                    total={total}
                    type="expense"
                    isOpen={isOpen}
                    onToggle={() => toggleSection(secKey)}
                  />
                  {isOpen && sec.subjects.map(subject => {
                    const val = subjectMap[subject] || 0;
                    if (val === 0) return null;
                    return <DetailRow key={subject} label={subject} value={val} isIndented />;
                  })}
                </React.Fragment>
              );
            })}
            <SubtotalRow label={totalLabel} value={sums.totalCOGM} highlight />
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={3} className="px-4 py-2 text-right text-[9px] text-slate-400 font-bold uppercase tracking-widest">(단위: 원) · 캐시플로우 기준</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ─── 일반 행 컴포넌트 ────────────────────────────────────────────────────
const DetailRow = ({ label, value, isIndented = false }) => {
  if (value === 0) return null;
  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100">
      <td className="px-4 py-1.5 text-slate-400 text-[10px] w-8"></td>
      <td className={`px-4 py-1.5 text-[12px] text-slate-700 ${isIndented ? 'pl-8' : ''}`}>
        {label}
      </td>
      <td className="px-4 py-1.5 text-right font-mono text-[12px] text-slate-700">
        {formatKRW(value)}
      </td>
    </tr>
  );
};

// ─── 섹션 헤더 행 컴포넌트 ───────────────────────────────────────────────
const SectionHeader = ({ label, total, type, isOpen, onToggle }) => {
  const isExpense = type === 'expense';
  return (
    <tr
      className={`cursor-pointer border-t border-slate-200 ${isExpense ? 'bg-slate-50' : 'bg-blue-50/30'}`}
      onClick={onToggle}
    >
      <td className="px-4 py-2 text-slate-400 w-8">
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </td>
      <td className="px-4 py-2 font-black text-[13px] text-slate-800">{label}</td>
      <td className={`px-4 py-2 text-right font-black text-[13px] font-mono ${isExpense ? 'text-red-600' : 'text-blue-700'}`}>
        {total > 0 ? formatKRW(total) : '-'}
      </td>
    </tr>
  );
};

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────
const CashPLPage = ({ 
  withdrawals = [], 
  dailyStatuses = {}, 
  recordDate, 
  composeAccounts: masterCompose = [], 
  smartAccounts: masterSmart = [], 
  exchangeRate = 1500,
  fxExchangeResults = [] 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(recordDate.substring(0, 7));
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    if (recordDate) setSelectedMonth(recordDate.substring(0, 7));
  }, [recordDate]);

  // 모든 자사 계좌번호 Set (내부 이체 판별용)
  const allCompanyAccounts = useMemo(() => new Set([
    ...masterCompose.map(a => String(a.no || '').replace(/[^0-9]/g, '')),
    ...masterSmart.map(a => String(a.no || '').replace(/[^0-9]/g, ''))
  ]), [masterCompose, masterSmart]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    withdrawals.forEach(w => {
      if (w.paymentDate) months.add(w.paymentDate.substring(0, 7));
    });
    // dailyStatuses에서도 달 추출 (매출액 계산용)
    Object.keys(dailyStatuses).forEach(d => months.add(d.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [withdrawals, dailyStatuses]);

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── 실계산 엔진 (입금/출금 기반) ──────────────────────────────────
  const calculateCashStats = useMemo(() => {
    const stats = {
      컴포즈커피: { excelIn: 0, excelOut: 0, manualIn: 0, manualOut: 0, knownFX: 0 },
      스마트팩토리: { excelIn: 0, excelOut: 0, manualIn: 0, manualOut: 0, knownFX: 0 }
    };

    // 0. 외화 환전 데이터 집계 (신규 반영)
    // 외화 환전은 현재 스마트팩토리(생두 매입용)에서 주로 발생하므로 스마트팩토리에 우선 반영
    const monthFX = fxExchangeResults.filter(e => e.date.startsWith(selectedMonth));
    const totalFX_KRW = monthFX.reduce((sum, e) => sum + (e.krwAmount || 0), 0);
    
    // 이 현상은 '기록된 환율'과 '현재 대시보드 환율'의 차이로 인해 발생합니다.
    // excelIn 집계 시 USD 금액에 글로벌 exchangeRate를 곱해 구하므로, 
    // 상쇄용 입금액인 totalFX_USD_KRW도 글로벌 exchangeRate를 곱해야 Revenue가 0원으로 수렴합니다.
    const totalFX_USD_KRW_Global = monthFX.reduce((sum, e) => sum + (e.usdAmount * exchangeRate), 0);
    
    // 외화 환전은 내부 자금 이동이므로 양쪽 모두 내부 거래로 기록
    stats['스마트팩토리'].knownFX = (totalFX_KRW + totalFX_USD_KRW_Global) / 2; // Heuristic: Avg of the two to match internal transfers logic

    // 1. 엑셀 데이터 합산 (통화 환산 적용)
    Object.entries(dailyStatuses).forEach(([date, status]) => {
      if (!date.startsWith(selectedMonth) || !status.details) return;
      status.details.forEach(d => {
        const entity = d.entity.includes('컴포즈') ? '컴포즈커피' : '스마트팩토리';
        if (isExcludedAccount(d)) return;
        
        const rate = (d.isUSD || d.currency === 'USD') ? exchangeRate : 1;
        stats[entity].excelIn += (d.deposits || 0) * rate;
        stats[entity].excelOut += (d.withdrawals || 0) * rate;
      });
    });

    // 2. 수기 기록 데이터 합산
    withdrawals.forEach(w => {
      if (!w.paymentDate || !w.paymentDate.startsWith(selectedMonth)) return;
      const entity = w.section;
      if (!stats[entity]) return;

      const rate = (w.isUSD || w.currency === 'USD') ? exchangeRate : 1;
      const amount = (w.amount || 0) * rate;

      // 출금 합계 (모든 지출/이체 포함)
      stats[entity].manualOut += amount;

      // 내부 이체 입금액 합산 (현재 법인 내 계좌 간 이체만 제외 대상)
      const targetNo = String(w.account || w.toAccount || '').replace(/[^0-9]/g, '');
      const sourceNo = String(w.fromAccount || '').replace(/[^0-9]/g, '');
      
      // If we have to/from account info, we can check for internal transfers
      if (targetNo && sourceNo) {
        const isTargetMine = entity === '컴포즈커피' 
          ? masterCompose.some(a => String(a.no).replace(/[^0-9]/g, '') === targetNo)
          : masterSmart.some(a => String(a.no).replace(/[^0-9]/g, '') === targetNo);
        
        const isSourceMine = entity === '컴포즈커피' 
          ? masterCompose.some(a => String(a.no).replace(/[^0-9]/g, '') === sourceNo)
          : masterSmart.some(a => String(a.no).replace(/[^0-9]/g, '') === sourceNo);

        if (isTargetMine && isSourceMine) {
          stats[entity].manualIn += amount;
        }
      }
    });

    // 3. 최종 조정값 도출 
    const results = {};
    ['컴포즈커피', '스마트팩토리'].forEach(entity => {
      const s = stats[entity];
      
      // 해당 월의 외화 환전 집계액을 수기 입출금에 합산하여 내부거래 판별 정확도 향상
      // USD 입금액 상쇄는 대시보드 기준 환율(totalFX_USD_KRW_Global)을 사용하여 환율차에 의한 매출 왜곡 방지
      const effectiveManualIn = s.manualIn + (entity === '스마트팩토리' ? totalFX_USD_KRW_Global : 0);
      const effectiveManualOut = s.manualOut + (entity === '스마트팩토리' ? totalFX_KRW : 0);

      const unrecordedIn = Math.max(0, s.excelIn - effectiveManualIn);
      const unrecordedOut = Math.max(0, s.excelOut - effectiveManualOut);
      
      // Heuristic: 입/출금이 동시에 나면 환전 등 기타 내부거래로 간주
      const estimatedInternal = Math.min(unrecordedIn, unrecordedOut);
      
      results[entity] = {
        netRevenue: unrecordedIn - estimatedInternal,
        automaticWithdrawal: unrecordedOut - estimatedInternal
      };
    });

    return results;
  }, [selectedMonth, dailyStatuses, withdrawals, exchangeRate, masterCompose, masterSmart, fxExchangeResults]);

  // ─── 캐시 잔액 집계 로직 (Reconciliation) ──────────────────────────
  const cashReconciliation = useMemo(() => {
    // 1. 당월 총 입금/출금 합산 (모든 법인 합계)
    const monthTotal = { deposits: 0, withdrawals: 0, balance: 0 };
    
    // 2. 기초 잔액 (전월 말 잔액) 찾기
    // 단순히 지난달(M-1)만 뒤지는 것이 아니라, 현재 월(selectedMonth) 이전의 모든 날짜 중 가장 최신 날짜의 기말 잔액을 가져옵니다.
    const firstDayOfCurrentMonth = `${selectedMonth}-01`;
    const allDates = Object.keys(dailyStatuses).sort();
    const pastDates = allDates.filter(d => d < firstDayOfCurrentMonth);
    const lastAvailableDateBefore = pastDates[pastDates.length - 1];
    
    let beginningBalance = 0;
    if (lastAvailableDateBefore && dailyStatuses[lastAvailableDateBefore]?.details) {
      dailyStatuses[lastAvailableDateBefore].details.forEach(d => {
        if (isExcludedAccount(d)) return;
        const rate = (d.isUSD || d.currency === 'USD') ? exchangeRate : 1;
        beginningBalance += (d.balance || 0) * rate;
      });
    }

    // 3. 당월 입/출금 합산
    Object.entries(dailyStatuses).forEach(([date, status]) => {
      if (!date.startsWith(selectedMonth) || !status.details) return;
      status.details.forEach(d => {
        if (isExcludedAccount(d)) return;
        const rate = (d.isUSD || d.currency === 'USD') ? exchangeRate : 1;
        monthTotal.deposits += (d.deposits || 0) * rate;
        monthTotal.withdrawals += (d.withdrawals || 0) * rate;
      });
    });

    const endingBalance = beginningBalance + monthTotal.deposits - monthTotal.withdrawals;

    return {
      beginningBalance,
      totalIn: monthTotal.deposits,
      totalOut: monthTotal.withdrawals,
      endingBalance
    };
  }, [selectedMonth, dailyStatuses, exchangeRate]);

  // 각 섹션 합계 계산 헬퍼
  const composeMap = useMemo(() => {
    const map = aggregateBySubject(withdrawals, '컴포즈커피', selectedMonth, exchangeRate);
    
    // 자동화된 실질 매출 및 자동이체 계산 반영
    const stats = calculateCashStats['컴포즈커피'];
    map['실질입금매출'] = stats.netRevenue;
    map['자동이체'] = (map['자동이체'] || 0) + stats.automaticWithdrawal;
    
    return map;
  }, [withdrawals, selectedMonth, dailyStatuses, masterCompose, masterSmart, calculateCashStats, exchangeRate]);

  // ─── 스마트팩토리 집계 ────────────────────────────────────────────
  const smartMap = useMemo(() => {
    const map = aggregateBySubject(withdrawals, '스마트팩토리', selectedMonth, exchangeRate);
    
    // 자동화된 실질 매출 및 자동이체 계산 반영
    const stats = calculateCashStats['스마트팩토리'];
    map['실질입금매출'] = stats.netRevenue;
    map['자동이체'] = (map['자동이체'] || 0) + stats.automaticWithdrawal;
    
    return map;
  }, [withdrawals, selectedMonth, dailyStatuses, masterCompose, masterSmart, calculateCashStats, exchangeRate]);

  // 각 섹션 합계 계산 헬퍼
  const calcSums = (map, structure) => {
    const sums = {};
    structure.sections.forEach(sec => {
      if (sec.subjects) {
        let total = getSectionTotal(map, sec.subjects);
        // 매출액(revenue) 섹션이고, '실질입금매출'이 있으면 강제 반영
        if (sec.id === 'revenue' && map['실질입금매출'] > 0) {
          total = map['실질입금매출'];
        }
        sums[sec.id] = total;
      }
    });
    // formula 기반 소계 계산
    structure.sections.forEach(sec => {
      if (sec.formula) {
        sums[sec.id] = sec.formula(sums);
      }
    });
    return sums;
  };

  // 원가명세서 집계 (smartSums보다 먼저 계산 필요)
  // 컴포즈 원가명세서 집계
  const composeCostSums = useMemo(() => {
    const result = {};
    COMPOSE_COST_STRUCTURE.forEach(sec => {
      result[sec.id] = getSectionTotal(composeMap, sec.subjects);
    });
    result.totalCOGM = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }, [composeMap]);

  // 스마트팩토리 원가명세서 집계 (smartSums보다 먼저 계산 필요)
  const smartCostSums = useMemo(() => {
    const result = {};
    SMART_COST_STRUCTURE.forEach(sec => {
      result[sec.id] = getSectionTotal(smartMap, sec.subjects);
    });
    result.totalCOGM = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }, [smartMap]);

  const composeSums = useMemo(() => {
    const baseSums = calcSums(composeMap, COMPOSE_PL_STRUCTURE);
    // Sync COGM to COGS for Compose Coffee (Construction costs)
    baseSums.cogs = (baseSums.cogs || 0) + composeCostSums.totalCOGM;
    // Re-calculate subtotals
    baseSums.grossProfit = baseSums.revenue - baseSums.cogs;
    baseSums.operatingProfit = baseSums.grossProfit - baseSums.sga;
    baseSums.pretaxProfit = baseSums.operatingProfit + baseSums.nonOpIncome - baseSums.nonOpExpense;
    baseSums.netProfit = baseSums.pretaxProfit - baseSums.tax;
    return baseSums;
  }, [composeMap, composeCostSums]);

  const smartSums = useMemo(() => {
    const baseSums = calcSums(smartMap, SMART_PL_STRUCTURE);
    // Sync COGM to COGS for Smart Factory
    baseSums.cogs = smartCostSums.totalCOGM;
    // Re-calculate subtotals that depend on cogs
    baseSums.grossProfit = baseSums.revenue - baseSums.cogs;
    baseSums.operatingProfit = baseSums.grossProfit - baseSums.sga;
    baseSums.pretaxProfit = baseSums.operatingProfit + baseSums.nonOpIncome - baseSums.nonOpExpense;
    baseSums.netProfit = baseSums.pretaxProfit - baseSums.tax;
    return baseSums;
  }, [smartMap, smartCostSums]);

  const renderPL = (structure, subjectMap, sums, entityKey, overrides = {}) => {
    return structure.sections.map(sec => {
      if (sec.type === 'subtotal') {
        const val = sums[sec.id] ?? sec.formula(sums);
        const isHighlight = sec.id === 'netProfit' || sec.id === 'operatingProfit';
        return <SubtotalRow key={sec.id} label={sec.label} value={val} highlight={isHighlight} />;
      }

      const secKey = `${entityKey}_${sec.id}`;
      const total = overrides[sec.id] !== undefined ? overrides[sec.id] : (sums[sec.id] ?? getSectionTotal(subjectMap, sec.subjects));
      const isOpen = openSections[secKey] !== false; // default open

      return (
        <React.Fragment key={sec.id}>
          <SectionHeader
            label={sec.label}
            total={total}
            type={sec.type}
            isOpen={isOpen}
            onToggle={() => toggleSection(secKey)}
          />
          {isOpen && (
            <>
              {/* 특수 항목 (매출액 입금 기반 표시: 기존 매칭 데이터가 없을 때만 표시) */}
              {sec.id === 'revenue' && subjectMap['실질입금매출'] > 0 && getSectionTotal(subjectMap, sec.subjects) === 0 && (
                <DetailRow key="net_revenue_calc" label="입금 기반 매출액 (내부이체 제외)" value={subjectMap['실질입금매출']} isIndented />
              )}
              {sec.subjects.map(subject => {
                const val = (overrides[sec.id] !== undefined && sec.subjects.length === 1) 
                  ? overrides[sec.id] 
                  : (subjectMap[subject] || 0);
                if (val === 0) return null;
                return <DetailRow key={subject} label={subject} value={val} isIndented />;
              })}
            </>
          )}
        </React.Fragment>
      );
    });
  };

  const PLTable = ({ title, icon: Icon, structure, subjectMap, sums, entityKey, color, overrides }) => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-8 py-5 flex items-center gap-3 border-b border-slate-100 ${color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-700'}`}>
        <Icon className="w-5 h-5 text-white" />
        <div>
          <h3 className="font-black text-white text-lg tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Cash-basis Income Statement · {selectedMonth.replace('-', '년 ')}월</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#002060] text-white">
            <tr>
              <th className="px-4 py-2 text-center w-8 text-[10px] font-bold"></th>
              <th className="px-4 py-2 text-left text-[11px] font-bold tracking-widest uppercase">과 목</th>
              <th className="px-4 py-2 text-right text-[11px] font-bold w-40 tracking-widest uppercase">금 액</th>
            </tr>
          </thead>
          <tbody>
            {renderPL(structure, subjectMap, sums, entityKey, overrides)}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={3} className="px-4 py-2 text-right text-[9px] text-slate-400 font-bold uppercase tracking-widest">(단위: 원) · 캐시플로우 기준</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const monthLabel = selectedMonth.replace('-', '년 ') + '월';

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" /> 캐시기준 손익계산서
          </h2>
          <p className="text-sm text-slate-500 font-medium">출금 계정과목 매칭 기반 월별 법인별 손익을 집계합니다. (Cash Basis P&L)</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{m.replace('-', '년 ')}월</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" /> 인쇄
          </button>
        </div>
      </div>

      {/* 통합 캐시 리컨실리에이션 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: `기초입산 (${availableMonths[availableMonths.indexOf(selectedMonth) + 1] ? availableMonths[availableMonths.indexOf(selectedMonth) + 1].substring(5) : '전'}월말)`, value: cashReconciliation.beginningBalance, color: 'slate' },
          { label: '당월 총 입금액 (Inflow)', value: cashReconciliation.totalIn, color: 'blue' },
          { label: '당월 총 출금액 (Outflow)', value: cashReconciliation.totalOut, color: 'red' },
          { label: '당월 기말 잔액 (Balance)', value: cashReconciliation.endingBalance, color: 'emerald' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{card.label}</p>
            <p className={`text-lg font-black font-mono tabular-nums ${
              card.color === 'red' ? 'text-red-500' : 
              card.color === 'blue' ? 'text-blue-600' : 
              card.color === 'emerald' ? 'text-emerald-700' : 'text-slate-700'
            }`}>
              {formatKRW(card.value || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* 실질 영업이익 요약 (보조) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: '컴포즈 영업이익', value: composeSums.operatingProfit, color: 'indigo' },
          { label: '컴포즈 당기순이익', value: composeSums.netProfit, color: 'indigo' },
          { label: '스마트 영업이익', value: smartSums.operatingProfit, color: 'emerald' },
          { label: '스마트 당기순이익', value: smartSums.netProfit, color: 'emerald' },
        ].map(card => {
          const isNeg = card.value < 0;
          return (
            <div key={card.label} className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">{card.label}</p>
              <p className={`text-xs font-bold font-mono ${isNeg ? 'text-red-500' : 'text-slate-700'}`}>
                {isNeg ? `(${formatKRW(Math.abs(card.value))})` : formatKRW(card.value || 0)}
              </p>
            </div>
          );
        })}
      </div>

      {/* P&L 테이블 2단 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16">
        <PLTable
          title="컴포즈커피 손익계산서"
          icon={Building2}
          structure={COMPOSE_PL_STRUCTURE}
          subjectMap={composeMap}
          sums={composeSums}
          entityKey="compose"
          color="indigo"
        />
        <PLTable
          title="스마트팩토리 손익계산서"
          icon={Factory}
          structure={SMART_PL_STRUCTURE}
          subjectMap={smartMap}
          sums={smartSums}
          entityKey="smart"
          color="emerald"
        />
      </div>

      {/* 원가명세서 섹션 (페이지 하단) */}
      <div className="pt-10 border-t border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
          <Factory className="w-6 h-6 text-indigo-600" /> 세부 원가보고서 (Period Cost Statements)
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <CostStatementTable
            title="컴포즈 공사원가명세서"
            structure={COMPOSE_COST_STRUCTURE}
            subjectMap={composeMap}
            sums={composeCostSums}
            totalLabel="당 기 공 사 원 가"
            color="indigo"
            openSections={openSections}
            toggleSection={toggleSection}
          />
          <CostStatementTable
            title="스마트팩토리 제조원가명세서"
            structure={SMART_COST_STRUCTURE}
            subjectMap={smartMap}
            sums={smartCostSums}
            totalLabel="당 기 제 품 제 조 원 가"
            color="emerald"
            openSections={openSections}
            toggleSection={toggleSection}
          />
        </div>
      </div>
    </div>
  );
};

export default CashPLPage;
