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
      subjects: ['원재료(도급)', '복리후생비(도급)', '여비교통비(도급)', '접대비(도급)', '감가상각비(도급)', '보험료(도급)', '차량유지비(도급)', '운반비(도급)', '사무용품비(도급)', '소모품비(도급)', '지급수수료(도급)', '외주공사비(도급)'],
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
function aggregateBySubject(withdrawals, section, month) {
  const result = {};
  withdrawals.forEach(w => {
    if (w.section !== section) return;
    const wMonth = (w.paymentDate || '').substring(0, 7);
    if (wMonth !== month) return;
    if (!w.accountSubject) return;

    const subject = w.accountSubject;
    if (!result[subject]) result[subject] = 0;
    result[subject] += w.amount || 0;
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
const CashPLPage = ({ withdrawals = [], dailyStatuses = {}, recordDate, composeAccounts: masterCompose = [], smartAccounts: masterSmart = [] }) => {
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

  // ─── 실질 매출액 계산 로직 ──────────────────────────────────────────
  const getNetRevenueForMonth = (section) => {
    let totalDeposits = 0;
    
    // 1. 해당 월의 모든 확정 데이터에서 입금액 합산
    Object.entries(dailyStatuses).forEach(([date, status]) => {
      if (!date.startsWith(selectedMonth) || !status.details) return;
      status.details.forEach(d => {
        if (!d.entity.includes(section === '컴포즈커피' ? '컴포즈' : '스마트')) return;
        if (isExcludedAccount(d)) return;
        totalDeposits += (d.deposits || 0);
      });
    });

    // 2. 내부 이체 입금액 차감 (현재 법인 내 계좌 간 이체만 제외)
    // 법인 A -> 법인 B 이체는 법인 B 입장에서는 매출(외부 유입)로 간주함
    const internalInflow = withdrawals.reduce((sum, w) => {
      if (!w.paymentDate || !w.paymentDate.startsWith(selectedMonth)) return sum;
      
      // 받는 계좌 번호 추출
      const targetNo = String(w.account || w.toAccount || '').replace(/[^0-9]/g, '');
      if (!targetNo) return sum;

      // 현재 법인(section)의 계좌로 들어온 입금인지 확인
      const isTargetMine = section === '컴포즈커피' 
        ? masterCompose.some(a => String(a.no).replace(/[^0-9]/g, '') === targetNo)
        : masterSmart.some(a => String(a.no).replace(/[^0-9]/g, '') === targetNo);

      if (!isTargetMine) return sum;

      // 출처 계좌(fromAccount)도 현재 법인(section)의 계좌인지 확인
      const sourceNo = String(w.fromAccount || '').replace(/[^0-9]/g, '');
      const isSourceMine = section === '컴포즈커피' 
        ? masterCompose.some(a => String(a.no).replace(/[^0-9]/g, '') === sourceNo)
        : masterSmart.some(a => String(a.no).replace(/[^0-9]/g, '') === sourceNo);

      // '진짜 내부 이체'는 같은 법인 내의 계좌 이동뿐임
      // 법인 간 이동은 각 법인 입장에서는 외부 거래로 취급
      const isInternalToEntity = isSourceMine && isTargetMine;

      return sum + (isInternalToEntity ? (w.amount || 0) : 0);
    }, 0);

    return totalDeposits - internalInflow;
  };

  // ─── 미기록 출금액(자동이체 등) 계산 ──────────────────────────────────
  const getUnrecordedWithdrawals = (section) => {
    let excelOutflow = 0;
    
    // 1. 시재 확정 데이터(엑셀) 상의 총 출금액 합산
    Object.entries(dailyStatuses).forEach(([date, status]) => {
      if (!date.startsWith(selectedMonth) || !status.details) return;
      status.details.forEach(d => {
        if (!d.entity.includes(section === '컴포즈커피' ? '컴포즈' : '스마트')) return;
        if (isExcludedAccount(d)) return;
        excelOutflow += (d.withdrawals || 0);
      });
    });

    // 2. 현재까지 등록된 모든 수기 출금 내역 합산 (내부이체 포함)
    const manualOutflowTotal = withdrawals.reduce((sum, w) => {
      if (w.section !== section) return sum;
      if (!w.paymentDate || !w.paymentDate.startsWith(selectedMonth)) return sum;
      return sum + (w.amount || 0);
    }, 0);

    // 엑셀 상의 출금이 더 많다면, 그 차액을 '자동이체' 등으로 간주
    const diff = excelOutflow - manualOutflowTotal;
    return diff > 50 ? diff : 0; // 50원 미만 오차는 무시
  };

  // ─── 컴포즈 집계 ─────────────────────────────────────────────
  const composeMap = useMemo(() => {
    const map = aggregateBySubject(withdrawals, '컴포즈커피', selectedMonth);
    // 입금액 기반 매출 자동 계산 추가
    const netRevenue = getNetRevenueForMonth('컴포즈커피');
    map['실질입금매출'] = netRevenue;
    
    // 미기록 자동이체분 계산 추가
    const unrecorded = getUnrecordedWithdrawals('컴포즈커피');
    map['자동이체'] = (map['자동이체'] || 0) + unrecorded;
    
    return map;
  }, [withdrawals, selectedMonth, dailyStatuses, masterCompose, masterSmart]);

  // ─── 스마트팩토리 집계 ────────────────────────────────────────────
  const smartMap = useMemo(() => {
    const map = aggregateBySubject(withdrawals, '스마트팩토리', selectedMonth);
    // 입금액 기반 매출 자동 계산 추가
    const netRevenue = getNetRevenueForMonth('스마트팩토리');
    map['실질입금매출'] = netRevenue;

    // 미기록 자동이체분 계산 추가
    const unrecorded = getUnrecordedWithdrawals('스마트팩토리');
    map['자동이체'] = (map['자동이체'] || 0) + unrecorded;
    
    return map;
  }, [withdrawals, selectedMonth, dailyStatuses, masterCompose, masterSmart]);

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
  const smartCostSums = useMemo(() => {
    const result = {};
    SMART_COST_STRUCTURE.forEach(sec => {
      result[sec.id] = getSectionTotal(smartMap, sec.subjects);
    });
    result.totalCOGM = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }, [smartMap]);

  const composeSums = useMemo(() => calcSums(composeMap, COMPOSE_PL_STRUCTURE), [composeMap]);
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

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '컴포즈 영업이익', value: composeSums.operatingProfit, color: 'indigo' },
          { label: '컴포즈 당기순이익', value: composeSums.netProfit, color: 'indigo' },
          { label: '스마트 영업이익', value: smartSums.operatingProfit, color: 'emerald' },
          { label: '스마트 당기순이익', value: smartSums.netProfit, color: 'emerald' },
        ].map(card => {
          const isNeg = card.value < 0;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{card.label}</p>
              <p className={`text-lg font-black font-mono tabular-nums ${isNeg ? 'text-red-500' : card.color === 'indigo' ? 'text-indigo-700' : 'text-emerald-700'}`}>
                {isNeg ? `(${formatKRW(Math.abs(card.value))})` : formatKRW(card.value || 0)}
              </p>
              <p className="text-[9px] text-slate-300 mt-1 uppercase font-bold">{monthLabel} 기준</p>
            </div>
          );
        })}
      </div>

      {/* P&L 테이블 2단 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
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
          overrides={{ cogs: smartCostSums.totalCOGM }}
        />
      </div>

      {/* 스마트팩토리 원가명세서 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 flex items-center gap-3 border-b border-slate-100 bg-slate-800">
          <Factory className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-black text-white text-lg tracking-tight">스마트팩토리 원가명세서</h3>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">{monthLabel} · 기간별원가명세서 (Cash Basis)</p>
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
              {SMART_COST_STRUCTURE.map(sec => {
                const secKey = `cost_${sec.id}`;
                const total = smartCostSums[sec.id] || 0;
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
                      const val = smartMap[subject] || 0;
                      if (val === 0) return null;
                      return <DetailRow key={subject} label={subject} value={val} isIndented />;
                    })}
                  </React.Fragment>
                );
              })}
              <SubtotalRow label="당기제품제조원가" value={smartCostSums.totalCOGM} highlight />
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={3} className="px-4 py-2 text-right text-[9px] text-slate-400 font-bold uppercase tracking-widest">(단위: 원) · 캐시플로우 기준</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashPLPage;
