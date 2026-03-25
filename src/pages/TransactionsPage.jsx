import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Database, ArrowRight, Calendar, Loader2 } from 'lucide-react';
import { formatKRW } from '../utils/formatters';
import * as XLSX from 'xlsx';

const TransactionsPage = ({ composeAccounts, smartAccounts, onUpdateAccount, onSaveWithdrawals }) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSection, setSelectedSection] = useState('compose');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef(null);

  const allAccounts = [...composeAccounts.map(a => ({...a, section: 'compose'})), ...smartAccounts.map(a => ({...a, section: 'smart'}))];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedAccountId) {
      alert('1단계: 출금 계좌를 먼저 선택해주세요.');
      e.target.value = null;
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header and map columns (A:0, B:1, C:2, D:3, E:4, F:5, G:6)
        const parsed = data.slice(1).map((row, idx) => ({
          id: Date.now() + idx,
          bank: row[0] || '',
          account: row[1] || '',
          amount: parseFloat(String(row[2]).replace(/,/g, '')) || 0,
          payee: row[3] || '',
          depositLabel: row[4] || '',
          withdrawLabel: row[5] || '',
          memo: row[6] || ''
        })).filter(item => item.bank && item.amount > 0);

        setPreviewData(parsed);
      } catch (err) {
        console.error(err);
        alert('엑셀 파일 분석 중 오류가 발생했습니다.');
      } finally {
        setIsParsing(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApply = async () => {
    if (previewData.length === 0) return;

    const totalWithdraw = previewData.reduce((sum, item) => sum + item.amount, 0);
    const selectedAccount = allAccounts.find(a => String(a.id) === String(selectedAccountId));
    
    if (selectedAccount) {
      const newWithdraw = (selectedAccount.withdraw || 0) + totalWithdraw;
      const updatedAccount = { 
        ...selectedAccount, 
        withdraw: newWithdraw, 
        final: (selectedAccount.balance || 0) - newWithdraw + (selectedAccount.internal || 0) 
      };
      // section field is added in allAccounts, remove it before saving
      const { section, ...finalAccount } = updatedAccount;
      await onUpdateAccount(selectedSection, finalAccount);
    }

    // 전역 지출 내역 상태 업데이트
    const newItems = previewData.map(item => ({
      ...item,
      paymentDate,
      section: selectedSection === 'compose' ? '컴포즈커피' : '스마트팩토리',
      fromAccount: selectedAccount.no
    }));
    await onSaveWithdrawals(newItems);

    setIsSuccess(true);
    setPreviewData([]);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const removeItem = (id) => {
    setPreviewData(previewData.filter(item => item.id !== id));
  };

  const selectedAccount = allAccounts.find(a => a.id === parseInt(selectedAccountId));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">데이터 업로드 및 자산 집행</h2>
          <p className="text-sm text-slate-500">엑셀 파일을 업로드하여 지급 일정을 확인하고 자산에 반영합니다.</p>
        </div>
        {isSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-black uppercase">반영 완료!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: 출금 정보 선택 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col h-fit">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800">1. 출금 정보 설정</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> 지급 예정일 선택
              </label>
              <input 
                type="date" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">사업부 구분</label>
              <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-200">
                <button 
                  onClick={() => { setSelectedSection('compose'); setSelectedAccountId(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedSection === 'compose' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  컴포즈커피
                </button>
                <button 
                  onClick={() => { setSelectedSection('smart'); setSelectedAccountId(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedSection === 'smart' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  스마트팩토리
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">출금 계좌 선택</label>
              <select 
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="">계좌를 선택하세요</option>
                {(selectedSection === 'compose' ? composeAccounts : smartAccounts).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.bank} | {acc.no} ({acc.type})</option>
                ))}
              </select>
            </div>

            {selectedAccount && !isSuccess && (
              <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in zoom-in-95">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">현재 가용 잔산</p>
                    <span className="text-base font-bold text-indigo-700 tabular-nums">{formatKRW(selectedAccount.final)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: 엑셀 업로드 및 프리뷰 */}
        <div className="lg:col-span-2 space-y-6">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer group relative overflow-hidden bg-white border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ${previewData.length > 0 ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'}`}
          >
            <div className="w-16 h-16 bg-slate-50 group-hover:bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors shadow-inner">
              {isParsing ? (
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              ) : (
                <Upload className={`w-8 h-8 ${previewData.length > 0 ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`} />
              )}
            </div>
            <h4 className="font-bold text-slate-800 mb-1">2. 대량 출금 엑셀 파일 업로드</h4>
            <p className="text-xs text-slate-400 mb-6">위에서 정보를 선택한 뒤, 엑셀 파일을 업로드하세요.</p>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-200 group-hover:shadow-indigo-100">
              {isParsing ? '파일 분석 중...' : '엑셀 파일 선택'}
            </button>
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 입금 정보 필수</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 7개 컬럼 양식</span>
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> 업로드 데이터 프리뷰
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 ml-6 uppercase">{paymentDate} 지급 분</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">총 출금액 합계</p>
                    <span className="text-lg font-bold text-red-600 tabular-nums">{formatKRW(previewData.reduce((s, i) => s + i.amount, 0))}</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-[12px] border-collapse bg-white">
                    <thead className="bg-[#f8fafc] text-[#64748b] border-b border-slate-200 sticky top-0 font-bold">
                      <tr>
                        <th className="px-5 py-3 border-r border-slate-100">입금은행</th>
                        <th className="px-5 py-3 border-r border-slate-100">입금계좌번호</th>
                        <th className="px-5 py-3 border-r border-slate-100 text-right text-red-600">입금액</th>
                        <th className="px-5 py-3 border-r border-slate-100">예상예금주</th>
                        <th className="px-5 py-3 border-r border-slate-100">메모</th>
                        <th className="px-5 py-3 text-center">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-5 py-3 border-r border-slate-100 font-bold text-slate-700">{item.bank}</td>
                          <td className="px-5 py-3 border-r border-slate-100 font-mono text-slate-400">{item.account}</td>
                          <td className="px-5 py-3 border-r border-slate-100 text-right font-bold text-slate-900 tabular-nums">{formatKRW(item.amount)}</td>
                          <td className="px-5 py-3 border-r border-slate-100 font-medium text-slate-600">{item.payee}</td>
                          <td className="px-5 py-3 border-r border-slate-100 text-slate-400 italic text-[11px] truncate max-w-[100px]">{item.memo}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-5 bg-indigo-50/30 border-t border-indigo-100 flex justify-end">
                  <button 
                    onClick={handleApply}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    확인 및 자금 일보 반영 <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
