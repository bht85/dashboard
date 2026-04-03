import React, { useState, useMemo } from 'react';
import { FileText, CheckCircle2, Search, CheckSquare, Sparkles, Zap } from 'lucide-react';
import { formatKRW, formatUSD } from '../utils/formatters';

const COMPOSE_SUBJECTS = {
  '공통': ['내부이체'],
  '매출': ['상품매출', '공사매출', '가맹비매출', '용역매출'],
  '매입': ['상품매출원가', '임원급여', '직원급여', '상여금', '퇴직급여', '복리후생비', '여비교통비', '접대비', '통신비', '수도광열비', '전력비', '세금과공과금', '감가상각비', '지급임차료', '보험료', '차량유지비', '운반비', '교육훈련비', '도서인쇄비', '사무용품비', '소모품비', '지급수수료', '광고선전비', '판매촉진비', '대손상각비', '건물관리비', '무형고정자산상각', '리스료', '이자수익', '배당금수익', '외환차익', '판매장려금', '잡이익', '외환차손', '기부금', '유형자산처분손실', '잡손실', '법인세등', '원재료(도급)', '복리후생비(도급)', '여비교통비(도급)', '접대비(도급)', '감가상각비(도급)', '보험료(도급)', '차량유지비(도급)', '운반비(도급)', '사무용품비(도급)', '소모품비(도급)', '지급수수료(도급)', '외주공사비(도급)']
};

const SMART_SUBJECTS = {
  '공통': ['내부이체'],
  '매출': ['제품매출'],
  '매입': ['원재료매입액(원가)', '급여(원가)', '퇴직급여(원가)', '상여금(원가)', '복리후생비(원가)', '여비교통비(원가)', '접대비(원가)', '통신비(원가)', '가스수도료(원가)', '전력비(원가)', '세금과공과금(원가)', '감가상각비(원가)', '보험료(원가)', '차량유지비(원가)', '운반비(원가)', '교육훈련비(원가)', '소모품비(원가)', '지급수수료(원가)', '외주가공비(원가)', '제품매출원가', '복리후생비', '지급수수료', '이자수익', '외환차익', '잡이익', '이자비용', '외환차손', '법인세등']
};

const AccountMappingPage = ({ withdrawals, selectedDate, onUpdateWithdrawals }) => {
  const [selectedSection, setSelectedSection] = useState('컴포즈커피');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unmapped', 'mapped'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [applyingAutoAll, setApplyingAutoAll] = useState(false);

  // ─── 예금주 기준 이전 매칭 이력 맵 생성 ───────────────────────────────
  // 전체 withdrawals에서 accountSubject가 있는 건 중 가장 최신 날짜 기준으로
  // payee → accountSubject 매핑 추출
  const payeeHistoryMap = useMemo(() => {
    const map = {};
    // 날짜 내림차순으로 정렬 후, 예금주별 첫 번째(가장 최신) 매칭 이력만 저장
    const sorted = [...withdrawals]
      .filter(w => w.payee && w.accountSubject)
      // 현재 선택일 제외(어제 이전 이력만 추천)
      .filter(w => w.paymentDate !== selectedDate)
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

    sorted.forEach(w => {
      if (!map[w.payee]) {
        map[w.payee] = {
          subject: w.accountSubject,
          date: w.paymentDate,
        };
      }
    });
    return map;
  }, [withdrawals, selectedDate]);

  // Filter withdrawals (현재 날짜)
  const targetWithdrawals = withdrawals.filter(w => {
    if (w.section !== selectedSection) return false;
    if (w.paymentDate !== selectedDate) return false;
    const isMapped = !!w.accountSubject;
    if (filterMode === 'unmapped' && isMapped) return false;
    if (filterMode === 'mapped' && !isMapped) return false;
    if (searchTerm && !(w.payee || '').includes(searchTerm) && !(w.memo || '').includes(searchTerm)) return false;
    return true;
  });

  // 자동 추천 가능한 미매칭 건 수
  const autoSuggestCount = targetWithdrawals.filter(
    w => !w.accountSubject && payeeHistoryMap[w.payee]
  ).length;

  const handleSubjectChange = async (id, subject) => {
    await onUpdateWithdrawals([{ id, subject }]);
  };

  // 개별 자동매칭 적용
  const handleAutoApply = async (w) => {
    const suggestion = payeeHistoryMap[w.payee];
    if (!suggestion) return;
    await onUpdateWithdrawals([{ id: w.id, subject: suggestion.subject }]);
  };

  // 전체 자동매칭 적용 (추천 가능한 미매칭 건 모두)
  const handleAutoApplyAll = async () => {
    const toApply = targetWithdrawals.filter(
      w => !w.accountSubject && payeeHistoryMap[w.payee]
    );
    if (toApply.length === 0) return;
    setApplyingAutoAll(true);
    try {
      const updates = toApply.map(w => ({
        id: w.id,
        subject: payeeHistoryMap[w.payee].subject,
      }));
      await onUpdateWithdrawals(updates);
    } finally {
      setApplyingAutoAll(false);
    }
  };

  const handleBulkApply = async () => {
    if (!bulkSubject) {
      alert('일괄 적용할 계정과목을 선택해주세요.');
      return;
    }
    if (selectedIds.length === 0) {
      alert('적용할 항목을 선택해주세요.');
      return;
    }
    const updates = selectedIds.map(id => ({ id, subject: bulkSubject }));
    await onUpdateWithdrawals(updates);
    setSelectedIds([]);
    setBulkSubject('');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(targetWithdrawals.map(w => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const getSubjects = (section) => {
    return section === '컴포즈커피' ? COMPOSE_SUBJECTS : SMART_SUBJECTS;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">계정과목 매칭</h2>
        <p className="text-sm text-slate-500">지급 예정된 출금 내역({selectedDate})에 대해 각각 올바른 계정과목을 지정합니다.</p>
      </div>

      {/* 자동 매칭 추천 배너 */}
      {autoSuggestCount > 0 && (
        <div className="mb-4 flex items-center gap-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-violet-900">
              자동 매칭 추천 {autoSuggestCount}건
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              예금주(지급처) 이전 매칭 이력 기반으로 계정과목을 자동 추천할 수 있습니다.
            </p>
          </div>
          <button
            onClick={handleAutoApplyAll}
            disabled={applyingAutoAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl shadow-md shadow-violet-200 transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            {applyingAutoAll ? '적용 중...' : `전체 자동 적용 (${autoSuggestCount}건)`}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* 상단 컨트롤러 */}
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => { setSelectedSection('컴포즈커피'); setSelectedIds([]); setBulkSubject(''); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${selectedSection === '컴포즈커피' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                컴포즈커피
              </button>
              <button 
                onClick={() => { setSelectedSection('스마트팩토리'); setSelectedIds([]); setBulkSubject(''); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${selectedSection === '스마트팩토리' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                스마트팩토리
              </button>
            </div>
            
            {/* 일괄 적용 UI */}
            <div className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-800 ml-2 whitespace-nowrap"><CheckSquare className="w-3 h-3 inline mr-1" />일괄 지정</span>
              <select 
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                className="bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-indigo-600 w-36"
              >
                <option value="">설정할 과목...</option>
                <optgroup label="■ 공통">
                  {getSubjects(selectedSection)['공통'].map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
                <optgroup label="■ 매출">
                  {getSubjects(selectedSection)['매출'].map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
                <optgroup label="■ 매입">
                  {getSubjects(selectedSection)['매입'].map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              </select>
              <button 
                onClick={handleBulkApply}
                disabled={selectedIds.length === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                적용 ({selectedIds.length})
              </button>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="예금주 또는 내용 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <select 
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none text-slate-600 cursor-pointer"
            >
              <option value="all">전체 보기</option>
              <option value="unmapped">미매칭 건만 보기</option>
              <option value="mapped">매칭 완료 건 보기</option>
            </select>
          </div>
        </div>

        {/* 메인 리스트 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3.5 border-r border-slate-100 font-bold w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={targetWithdrawals.length > 0 && selectedIds.length === targetWithdrawals.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-5 py-3.5 border-r border-slate-100 font-bold">은행/계좌</th>
                <th className="px-5 py-3.5 border-r border-slate-100 font-bold">예금주 (지급처)</th>
                <th className="px-5 py-3.5 border-r border-slate-100 font-bold text-right w-32">출금액</th>
                <th className="px-5 py-3.5 border-r border-slate-100 font-bold w-1/3">메모</th>
                <th className="px-5 py-3.5 font-bold w-72 text-center">계정과목 매칭</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="inline-flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-10 h-10 mb-3 text-slate-200" />
                      <p className="font-bold">조건에 맞는 출금 내역이 없습니다.</p>
                      <p className="text-xs mt-1">지급일({selectedDate})에 등록된 '{selectedSection}' 출금 내역을 확인해주세요.</p>
                    </div>
                  </td>
                </tr>
              ) : targetWithdrawals.map(w => {
                 const subjects = getSubjects(w.section);
                 const suggestion = !w.accountSubject ? payeeHistoryMap[w.payee] : null;

                 return (
                  <tr key={w.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(w.id) ? 'bg-indigo-50/20' : ''} ${!w.accountSubject ? 'bg-rose-50/10' : ''}`}>
                    <td className="px-5 py-3 border-r border-slate-100/50 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(w.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(prev => [...prev, w.id]);
                          else setSelectedIds(prev => prev.filter(id => id !== w.id));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-3 border-r border-slate-100/50">
                      <div className="font-bold text-slate-700">{w.bank}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{w.fromAccount || '-'}</div>
                    </td>
                    <td className="px-5 py-3 border-r border-slate-100/50">
                      <div className="font-black text-slate-800">{w.payee}</div>
                    </td>
                    <td className="px-5 py-3 border-r border-slate-100/50 text-right">
                      <span className="font-mono font-bold text-rose-500">
                        {w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3 border-r border-slate-100/50">
                      <p className="text-xs text-slate-500 truncate max-w-[200px]" title={w.memo}>{w.memo || '-'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        {/* 자동 추천 배지 (미매칭 + 이력 있을 때) */}
                        {suggestion && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAutoApply(w)}
                              title={`이전 매칭(${suggestion.date}) 기반 자동 적용`}
                              className="flex items-center gap-1 px-2 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-[10px] font-black transition-all active:scale-95 whitespace-nowrap border border-violet-200"
                            >
                              <Sparkles className="w-3 h-3" />
                              {suggestion.subject}
                            </button>
                            <span className="text-[9px] text-slate-400 whitespace-nowrap">← 추천</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <select 
                            value={w.accountSubject || ''}
                            onChange={(e) => handleSubjectChange(w.id, e.target.value)}
                            className={`flex-1 w-full bg-white border ${w.accountSubject ? 'border-indigo-300 text-indigo-700 shadow-sm' : 'border-rose-200 text-rose-600 bg-rose-50/50'} rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                          >
                            <option value="">-- 과목 미지정 --</option>
                            <optgroup label="■ 공통">
                              {subjects['공통'].map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                            <optgroup label="■ 매출">
                              {subjects['매출'].map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                            <optgroup label="■ 매입">
                              {subjects['매입'].map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                          </select>
                          {w.accountSubject && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountMappingPage;
