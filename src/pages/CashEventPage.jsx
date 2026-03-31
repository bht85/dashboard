import React, { useState } from 'react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Globe, CalendarPlus, List, LayoutGrid } from 'lucide-react';
import { formatKRW } from '../utils/formatters';

const CashEventPage = ({ cashFlowSchedules, onUpdateSchedule, onDeleteSchedule, fxSchedule, exchangeRate }) => {
  const [formData, setFormData] = useState({
    date: '',
    category: '',
    amount: '',
    type: 'OUTFLOW',
    entity: '컴포즈커피',
    desc: '',
    frequency: 'NONE', 
    endDate: '',
    weekDay: '1',
    monthDay: '1',
  });
  const [viewMode, setViewMode] = useState('board'); // 'list' | 'board'
  const [boardYear, setBoardYear] = useState(new Date().getFullYear());
  const [listYear, setListYear] = useState(new Date().getFullYear());
  const [listMonth, setListMonth] = useState(new Date().getMonth() + 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.category || !formData.amount || !formData.entity) return;

    let endDateObj = null;
    if (formData.frequency !== 'NONE') {
       if (!formData.endDate) {
           alert("종료일을 선택해주세요."); return;
       }
       endDateObj = new Date(formData.endDate);
       if (endDateObj < new Date(formData.date)) {
           alert("종료일은 최초 예정일(시작일) 이후여야 합니다."); return;
       }
    }

    const [yyyy, mm, dd] = formData.date.split('-').map(Number);
    const startDateObj = new Date(yyyy, mm - 1, dd);
    const groupId = Date.now().toString();
    const schedulesToRun = [];

    let currDate = new Date(startDateObj);
    let iterations = 0;
    
    // 일정 추가 헬퍼 함수
    const pushSchedule = (dateObj) => {
        const padMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const padDay = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${dateObj.getFullYear()}-${padMonth}-${padDay}`;
        
        schedulesToRun.push({
          id: `${groupId}_${iterations}`,
          groupId: formData.frequency !== 'NONE' ? groupId : null,
          date: formattedDate,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          entity: formData.entity,
          desc: formData.desc,
          currency: 'KRW',
        });
        iterations++;
    }

    if (formData.frequency === 'NONE') {
        pushSchedule(new Date(startDateObj));
    } 
    else if (formData.frequency === 'DAILY') {
        while (currDate <= endDateObj && iterations < 1500) {
            pushSchedule(currDate);
            currDate.setDate(currDate.getDate() + 1);
        }
    }
    else if (formData.frequency === 'WEEKLY') {
        const targetDay = parseInt(formData.weekDay, 10);
        // 최초 예정일 이후로 다가오는 해당 요일 찾기
        while (currDate.getDay() !== targetDay) {
            currDate.setDate(currDate.getDate() + 1);
        }
        while (currDate <= endDateObj && iterations < 500) {
            pushSchedule(currDate);
            currDate.setDate(currDate.getDate() + 7);
        }
    }
    else if (formData.frequency === 'MONTHLY') {
        const targetDate = parseInt(formData.monthDay, 10);
        let cy = currDate.getFullYear();
        let cm = currDate.getMonth();
        while (iterations < 240) {
            let nDate;
            if (targetDate === 32) { // 말일
                nDate = new Date(cy, cm + 1, 0); 
            } else {
                nDate = new Date(cy, cm, 1);
                const last = new Date(cy, cm + 1, 0).getDate();
                nDate.setDate(targetDate > last ? last : targetDate);
            }
            // 범위 체크
            const pMon = String(nDate.getMonth() + 1).padStart(2, '0');
            const pDay = String(nDate.getDate()).padStart(2, '0');
            const lFmt = `${nDate.getFullYear()}-${pMon}-${pDay}`;
            
            if (new Date(lFmt) > endDateObj) break;
            
            // 최초 예정일과 같거나 이후인 경우만 스케줄에 생성
            if (new Date(lFmt) >= startDateObj) {
                pushSchedule(nDate);
            }
            cm++;
            if (cm > 11) { cm = 0; cy++; }
        }
    }
    else if (formData.frequency === 'YEARLY') {
        let y = yyyy;
        while (iterations < 20) { 
            let nDate = new Date(y, mm - 1, 1);
            const last = new Date(y, mm, 0).getDate();
            nDate.setDate(dd > last ? last : dd);
            
            const pMon = String(nDate.getMonth() + 1).padStart(2, '0');
            const pDay = String(nDate.getDate()).padStart(2, '0');
            const lFmt = `${nDate.getFullYear()}-${pMon}-${pDay}`;
            
            if (new Date(lFmt) > endDateObj) break;
            if (new Date(lFmt) >= startDateObj) {
                pushSchedule(nDate);
            }
            y++;
        }
    }

    if (schedulesToRun.length === 0) {
        alert("선택한 범위와 조건 내에 일치하는 날짜가 없어 생성될 일정이 없습니다.");
        return;
    }

    if (schedulesToRun.length > 365) {
        if(!window.confirm(`일정이 엄청나게 많이(${schedulesToRun.length}건) 생성됩니다. 계속 진행할까요?`)) return;
    }

    try {
        await Promise.all(schedulesToRun.map(s => onUpdateSchedule(s)));
        setFormData({
            date: '',
            category: '',
            amount: '',
            type: 'OUTFLOW',
            entity: '컴포즈커피',
            desc: '',
            frequency: 'NONE',
            endDate: '',
            weekDay: '1',
            monthDay: '1',
        });
        alert(`총 ${schedulesToRun.length}건의 일정이 성공적으로 등록되었습니다.`);
    } catch (err) {
        console.error(err);
        alert("일정 등록 오류: 잠시 후 다시 시도해주세요.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("이 예정 스케줄을 삭제하시겠습니까?")) {
      await onDeleteSchedule(id);
    }
  };

  const handleBulkDelete = async (entity, type, category) => {
    const toDelete = currentYearData.filter(s => 
      !s.isReadOnly && 
      s.entity === entity && 
      s.type === type && 
      s.category === category
    );

    if (toDelete.length === 0) {
      alert("삭제할 수 있는 직접 등록 데이터가 없거나, 자동연동 데이터입니다.");
      return;
    }

    if (window.confirm(`[${category}] 항목의 ${boardYear}년도 데이터 총 ${toDelete.length}건을 일괄 삭제하시겠습니까?`)) {
      try {
        await Promise.all(toDelete.map(s => onDeleteSchedule(s.id)));
        alert("일괄 삭제가 완료되었습니다.");
      } catch (err) {
        console.error(err);
        alert("일괄 삭제 중 오류가 발생했습니다.");
      }
    }
  };

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

  const entities = Array.from(new Set(mergedSchedules.map(s => s.entity || '기타')));
  entities.sort((a, b) => {
      if (a === '컴포즈커피') return -1;
      if (b === '컴포즈커피') return 1;
      if (a === '스마트팩토리') return -1;
      if (b === '스마트팩토리') return 1;
      return a.localeCompare(b);
  });

  const getSchedules = (ent, typ) => mergedSchedules.filter(s => {
    const d = new Date(s.date);
    return s.entity === ent && 
           s.type === typ && 
           d.getFullYear() === listYear && 
           (d.getMonth() + 1) === listMonth;
  });

  const formatThousands = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return '0';
    return Math.round(val / 1000).toLocaleString();
  };

  const renderTable = (items, type) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-[11.5px] border-collapse bg-white">
        <thead className={`${type === 'INFLOW' ? 'bg-blue-50/50 text-blue-500' : 'bg-red-50/50 text-red-500'} font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]`}>
          <tr>
            <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">날짜</th>
            <th className="px-4 py-3 border-r border-slate-200">항목</th>
            <th className="px-4 py-3 border-r border-slate-200 text-right">예상 금액 (천원)</th>
            <th className="px-4 py-3 border-r border-slate-200">메모 (Desc)</th>
            <th className="px-4 py-3 text-center">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-600">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap w-[100px]">{item.date}</td>
              <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-600">
                <div className="flex items-center gap-1.5">
                  {item.isReadOnly && <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                  {item.category}
                </div>
              </td>
              <td className="px-4 py-3 border-r border-slate-200 text-right font-mono font-black tabular-nums text-slate-800 w-[150px]">
                {formatThousands(item.amount)}
                {item.currency === 'USD' && (
                  <p className="text-[9px] text-blue-500 italic font-bold">({item.originalAmount?.toLocaleString()} USD)</p>
                )}
              </td>
              <td className="px-4 py-3 border-r border-slate-200 text-slate-500 max-w-[200px] truncate" title={item.desc}>{item.desc}</td>
              <td className="px-4 py-3 text-center w-[60px]">
                {item.isReadOnly ? (
                  <span className="text-[9px] text-slate-400 italic font-bold">자동연동</span>
                ) : (
                  <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const currentYearData = mergedSchedules.filter(s => new Date(s.date).getFullYear() === boardYear);
  const pivotMap = {};
  currentYearData.forEach(item => {
    const key = `${item.entity}|${item.type}|${item.category}`; 
    if (!pivotMap[key]) {
      pivotMap[key] = {
        entity: item.entity,
        type: item.type,
        category: item.category,
        amounts: Array(12).fill(0),
        total: 0,
        isReadOnly: item.isReadOnly // 행 전체가 읽기 전용인지 판단 (하나라도 ReadOnly면 true 처리하거나, 그룹 단위 판단)
      };
    }
    // 하나라도 ReadOnly가 아니면 삭제 가능하도록 처리 (또는 외화송금 전용 처리)
    if (item.isReadOnly) pivotMap[key].isReadOnly = true; 
    
    const monthIndex = new Date(item.date).getMonth();
    pivotMap[key].amounts[monthIndex] += parseFloat(item.amount) || 0;
    pivotMap[key].total += parseFloat(item.amount) || 0;
  });

  const pivotRows = Object.values(pivotMap).sort((a, b) => {
     if(a.entity !== b.entity) return a.entity.localeCompare(b.entity);
     if(a.type !== b.type) return b.type.localeCompare(a.type);
     return a.category.localeCompare(b.category);
  });

  const renderBoardTable = (rows, type) => {
    if (rows.length === 0) return null;
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
         <table className="w-full text-right text-[11.5px] border-collapse bg-white whitespace-nowrap">
           <thead className={`${type === 'INFLOW' ? 'bg-blue-50/50 text-blue-500' : 'bg-red-50/50 text-red-500'} font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]`}>
             <tr>
               <th className="px-4 py-3 border-r border-slate-200 text-left">구분(항목)</th>
               {Array.from({length: 12}).map((_, i) => (
                  <th key={`th-${i}`} className="px-3 py-3 border-r border-slate-200 text-center min-w-[80px]">{i + 1}월</th>
               ))}
               <th className="px-4 py-3 text-center tracking-widest min-w-[100px]">소계 (합산 천원)</th>
               <th className="px-4 py-3 text-center tracking-widest min-w-[50px]">관리</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
             {rows.map((row, idx) => (
               <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-700 text-left bg-white truncate max-w-[200px]" title={row.category}>{row.category}</td>
                  {row.amounts.map((amt, mIdx) => (
                     <td key={mIdx} className="px-3 py-3 border-r border-slate-200 tabular-nums">
                        {amt !== 0 ? formatThousands(amt) : <span className="text-slate-300">-</span>}
                     </td>
                  ))}
                  <td className="px-4 py-3 text-right font-black text-indigo-700 tabular-nums bg-indigo-50/30">
                     {formatThousands(row.total)}
                  </td>
                  <td className="px-4 py-3 text-center bg-white border-l border-slate-100">
                    {row.isReadOnly ? (
                      <span className="text-[8px] text-slate-300 italic font-bold">고정</span>
                    ) : (
                      <button 
                        onClick={() => handleBulkDelete(row.entity, row.type, row.category)}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors transition-all active:scale-90"
                        title="해당 연도 항목 일체 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    );
  };

  const renderMonthlyBoard = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-2">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                월별 종합 요약 보드
             </h3>
             <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
               <button onClick={() => setBoardYear(boardYear - 1)} className="px-3 py-1 hover:bg-slate-50 border-r border-slate-200 text-slate-600 font-bold">&lt;</button>
               <span className="px-4 py-1 text-xs font-black text-indigo-600 bg-indigo-50/50 flex items-center">{boardYear}년</span>
               <button onClick={() => setBoardYear(boardYear + 1)} className="px-3 py-1 hover:bg-slate-50 border-l border-slate-200 text-slate-600 font-bold">&gt;</button>
             </div>
         </div>
      </div>

      {entities.map(ent => {
         const entRows = pivotRows.filter(r => r.entity === ent);
         const inflows = entRows.filter(r => r.type === 'INFLOW');
         const outflows = entRows.filter(r => r.type === 'OUTFLOW');
         
         return (
            <div key={ent} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg uppercase tracking-tight">
                   {ent}
                </h3>
              </div>
              
              <div className="p-6">
                 {inflows.length > 0 && (
                     <div>
                        <h4 className="text-sm font-black text-blue-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <ArrowDownRight className="w-4 h-4" /> 입금 스케줄
                        </h4>
                        {renderBoardTable(inflows, 'INFLOW')}
                     </div>
                 )}

                 {outflows.length > 0 && (
                     <div>
                        <h4 className="text-sm font-black text-red-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <ArrowUpRight className="w-4 h-4" /> 출금 스케줄
                        </h4>
                        {renderBoardTable(outflows, 'OUTFLOW')}
                     </div>
                 )}
                 
                 {inflows.length === 0 && outflows.length === 0 && (
                    <div className="text-center py-8 text-slate-400 italic font-bold text-sm border border-slate-200 rounded-xl">
                       선택한 연도({boardYear}년)에 해당 법인으로 등록된 일정이 없습니다.
                    </div>
                 )}
              </div>
            </div>
         );
      })}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2 flex items-center gap-2">
          <CalendarPlus className="w-6 h-6 text-indigo-500" /> 자금 이벤트 등록
        </h2>
        <p className="text-sm text-slate-500">
          기존 데이터(외화 송금 등)의 간섭 없이 독립적으로 미래 입출금을 등록하고 관리합니다. 
          외화 결제 대기 건들은 자동으로 함께 표시됩니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 slide-in-from-bottom-2 animate-in">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> 신규 자금 이벤트 등록
        </h3>
        
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 border-b border-slate-100 pb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">최초 예정일</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">입출금 유형</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="OUTFLOW">출금 (지출)</option>
                <option value="INFLOW">입금 (수입)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">구분(항목)</label>
              <input type="text" name="category" placeholder="ex) 임대료, 급여, 통신비" value={formData.category} onChange={handleChange} required className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">금액 (원)</label>
              <input type="number" name="amount" placeholder="금액 입력" value={formData.amount} onChange={handleChange} required className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">귀속 법인</label>
              <select name="entity" value={formData.entity} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="컴포즈커피">컴포즈커피</option>
                <option value="스마트팩토리">스마트팩토리</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">메모</label>
              <input type="text" name="desc" placeholder="참고사항" value={formData.desc} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">반복 일정 설정</label>
                <select name="frequency" value={formData.frequency} onChange={handleChange} className="w-40 text-sm font-bold bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900">
                  <option value="NONE">반복 없음 (단건설정)</option>
                  <option value="DAILY">매일 반복</option>
                  <option value="WEEKLY">매주 반복</option>
                  <option value="MONTHLY">매월 고정일 반복</option>
                  <option value="YEARLY">매년 고정일 반복 (세금)</option>
                </select>
              </div>
              
              {formData.frequency !== 'NONE' && (
                <div className="animate-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">반복 종료일</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="w-32 text-sm font-bold bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900" />
                </div>
              )}

              {formData.frequency === 'WEEKLY' && (
                <div className="animate-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">반복 요일</label>
                  <select name="weekDay" value={formData.weekDay} onChange={handleChange} className="w-24 text-sm font-bold bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900">
                    <option value="1">월요일</option>
                    <option value="2">화요일</option>
                    <option value="3">수요일</option>
                    <option value="4">목요일</option>
                    <option value="5">금요일</option>
                    <option value="6">토요일</option>
                    <option value="0">일요일</option>
                  </select>
                </div>
              )}

              {formData.frequency === 'MONTHLY' && (
                <div className="animate-in slide-in-from-left-2">
                  <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">반복 일자</label>
                  <select name="monthDay" value={formData.monthDay} onChange={handleChange} className="w-24 text-sm font-bold bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900">
                    {Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}일</option>)}
                    <option value="32">말일</option>
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="bg-indigo-600 text-white font-black px-8 py-2.5 rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center whitespace-nowrap active:scale-95">
               {formData.frequency === 'NONE' ? '이벤트 단건 등록' : `조건에 맞춰 스케줄 일괄 자동 생성`}
            </button>
          </div>
        </form>
      </div>

      <div className="flex justify-between items-center mb-6 animate-in fade-in">
         <div className="flex gap-2">
            {viewMode === 'list' && (
              <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm items-center px-1">
                <select 
                  value={listYear} 
                  onChange={(e) => setListYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-xs font-black text-indigo-600 outline-none bg-transparent"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <div className="w-[1px] h-4 bg-slate-200"></div>
                <select 
                  value={listMonth} 
                  onChange={(e) => setListMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-xs font-black text-indigo-600 outline-none bg-transparent"
                >
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
                </select>
              </div>
            )}
         </div>
         <div className="flex gap-2">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-[11px] font-black rounded-xl transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                <List className="w-4 h-4" /> 세부 내역 리스트 뷰
            </button>
            <button onClick={() => setViewMode('board')} className={`px-4 py-2 text-[11px] font-black rounded-xl transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                <LayoutGrid className="w-4 h-4" /> 월별 종합 (가로 테이블) 뷰
            </button>
         </div>
      </div>

      {viewMode === 'board' && renderMonthlyBoard()}

      {viewMode === 'list' && (
      <div className="space-y-6 animate-in slide-in-from-bottom-3">
        {entities.map(ent => (
            <div key={ent} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg uppercase tracking-tight">
                   {ent}
                </h3>
                <span className="text-[10px] font-black tracking-widest text-slate-400 bg-white px-3 py-1 border border-slate-200 rounded-full">
                    {listYear}년 {listMonth}월 데이터
                </span>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                 {(() => {
                    const inflows = getSchedules(ent, 'INFLOW');
                    return inflows.length > 0 && (
                        <div>
                           <h4 className="text-sm font-black text-blue-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                               <ArrowDownRight className="w-4 h-4" /> 입금 스케줄
                           </h4>
                           {renderTable(inflows, 'INFLOW')}
                        </div>
                    )
                 })()}

                 {(() => {
                    const outflows = getSchedules(ent, 'OUTFLOW');
                    return outflows.length > 0 && (
                        <div>
                           <h4 className="text-sm font-black text-red-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                               <ArrowUpRight className="w-4 h-4" /> 출금 스케줄
                           </h4>
                           {renderTable(outflows, 'OUTFLOW')}
                        </div>
                    )
                 })()}
                 
                 {getSchedules(ent, 'INFLOW').length === 0 && getSchedules(ent, 'OUTFLOW').length === 0 && (
                    <div className="text-center py-8 text-slate-400 italic font-bold text-sm">
                       해당 법인에 등록된 일정 데이터가 없습니다.
                    </div>
                 )}
              </div>
            </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default CashEventPage;
