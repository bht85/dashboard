import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Database, ArrowRight, Loader2, Landmark, Calendar } from 'lucide-react';
import { formatKRW } from '../utils/formatters';
import * as XLSX from 'xlsx';

const CashStatusPage = ({ selectedDate: globalSelectedDate, dailyStatuses, setDailyStatuses }) => {
  const [recordDate, setRecordDate] = useState(globalSelectedDate);
  const [activeEntity, setActiveEntity] = useState('컴포즈커피');
  const [cashLogs, setCashLogs] = useState([]);
  const [uploadedDates, setUploadedDates] = useState(Object.keys(dailyStatuses));
  const [isParsing, setIsParsing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
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

  const handleSave = () => {
    if (cashLogs.length === 0) return;
    
    // 업로드 완료 날짜 및 실제 데이터 연동 (법인별 데이터 유지/병합)
    const currentStatus = dailyStatuses[recordDate] || { inflow: 0, outflow: 0, totalBalance: 0, netChange: 0, details: [] };
    
    // 현재 업로드한 로우들만 추출 (필터링이 이미 되어있겠지만 확실히 함)
    const entityRows = cashLogs.filter(row => row.entity.includes(activeEntity));
    
    // 기존 데이터에서 현재 법인 데이터 제외하고 새 데이터와 합침
    const otherDetails = currentStatus.details.filter(d => !d.entity.includes(activeEntity));
    const mergedDetails = [...otherDetails, ...cashLogs];

    const statusData = {
      inflow: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.deposits : 0), 0),
      outflow: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.withdrawals : 0), 0),
      totalBalance: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? i.totalBalance : 0), 0),
      netChange: mergedDetails.reduce((s, i) => s + (i.currency === 'KRW' ? (i.deposits - i.withdrawals) : 0), 0),
      details: mergedDetails
    };

    setDailyStatuses({
        ...dailyStatuses,
        [recordDate]: statusData
    });

    if (!uploadedDates.includes(recordDate)) {
      setUploadedDates([...uploadedDates, recordDate]);
    }

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
      days.push({
        day: i,
        date: dateStr,
        isUploaded: uploadedDates.includes(dateStr)
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">자금 시재 현황 관리</h2>
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

      {cashLogs.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-500" /> 시재 현황 데이터 프리뷰
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-6">{recordDate} 기준 데이터</p>
              </div>
              <div className="text-right flex gap-6 items-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">총 입금 합계 (KRW)</p>
                  <span className="text-base font-bold text-blue-600 tabular-nums">{formatKRW(cashLogs.reduce((s, i) => s + (i.currency === 'KRW' ? i.deposits : 0), 0))}</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">총 출금 합계 (KRW)</p>
                  <span className="text-base font-bold text-red-600 tabular-nums">{formatKRW(cashLogs.reduce((s, i) => s + (i.currency === 'KRW' ? i.withdrawals : 0), 0))}</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-[11px] border-collapse bg-white">
                <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200 sticky top-0 font-bold z-10">
                  <tr>
                    <th className="px-3 py-3 border-r border-slate-100">구분</th>
                    <th className="px-3 py-3 border-r border-slate-100">은행</th>
                    <th className="px-3 py-3 border-r border-slate-100 italic">계좌번호</th>
                    <th className="px-3 py-3 border-r border-slate-100">별칭</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-center">통화</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right">전일잔액</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right text-blue-600">입금액</th>
                    <th className="px-3 py-3 border-r border-slate-100 text-right text-red-600">출금액</th>
                    <th className="px-3 py-3 text-right bg-slate-50 font-black">당일총잔액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-700">{item.entity}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100">{item.bank}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-400">{item.account}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 truncate max-w-[80px] text-slate-500">{item.nickname}</td>
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
                </tbody>
              </table>
            </div>
            
            <div className="p-5 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">
                  확인 버튼 클릭 시 <span className="text-indigo-500 font-bold">{activeEntity}</span>의 데이터가 <span className="text-amber-400 font-bold">{recordDate}</span> 자금 일보 리포트에 병합 저장됩니다.
                </p>
              </div>
              <button 
                onClick={handleSave}
                className={`flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 ${activeEntity === '컴포즈커피' ? 'bg-indigo-600 shadow-indigo-900 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-900 hover:bg-emerald-700'}`}
              >
                {activeEntity} 시재 확정 및 저장 <ArrowRight className="w-5 h-5" />
              </button>
            </div>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">3월 시재 업로드 현황</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Monthly Completion Status</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2">
                  <span className="text-[10px] font-black">누락</span>
                  <span className="text-sm font-black">{missingCount}일</span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                  <span className="text-[10px] font-black">완료</span>
                  <span className="text-sm font-black">{monthlyDays.filter(d => d.isUploaded).length}일</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-31 gap-2">
              {monthlyDays.map((d) => (
                <div 
                  key={d.day}
                  title={d.date}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-[10px] font-bold transition-all ${
                    d.isUploaded 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-slate-50 border-slate-100 text-slate-300'
                  } ${d.date === recordDate ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  <span className="opacity-50">{d.day}</span>
                  {d.isUploaded && <CheckCircle2 className="w-2.5 h-2.5 mt-0.5" />}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">업로드 완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-slate-50 border border-slate-100 rounded"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">누락/대기</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashStatusPage;
