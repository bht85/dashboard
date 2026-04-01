import React, { useState, useMemo } from 'react';
import { formatKRW } from '../utils/formatters';
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
      subjects: ['임원급여', '직원급여', '상여금', '퇴직급여', '복리후생비', '여비교통비', '접대비', '통신비', '수도광열비', '전력비', '세금과공과금', '감가상각비', '지급임차료', '보험료', '차량유지비', '운반비', '교육훈련비', '도서인쇄비', '사무용품비', '소모품비', '지급수수료', '광고선전비', '판매촉진비', '대손상각비', '건물관리비', '무형고정자산상각', '리스료'],
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
      subjects: ['복리후생비', '지급수수료'],
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
  { id: 'rawMaterial', label: 'I. 재 료 비', subjects: ['원재료비'] },
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
const CashPLPage = ({ withdrawals = [], recordDate }) => {
  const currentMonth = recordDate.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [openSections, setOpenSections] = useState({});

  // 사용 가능한 월 목록
  const availableMonths = useMemo(() => {
    const months = new Set(
      withdrawals
        .filter(w => w.paymentDate)
        .map(w => w.paymentDate.substring(0, 7))
    );
    months.add(currentMonth);
    return Array.from(months).sort().reverse();
  }, [withdrawals, currentMonth]);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── 컴포즈커피 집계 ──────────────────────────────────────────────
  const composeMap = useMemo(() =>
    aggregateBySubject(withdrawals, '컴포즈커피', selectedMonth),
    [withdrawals, selectedMonth]
  );

  // ─── 스마트팩토리 집계 ────────────────────────────────────────────
  const smartMap = useMemo(() =>
    aggregateBySubject(withdrawals, '스마트팩토리', selectedMonth),
    [withdrawals, selectedMonth]
  );

  // 각 섹션 합계 계산 헬퍼
  const calcSums = (map, structure) => {
    const sums = {};
    structure.sections.forEach(sec => {
      if (sec.subjects) {
        sums[sec.id] = getSectionTotal(map, sec.subjects);
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

  const composeSums = useMemo(() => calcSums(composeMap, COMPOSE_PL_STRUCTURE), [composeMap]);
  const smartSums = useMemo(() => calcSums(smartMap, SMART_PL_STRUCTURE), [smartMap]);

  // 원가명세서 집계
  const smartCostSums = useMemo(() => {
    const result = {};
    SMART_COST_STRUCTURE.forEach(sec => {
      result[sec.id] = getSectionTotal(smartMap, sec.subjects);
    });
    result.totalCOGM = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }, [smartMap]);

  const renderPL = (structure, subjectMap, sums, entityKey) => {
    return structure.sections.map(sec => {
      if (sec.type === 'subtotal') {
        const val = sums[sec.id] ?? sec.formula(sums);
        const isHighlight = sec.id === 'netProfit' || sec.id === 'operatingProfit';
        return <SubtotalRow key={sec.id} label={sec.label} value={val} highlight={isHighlight} />;
      }

      const secKey = `${entityKey}_${sec.id}`;
      const total = getSectionTotal(subjectMap, sec.subjects);
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
          {isOpen && sec.subjects.map(subject => {
            const val = subjectMap[subject] || 0;
            if (val === 0) return null;
            return <DetailRow key={subject} label={subject} value={val} isIndented />;
          })}
        </React.Fragment>
      );
    });
  };

  const PLTable = ({ title, icon: Icon, structure, subjectMap, sums, entityKey, color }) => (
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
            {renderPL(structure, subjectMap, sums, entityKey)}
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
