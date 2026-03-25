import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Database, ArrowRight, Loader2, Landmark, Calendar } from 'lucide-react';
import { formatKRW } from '../utils/formatters';
import * as XLSX from 'xlsx';

const CashStatusPage = ({ 
  selectedDate: initialDate, 
  dailyStatuses, 
  setDailyStatuses,
  exchangeRate = 1
}) => {
  const [recordDate, setRecordDate] = useState(initialDate);
  const [activeEntity, setActiveEntity] = useState('컴포즈커피');
  const [cashLogs, setCashLogs] = useState([]);
  const uploadedDates = Object.keys(dailyStatuses);
  const [isParsing, setIsParsing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Refined parsing logic for data integrity
        let currentEntity = '';
        let currentGroup = '';
        const parsed = [];

        data.forEach((row, idx) => {
          if (idx < 1) return; // Skip header

          const valEntity = row[0] ? String(row[0]).trim() : '';
          const valGroup = row[1] ? String(row[1]).trim() : '';
          const valBank = row[2] ? String(row[2]).trim() : '';
          const valAccount = row[3] ? String(row[3]).trim() : '';
          const valCurrency = row[6] ? String(row[6]).trim() : 'KRW';

          // Update sticky values
          if (valEntity && !valEntity.includes('계') && !valEntity.includes('합계')) {
            currentEntity = valEntity;
          }
          if (valGroup && !valGroup.includes('계')) {
            currentGroup = valGroup;
          }

          if (!valAccount && !valBank) return;
          if (valEntity.includes('총계') || valEntity.includes('합계') || valGroup.includes('소계')) return;

          const cleanNum = (v) => {
            if (v === undefined || v === null || v === '' || v === '-') return 0;
            const cleaned = String(v).replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned) || 0;
          };

          parsed.push({
            id: Date.now() + idx,
            entity: currentEntity,
            group: currentGroup,
            bank: valBank,
            account: valAccount,
            nickname: row[4] || '',
            type: row[5] || '',
            currency: valCurrency,
            prevBalance: cleanNum(row[7]),
            deposits: cleanNum(row[8]),
            withdrawals: cleanNum(row[9]),
            totalBalance: cleanNum(row[10])
          });
        });

        setCashLogs(parsed);
      } catch (err) {
        console.error(err);
        alert('엑셀 분석 중 오류가 발생했습니다.');
      } finally {
        setIsParsing(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    if (cashLogs.length === 0) return;
    
    const currentStatus = dailyStatuses[recordDate] || { inflow: 0, outflow: 0, totalBalance: 0, netChange: 0, details: [] };

    // --- 탭(activeEntity) 기반 강제 정렬 및 덮어쓰기 로직 ---
    // 1. 이번 업로드 파일의 모든 데이터를 현재 선택된 탭(법인)으로 강제 매핑
    // (사용자가 선택한 탭이 데이터의 실제 주처가 되도록 하여 업로드 실수 방지)
    const correctedLogs = cashLogs.map(log => ({
      ...log,
      entity: activeEntity
    }));
    
    // 2. 기존 데이터에서 현재 선택된 법인의 데이터만 제거 (마지막 업로드 우선)
    const otherDetails = (currentStatus.details || []).filter(d => 
      !d.entity || !(d.entity.includes(activeEntity) || activeEntity.includes(d.entity))
    );
    
    // 3. 기존의 다른 법인 데이터와 이번에 새로 교정된 해당 법인의 데이터를 합침
    const mergedDetails = [...otherDetails, ...correctedLogs];

    const statusData = {
      // 요약 필드는 KRW 중심으로 유지하되, USD 정보는 details에 보존
      inflow: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.deposits : 0), 0),
      outflow: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.withdrawals : 0), 0),
      totalBalance: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.totalBalance : 0), 0),
      netChange: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? (i.deposits - i.withdrawals) : 0), 0),
      details: mergedDetails
    };

    // DB worker call (App.jsx -> saveDailyStatus)
    await setDailyStatuses(recordDate, statusData);

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setCashLogs([]);
    }, 3000);
  };

  // 월간 업로드 현황 데이터 생성
  const getDaysInMonth = (date) => {
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const days = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const status = dailyStatuses[dateStr];
        const hasCompose = status?.details?.some(d => d.entity.includes('컴포즈')) || false;
        const hasSmart = status?.details?.some(d => d.entity.includes('스마트')) || false;
        
        days.push({
          day: i,
          date: dateStr,
          isUploaded: hasCompose && hasSmart,
          hasCompose,
          hasSmart
        });
    }
    return days;
  };

  const monthlyDays = getDaysInMonth(recordDate);
  const missingCount = monthlyDays.filter(d => !d.isUploaded && new Date(d.date) <= new Date()).length;


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">일일 자금 업로드</h2>
          <p className="text-sm text-slate-500">각 법인별 계좌의 통화별 입출금 내역 및 잔액을 매일 기록합니다.</p>
        </div>
        {isSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-black uppercase">기록 및 시재 확정 완료!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Step 1: 법인 및 날짜 선택 */}
        <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1">기록 대상 법인</label>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                        onClick={() => setActiveEntity('컴포즈커피')}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeEntity === '컴포즈커피' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        컴포즈커피
                    </button>
                    <button 
                        onClick={() => setActiveEntity('스마트팩토리')}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeEntity === '스마트팩토리' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        스마트팩토리
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">시재 기록일</h3>
                </div>
                <input 
                type="date" 
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                />
            </div>
        </div>

        {/* Step 2: 엑셀 업로드 */}
        <div className="lg:col-span-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`h-full cursor-pointer group relative overflow-hidden bg-white border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${cashLogs.length > 0 ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'}`}
          >
            <div className="flex items-center justify-center gap-6">
              <div className="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-inner">
                {isParsing ? (
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                ) : (
                  <Upload className={`w-6 h-6 ${cashLogs.length > 0 ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                )}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-800 text-sm">2단계: {activeEntity} 시재 엑셀 업로드</h4>
                <p className="text-xs text-slate-400 mt-1">{recordDate} [{activeEntity}] 자금 현황 엑셀을 선택해 주세요.</p>
              </div>
              <div className="ml-auto">
                <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[11px] font-bold hover:bg-indigo-600 transition-colors shadow-lg">
                  {isParsing ? '파일 분석 중...' : '파일 찾기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 시재 현황 데이터 표시 (프리뷰 또는 확정 데이터) */}
      {(cashLogs.length > 0 || (dailyStatuses[recordDate] && dailyStatuses[recordDate].details && dailyStatuses[recordDate].details.length > 0)) && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-500" /> 
                  {cashLogs.length > 0 ? '시재 현황 데이터 프리뷰 (저장 전)' : `${recordDate} 확정 시재 현황 리포트`}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-6">
                  {cashLogs.length > 0 ? '업로드된 파일 분석 결과' : `${activeEntity} 승인된 기록`}
                </p>
              </div>
              {cashLogs.length > 0 ? (
                <div className="text-right flex gap-6 items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">총 입금 합계</p>
                    <div className="text-base font-bold text-blue-600 tabular-nums">{formatKRW(cashLogs.reduce((s, i) => s + (i.currency === 'KRW' ? i.deposits : 0), 0))}</div>
                    {cashLogs.some(i => i.currency === 'USD') && <div className="text-[10px] text-blue-400 font-black tabular-nums">{formatUSD(cashLogs.reduce((s, i) => s + (i.currency === 'USD' ? i.deposits : 0), 0))}</div>}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">총 출금 합계</p>
                    <div className="text-base font-bold text-red-600 tabular-nums">{formatKRW(cashLogs.reduce((s, i) => s + (i.currency === 'KRW' ? i.withdrawals : 0), 0))}</div>
                    {cashLogs.some(i => i.currency === 'USD') && <div className="text-[10px] text-red-400 font-black tabular-nums">{formatUSD(cashLogs.reduce((s, i) => s + (i.currency === 'USD' ? i.withdrawals : 0), 0))}</div>}
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  Finalized Data
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-[11px] border-collapse bg-white">
                <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200 sticky top-0 font-bold z-10">
                  <tr>
                    <th className="px-3 py-3 border-r border-slate-100">구분</th>
                    <th className="px-3 py-3 border-r border-slate-100">은행</th>
                    <th className="px-3 py-3 border-r border-slate-100 italic">계좌번호</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-indigo-600">별칭 (Nickname)</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-center">통화</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right">전일잔액</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right text-blue-600">입금액</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right text-red-600">출금액</th>
                    <th className="px-3 py-3 text-right bg-slate-50 font-black">당일총잔액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cashLogs.length > 0 ? cashLogs : (dailyStatuses[recordDate]?.details || []).filter(d => d.entity.includes(activeEntity) || activeEntity.includes(d.entity))).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-700">{item.entity}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100">{item.bank}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-400">{item.account}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 font-black text-slate-900">{item.nickname || item.type || '-'}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.currency === 'KRW' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                          {item.currency}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-100 text-right tabular-nums text-slate-400">{item.currency === 'KRW' ? formatKRW(item.prevBalance) : item.prevBalance.toLocaleString()}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-blue-600 tabular-nums">{item.currency === 'KRW' ? formatKRW(item.deposits) : item.deposits.toLocaleString()}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-red-600 tabular-nums">{item.currency === 'KRW' ? formatKRW(item.withdrawals) : item.withdrawals.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-black bg-slate-50/50 tabular-nums text-slate-900">{item.currency === 'KRW' ? formatKRW(item.totalBalance) : item.totalBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  {cashLogs.length === 0 && (dailyStatuses[recordDate]?.details || []).filter(d => d.entity.includes(activeEntity) || activeEntity.includes(d.entity)).length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-slate-400 italic">
                        {recordDate} [{activeEntity}]에 해당하는 저장 내역이 없습니다. 엑셀을 업로드해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {cashLogs.length > 0 && (
              <div className="p-5 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <p className="text-xs text-slate-400">
                    확인 버튼 클릭 시 <span className="text-indigo-500 font-bold">{activeEntity}</span>의 데이터가 <span className="text-amber-400 font-bold">{recordDate}</span> 자금 일보 리포트에 병합 저장되며 **기존 기록을 대체**합니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCashLogs([])} className="px-6 py-3.5 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all">취소</button>
                  <button 
                    onClick={handleSave}
                    className={`flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 ${activeEntity === '컴포즈커피' ? 'bg-indigo-600 shadow-indigo-900 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-900 hover:bg-emerald-700'}`}
                  >
                    {activeEntity} 시재 확정 및 저장 <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 3. 월간 업로드 현황 (Toggle) */}
      <div className="mt-12">
        <button 
          onClick={() => setIsStatusOpen(!isStatusOpen)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4 group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">{isStatusOpen ? '월간 업로드 현황 숨기기' : '월간 업로드 현황 확인'}</span>
        </button>

        {isStatusOpen && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h4 className="font-black text-slate-900 text-xl tracking-tight">자금 시재 업로드 현황</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Monthly Completion Status & Entity Breakdown
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >GRID</button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >LIST</button>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex gap-3">
                    <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl border border-rose-100 flex items-center gap-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase">누락</span>
                    <span className="text-sm font-black tracking-tight">{missingCount}일</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase">완료</span>
                    <span className="text-sm font-black tracking-tight">{monthlyDays.filter(d => d.isUploaded).length}일</span>
                    </div>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-31 gap-3">
                {monthlyDays.map((d) => (
                    <div 
                    key={d.day}
                    title={`${d.date} - ${d.hasCompose ? '컴포즈 완료' : '컴포즈 누락'} / ${d.hasSmart ? '스마트 완료' : '스마트 누락'}`}
                    className={`aspect-square flex flex-col items-center justify-between p-2 rounded-2xl border text-[11px] font-black transition-all group hover:scale-105 hover:shadow-lg ${
                        d.isUploaded 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                        : (d.hasCompose || d.hasSmart) ? 'bg-indigo-50/30 border-indigo-100 text-indigo-400' : 'bg-slate-50 border-slate-100 text-slate-300'
                    } ${d.date === recordDate ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}`}
                    >
                    <span className="opacity-40">{d.day}</span>
                    <div className="flex gap-0.5 mt-auto">
                        <div className={`w-1.5 h-1.5 rounded-full ${d.hasCompose ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                        <div className={`w-1.5 h-1.5 rounded-full ${d.hasSmart ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="overflow-hidden border border-slate-100 rounded-2xl bg-slate-50/30">
                    <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-slate-100/50 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                            <tr>
                                <th className="px-6 py-3 border-r border-white">날짜</th>
                                <th className="px-6 py-3 border-r border-white">컴포즈커피</th>
                                <th className="px-6 py-3 border-r border-white">스마트팩토리</th>
                                <th className="px-6 py-3 text-center">전체 상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white">
                            {monthlyDays.map(d => (
                                <tr key={d.day} className={`hover:bg-white transition-colors ${d.date === recordDate ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-400">{d.date}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${d.hasCompose ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                                            <span className={`font-bold ${d.hasCompose ? 'text-slate-700' : 'text-slate-300'}`}>{d.hasCompose ? '업로드 완료' : '미완료'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${d.hasSmart ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                            <span className={`font-bold ${d.hasSmart ? 'text-slate-700' : 'text-slate-300'}`}>{d.hasSmart ? '업로드 완료' : '미완료'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {d.isUploaded ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">COMPLETE</span>
                                        ) : (d.hasCompose || d.hasSmart) ? (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">PARTIAL</span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">MISSING</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">컴포즈커피 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">스마트팩토리 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 bg-slate-100 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">미완료/대기</span>
              </div>
              <div className="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">
                Last Sync: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashStatusPage;
