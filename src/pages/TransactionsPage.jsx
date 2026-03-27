import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Database, ArrowRight, Calendar, Loader2, ListFilter } from 'lucide-react';
import { formatKRW, formatUSD } from '../utils/formatters';
import * as XLSX from 'xlsx';

const TransactionsPage = ({ composeAccounts, smartAccounts, withdrawals = [], fxSchedule = [], onUpdateAccount, onSaveWithdrawals, onDeleteWithdrawal, onDeleteBatch, onUpdateFXSchedule, exchangeRate }) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSection, setSelectedSection] = useState('compose');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [manualEntry, setManualEntry] = useState({ bank: '', account: '', amount: '', payee: '', memo: '' });
  const [showFXImport, setShowFXImport] = useState(false);
  const fileInputRef = useRef(null);

  const allAccounts = [...composeAccounts.map(a => ({...a, section: 'compose'})), ...smartAccounts.map(a => ({...a, section: 'smart'}))];
  const selectedAccount = allAccounts.find(a => String(a.id) === String(selectedAccountId));

  const processAndSave = async (items, sourceFXItem = null) => {
    if (items.length === 0) return;
    if (!selectedAccount) return;

    const totalWithdraw = items.reduce((sum, item) => sum + item.amount, 0);
    const batchId = items.length > 1 ? `batch_${Date.now()}` : null;

    // 1. Update Account Balance
    const newWithdraw = (selectedAccount.withdraw || 0) + totalWithdraw;
    const updatedAccount = { 
      ...selectedAccount, 
      withdraw: newWithdraw, 
      final: (selectedAccount.balance || 0) - newWithdraw + (selectedAccount.internal || 0) 
    };
    const { section, ...finalAccount } = updatedAccount;
    await onUpdateAccount(selectedSection, finalAccount);

    // 2. Save Transactions
    const newItems = items.map(item => ({
      ...item,
      paymentDate,
      accountId: selectedAccountId,
      section: selectedSection === 'compose' ? '컴포즈커피' : '스마트팩토리',
      toAccount: item.account || '', // 입금계좌 저장
      fromAccount: selectedAccount.no,
      currency: selectedAccount.isUSD ? 'USD' : 'KRW',
      isUSD: selectedAccount.isUSD,
      batchId,
      fxSourceId: sourceFXItem?.id || null // Link back to FX schedule
    }));
    await onSaveWithdrawals(newItems);

    // 3. Update FX Schedule Status if applicable
    if (sourceFXItem) {
      await onUpdateFXSchedule({
        ...sourceFXItem,
        status: '송금 완료(집행)'
      });
    }

    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleFileSelect = (type) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedAccountId) {
      alert('1단계: 출금 계좌를 먼저 선택해주세요.');
      e.target.value = null;
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let parsed = [];
        if (type === 'bulk') {
          // 대량이체 양식 파싱 (Index 기준: 입금은행[1], 입금계좌번호[2], 입금액[3], 예금주[6], 파일메모[12], 출금계좌[13])
          parsed = data.slice(1).map((row, idx) => ({
            id: Date.now() + idx,
            bank: row[1] || '',
            account: String(row[2] || '').replace(/[\s-]/g, ''), // 입금계좌
            amount: parseFloat(String(row[3]).replace(/,/g, '')) || 0,
            payee: row[6] || '',
            memo: row[12] || row[8] || '', // 파일메모 또는 출금통장표시
            excelFromAccount: String(row[13] || '').replace(/[\s-]/g, '') // 파일 내 출금계좌 (참고용)
          })).filter(item => item.bank && item.amount > 0);
        } else {
          // 등록한 내역 양식 파싱 (Index 기준: 거래구분[1], 출금계좌[2], 입금은행[3], 입금계좌[4], 예금주[5], 금액[7])
          parsed = data.slice(1).map((row, idx) => ({
            id: Date.now() + idx,
            bank: row[3] || '',
            account: String(row[4] || '').replace(/[\s-]/g, ''), // 입금계좌
            amount: parseFloat(String(row[7]).replace(/,/g, '')) || 0,
            payee: row[5] || '',
            memo: row[1] || '', // 거래구분
            excelFromAccount: String(row[2] || '').replace(/[\s-]/g, '') // 파일 내 출금계좌
          })).filter(item => item.bank && item.amount > 0);
        }

        if (parsed.length > 0) {
          await processAndSave(parsed);
        }
      } catch (err) {
        console.error(err);
        alert('엑셀 파일 분석 중 오류가 발생했습니다. 양식이 맞는지 확인해주세요.');
      } finally {
        setIsParsing(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddManual = async () => {
    if (!selectedAccountId) { alert('출금 계좌를 먼저 선택해주세요.'); return; }
    if (!manualEntry.bank || !manualEntry.amount) { alert('은행명과 금액은 필수입니다.'); return; }
    
    const newItem = {
      id: Date.now(),
      bank: manualEntry.bank,
      account: manualEntry.account,
      amount: parseFloat(manualEntry.amount),
      payee: manualEntry.payee,
      memo: manualEntry.memo,
      isManual: true
    };
    
    await processAndSave([newItem]);
    setManualEntry({ bank: '', account: '', amount: '', payee: '', memo: '' });
  };

  const handleFXScheduleSelect = async (item) => {
    if (!selectedAccountId) { alert('출금 계좌를 먼저 선택해주세요.'); return; }
    
    // If account is KRW, convert schedule's USD to KRW
    let amount = item.amount;
    if (!selectedAccount.isUSD) {
      amount = Math.round(item.amount * exchangeRate);
      if (!window.confirm(`선택한 스케줄은 USD($${item.amount.toLocaleString()})이나, 현재 출금 계좌는 KRW입니다. \n현재 환율($1 = ${exchangeRate}원)을 기준으로 환산하여 ${formatKRW(amount)}으로 등록하시겠습니까?`)) {
        return;
      }
    }

    const newItem = {
      id: Date.now(),
      bank: item.bank || '',
      account: item.account || '',
      amount: amount,
      payee: item.client,
      memo: item.desc || '외화 송금 스케줄 기반 등록',
      isManual: true
    };

    await processAndSave([newItem], item);
    setShowFXImport(false);
  };

  // 기존 등록된 내역 (현재 날짜/법인 필터링)
  const existingRecords = withdrawals.filter(w => 
    w.paymentDate === paymentDate && 
    w.section === (selectedSection === 'compose' ? '컴포즈커피' : '스마트팩토리')
  );

  // 미실행된 외화송금 일정
  const pendingFXSchedules = fxSchedule.filter(s => s.status !== '송금 완료(집행)');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">출금 대상</h2>
          <p className="text-sm text-slate-500">엑셀 파일을 업로드하거나 개별 건을 등록하여 자산에 반영합니다.</p>
        </div>
        {isSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-black uppercase">반영 완료!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-stretch">
        {/* Step 1: 기본 정보 설정 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800">1. 기본 정보 설정</h3>
          </div>

          <div className="space-y-5 flex-1">
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
                  onClick={() => { setSelectedSection('compose'); setSelectedAccountId(''); setShowFXImport(false); }}
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
              >
                <option value="">계좌를 선택하세요</option>
                {(selectedSection === 'compose' ? composeAccounts : smartAccounts).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.bank} | {acc.nickname || acc.type} ({acc.no})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: 개별 건별 등록 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col h-full relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800">2. 개별 건별 직접 등록</h3>
            </div>
            
            {selectedSection === 'smart' && (
              <button 
                onClick={() => setShowFXImport(!showFXImport)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${showFXImport ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
              >
                <ListFilter className="w-3 h-3" />
                예정건 불러오기
              </button>
            )}
          </div>
          
          {showFXImport && selectedSection === 'smart' ? (
            <div className="flex-1 overflow-y-auto pr-1">
              <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">미실행 외화 송금 예정 리스트</p>
              <div className="space-y-2">
                {pendingFXSchedules.length === 0 ? (
                  <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-300">표시할 예정건이 없습니다.</p>
                  </div>
                ) : (
                  pendingFXSchedules.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => handleFXScheduleSelect(s)}
                      className="group p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all active:scale-95"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-black text-slate-900">{s.client}</p>
                        <p className="text-[10px] font-black text-indigo-600">{formatUSD(s.amount)}</p>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                        <span>{s.date} | {s.bank}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x--2 group-hover:translate-x-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setShowFXImport(false)}
                className="w-full mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                직접 입력으로 돌아가기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">은행</label>
                <input type="text" value={manualEntry.bank} onChange={e=>setManualEntry({...manualEntry, bank:e.target.value})} placeholder="은행명" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">금액 {selectedAccount?.isUSD ? '(USD)' : '(KRW)'}</label>
                <input type="number" value={manualEntry.amount} onChange={e=>setManualEntry({...manualEntry, amount:e.target.value})} placeholder={selectedAccount?.isUSD ? "$0.00" : "숫자만 입력"} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">예금주/거래처</label>
                <input type="text" value={manualEntry.payee} onChange={e=>setManualEntry({...manualEntry, payee:e.target.value})} placeholder="받는 사람 이름" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">입금 계좌번호</label>
                <input type="text" value={manualEntry.account} onChange={e=>setManualEntry({...manualEntry, account:e.target.value})} placeholder="계좌번호 입력" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">메모</label>
                <input type="text" value={manualEntry.memo} onChange={e=>setManualEntry({...manualEntry, memo:e.target.value})} placeholder="상세 내용" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
              </div>
              <button onClick={handleAddManual} className="col-span-2 mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-100 transition-all active:scale-95 text-xs">
                반영 및 저장하기
              </button>
            </div>
          )}
        </div>

        {/* Step 3: 대량 엑셀 업로드 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800">3. 대량 엑셀 파일 업로드</h3>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            {/* 양식 1: 대량이체 실행 내역 */}
            <div 
              onClick={() => document.getElementById('file-bulk').click()}
              className="flex-1 cursor-pointer group relative overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center transition-all hover:border-emerald-400 hover:bg-white flex flex-col justify-center"
            >
              <input type="file" id="file-bulk" onChange={handleFileSelect('bulk')} accept=".xlsx, .xls" className="hidden" />
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:bg-emerald-50 transition-colors">
                {isParsing ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" /> : <Upload className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />}
              </div>
              <p className="text-[10px] font-bold text-slate-500 mb-1">양식 A: 대량이체 조회/실행</p>
              <p className="text-[9px] text-slate-400">은행, 계좌번호, 금액, 예금주 등</p>
            </div>

            {/* 양식 2: 기존 등록 내역 */}
            <div 
              onClick={() => document.getElementById('file-history').click()}
              className="flex-1 cursor-pointer group relative overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center transition-all hover:border-blue-400 hover:bg-white flex flex-col justify-center"
            >
              <input type="file" id="file-history" onChange={handleFileSelect('history')} accept=".xlsx, .xls" className="hidden" />
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:bg-blue-50 transition-colors">
                {isParsing ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Upload className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />}
              </div>
              <p className="text-[10px] font-bold text-slate-500 mb-1">양식 B: 등록한 내역 (뱅킹)</p>
              <p className="text-[9px] text-slate-400">거래구분, 출금계좌, 입금은행 등</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 기존 등록 내역 관리 (저장 된 것) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {paymentDate} {selectedSection === 'compose' ? '컴포즈' : '스마트'} 확정 내역
            </h3>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatKRW(existingRecords.filter(r => !r.isUSD).reduce((s, i) => s + i.amount, 0))}
              {existingRecords.some(r => r.isUSD) && ` / ${formatUSD(existingRecords.filter(r => r.isUSD).reduce((s, i) => s + i.amount, 0))}`}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
             <table className="w-full text-left text-[11px]">
               <thead className="bg-[#f8fafc] text-slate-400 font-bold border-b border-slate-200 sticky top-0">
                 <tr>
                   <th className="px-4 py-2.5">은행/거래처</th>
                   <th className="px-4 py-2.5 text-right">금액</th>
                   <th className="px-4 py-2.5 text-center">비고</th>
                   <th className="px-4 py-2.5 text-center">입금계좌</th>
                   <th className="px-4 py-2.5 text-center">출금계좌</th>
                   <th className="px-4 py-2.5 text-center">작업</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {existingRecords.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-300 font-bold">저장된 내역이 없습니다.</td></tr>
                 ) : existingRecords.map(item => {
                   const isFirstInBatch = item.batchId && existingRecords.findIndex(r => r.batchId === item.batchId) === existingRecords.indexOf(item);
                   const batchTotal = item.batchId ? existingRecords.filter(r => r.batchId === item.batchId).reduce((s, i) => s + i.amount, 0) : 0;
                   
                   return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold">{item.bank}</p>
                            <p className="text-[10px] opacity-60">{item.payee}</p>
                          </div>
                          {item.batchId && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[9px] font-bold">BATCH</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-red-500">
                        {item.isUSD ? formatUSD(item.amount) : formatKRW(item.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[10px] text-slate-500 whitespace-pre-wrap">{item.memo || '-'}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-400">{item.account || '-'}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-400">{item.fromAccount || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              if (window.confirm('해당 기록을 삭제하시겠습니까? 삭제 시 계좌 잔액이 자동으로 복구됩니다.')) {
                                onDeleteWithdrawal(item.id, item.accountId, item.section, item.amount);
                              }
                            }}
                            title="개별 삭제"
                            className="text-slate-200 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {item.batchId && (
                            <button 
                              onClick={() => onDeleteBatch(item.batchId, item.accountId, item.section, batchTotal)}
                              title="이 업로드 묶음 전체 삭제"
                              className="text-slate-200 hover:text-indigo-600 transition-colors flex items-center gap-1"
                            >
                              <Database className="w-4 h-4" />
                              <span className="text-[9px] font-bold">일괄</span>
                            </button>
                          )}
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
    </div>
  );
};

export default TransactionsPage;
