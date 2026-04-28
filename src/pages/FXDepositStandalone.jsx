import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Download, Plus, Check, X, Edit2, Trash2, Lock, Globe } from 'lucide-react';
import { formatUSD } from '../utils/formatters';

const PIN_CODE = '2580';

const FXDepositStandalone = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [fxDepositList, setFxDepositList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [depositData, setDepositData] = useState({
    client: '', category: '상품', country: '', exportRef: '', poNumber: '', ciNumber: '',
    billedAmount: '', billedCurrency: 'USD', invoiceNumber: '', invoiceSubmitDate: '',
    expectedDepositDate: '', description: '', bizNote: '', status: '청구완료'
  });

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === PIN_CODE) {
      setAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    const unsub = onSnapshot(collection(db, "fxDepositList"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFxDepositList(data.sort((a,b) => (b.invoiceSubmitDate || '').localeCompare(a.invoiceSubmitDate || '')));
    });
    return () => unsub();
  }, [authenticated]);

  const handleChange = (e) => setDepositData({ ...depositData, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!depositData.client) return;
    const docId = Date.now().toString();
    await setDoc(doc(collection(db, "fxDepositList"), docId), {
      ...depositData,
      billedAmount: parseFloat(depositData.billedAmount) || 0,
      id: docId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setDepositData({
      client: '', category: '상품', country: '', exportRef: '', poNumber: '', ciNumber: '',
      billedAmount: '', billedCurrency: 'USD', invoiceNumber: '', invoiceSubmitDate: '',
      expectedDepositDate: '', description: '', bizNote: '', status: '청구완료'
    });
  };

  const handleEditClick = (item) => { setEditingId(item.id); setEditData({ ...item }); };
  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });
  const handleEditSave = async () => {
    await setDoc(doc(collection(db, "fxDepositList"), String(editData.id)), {
      ...editData,
      billedAmount: parseFloat(editData.billedAmount) || 0,
      updatedAt: new Date().toISOString()
    });
    setEditingId(null);
  };
  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteDoc(doc(collection(db, "fxDepositList"), String(id)));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 w-full max-w-md shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white text-center mb-2">외화입금 관리</h1>
          <p className="text-sm text-indigo-200/60 text-center mb-8 font-bold">FX Deposit Management Portal</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password" maxLength={4} value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN 코드 입력"
              className="w-full text-center text-2xl font-black tracking-[1em] bg-white/10 border-2 border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-white/20 outline-none focus:border-indigo-400 transition-all"
              autoFocus
            />
            {pinError && <p className="text-rose-400 text-xs font-bold text-center animate-pulse">PIN 코드가 올바르지 않습니다.</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30 active:scale-95">
              접속하기
            </button>
          </form>
          <p className="text-[10px] text-white/20 text-center mt-8 font-bold">COMPOSE COFFEE · Treasury Intelligence</p>
        </div>
      </div>
    );
  }

  const filtered = fxDepositList.filter(d => statusFilter === 'ALL' || d.status === statusFilter);
  const statusColors = {'청구완료': 'bg-slate-100 text-slate-500', '입금대기': 'bg-amber-50 text-amber-600', '입금확인': 'bg-blue-50 text-blue-600', '정산완료': 'bg-emerald-50 text-emerald-600'};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">외화입금 관리</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">FX Deposit Management · Compose Coffee</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-300">해외사업팀 전용</span>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['청구완료','입금대기','입금확인','정산완료'].map(s => {
            const count = fxDepositList.filter(d => d.status === s).length;
            const total = fxDepositList.filter(d => d.status === s).reduce((sum, d) => sum + (parseFloat(d.billedAmount) || 0), 0);
            const color = {청구완료:'slate',입금대기:'amber',입금확인:'blue',정산완료:'emerald'}[s];
            return (
              <div key={s} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <p className={`text-[10px] font-black text-${color}-400 uppercase mb-1`}>{s}</p>
                <p className="text-2xl font-black text-slate-800">{count}<span className="text-xs ml-1 text-slate-300 font-bold">건</span></p>
                <p className="text-xs font-bold text-slate-400 mt-1 font-mono">${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
              </div>
            );
          })}
        </div>

        {/* Form - Phase 1 Only */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden p-8">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-base">
            <Download className="w-5 h-5 text-emerald-500" /> 외화입금 신규 등록
          </h3>
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="border-l-4 border-rose-400 pl-5">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">Phase 1 — 해외사업팀 입력</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">거래처명 *</label><input name="client" value={depositData.client} onChange={handleChange} required placeholder="거래처" className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">구분</label><select name="category" value={depositData.category} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400"><option>로열티</option><option>상품</option><option>보증보험</option><option>계약금</option><option>기타</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">국가</label><input name="country" value={depositData.country} onChange={handleChange} placeholder="필리핀" className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">PO</label><input name="poNumber" value={depositData.poNumber} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">C/I</label><input name="ciNumber" value={depositData.ciNumber} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">수출건의</label><input name="exportRef" value={depositData.exportRef} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">청구금액</label><input type="number" step="0.01" name="billedAmount" value={depositData.billedAmount} onChange={handleChange} placeholder="0.00" className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400 font-mono" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">통화</label><select name="billedCurrency" value={depositData.billedCurrency} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400"><option value="USD">USD</option><option value="EUR">EUR</option><option value="JPY">JPY</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">청구서번호</label><input name="invoiceNumber" value={depositData.invoiceNumber} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">청구제출일</label><input type="date" name="invoiceSubmitDate" value={depositData.invoiceSubmitDate} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">입금예정일</label><input type="date" name="expectedDepositDate" value={depositData.expectedDepositDate} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">상태</label><select name="status" value={depositData.status} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400"><option>청구완료</option><option>입금대기</option><option>입금확인</option><option>정산완료</option></select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">내용</label><input name="description" value={depositData.description} onChange={handleChange} placeholder="거래 상세 설명" className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">비고</label><input name="bizNote" value={depositData.bizNote} onChange={handleChange} placeholder="해외사업팀 비고" className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400" /></div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-slate-900 text-white font-black px-8 py-3 rounded-xl hover:bg-slate-800 transition shadow-lg active:scale-95 text-xs flex items-center gap-2">
                <Plus className="w-4 h-4" /> 등록하기
              </button>
            </div>
          </form>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {['ALL','청구완료','입금대기','입금확인','정산완료'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${statusFilter === s ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
              {s === 'ALL' ? '전체' : s}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-bold text-slate-400">총 {filtered.length}건</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
              <thead className="bg-slate-50 border-b text-slate-400 text-[9px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">거래처</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">구분</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">국가</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400 text-right">청구금액</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">통화</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">INV#</th>
                  <th className="px-3 py-3 border-r bg-rose-50 text-rose-400">제출일</th>
                  <th className="px-3 py-3 border-r bg-amber-50 text-amber-500">입금일</th>
                  <th className="px-3 py-3 border-r bg-amber-50 text-amber-500 text-right">입금액</th>
                  <th className="px-3 py-3 border-r text-center">상태</th>
                  <th className="px-3 py-3 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="px-8 py-16 text-center text-slate-300 italic">등록된 외화입금 내역이 없습니다.</td></tr>
                ) : filtered.map(item => {
                  if (editingId === item.id) {
                    return (
                      <tr key={item.id} className="bg-indigo-50/40">
                        <td className="px-2 py-1.5 border-r"><input name="client" value={editData.client||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-2 py-1 outline-none" /></td>
                        <td className="px-2 py-1.5 border-r"><select name="category" value={editData.category||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-1 py-1 outline-none"><option>로열티</option><option>상품</option><option>보증보험</option><option>계약금</option><option>기타</option></select></td>
                        <td className="px-2 py-1.5 border-r"><input name="country" value={editData.country||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-2 py-1 outline-none" /></td>
                        <td className="px-2 py-1.5 border-r"><input type="number" step="0.01" name="billedAmount" value={editData.billedAmount||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-2 py-1 outline-none font-mono text-right" /></td>
                        <td className="px-2 py-1.5 border-r"><select name="billedCurrency" value={editData.billedCurrency||'USD'} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-1 py-1 outline-none"><option>USD</option><option>EUR</option></select></td>
                        <td className="px-2 py-1.5 border-r"><input name="invoiceNumber" value={editData.invoiceNumber||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-2 py-1 outline-none" /></td>
                        <td className="px-2 py-1.5 border-r"><input type="date" name="invoiceSubmitDate" value={editData.invoiceSubmitDate||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-2 py-1 outline-none" /></td>
                        <td className="px-2 py-1.5 border-r text-center text-slate-300">-</td>
                        <td className="px-2 py-1.5 border-r text-center text-slate-300">-</td>
                        <td className="px-2 py-1.5 border-r"><select name="status" value={editData.status||''} onChange={handleEditChange} className="w-full text-xs bg-white border rounded px-1 py-1 outline-none"><option>청구완료</option><option>입금대기</option><option>입금확인</option><option>정산완료</option></select></td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={handleEditSave} className="p-1 text-white bg-indigo-500 hover:bg-indigo-600 rounded"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-500 bg-slate-200 hover:bg-slate-300 rounded"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const sc = statusColors[item.status] || 'bg-slate-50 text-slate-400';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 border-r font-bold text-slate-800">{item.client}</td>
                      <td className="px-3 py-3 border-r text-slate-500">{item.category}</td>
                      <td className="px-3 py-3 border-r text-slate-500">{item.country}</td>
                      <td className="px-3 py-3 border-r text-right font-mono font-bold text-slate-700">{item.billedAmount ? (item.billedCurrency === 'USD' ? formatUSD(item.billedAmount) : `€${Number(item.billedAmount).toLocaleString()}`) : '-'}</td>
                      <td className="px-3 py-3 border-r"><span className="text-[9px] font-black uppercase">{item.billedCurrency}</span></td>
                      <td className="px-3 py-3 border-r text-slate-400 font-mono">{item.invoiceNumber || '-'}</td>
                      <td className="px-3 py-3 border-r text-slate-400 font-mono">{item.invoiceSubmitDate || '-'}</td>
                      <td className="px-3 py-3 border-r text-slate-500 font-mono">{item.depositDate || '-'}</td>
                      <td className="px-3 py-3 border-r text-right font-mono font-bold text-emerald-600">{item.depositAmount ? formatUSD(item.depositAmount) : '-'}</td>
                      <td className="px-3 py-3 border-r text-center"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${sc}`}>{item.status}</span></td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEditClick(item)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-300">© 2026 Compose Coffee · Treasury Intelligence</p>
          <p className="text-[10px] font-bold text-slate-300">재무팀 Phase 2 입력은 메인 대시보드에서 진행됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default FXDepositStandalone;
