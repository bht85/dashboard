import React, { useState } from 'react';
import { Globe, Plus, Trash2, ArrowRightLeft, Calendar, Edit2, Check, X, ChevronLeft, ChevronRight, Package, List, AlertCircle } from 'lucide-react';
import { formatUSD, formatKRW } from '../utils/formatters';

const ForeignSchedulePage = ({ 
  fxSchedule, 
  onUpdateSchedule, 
  onDeleteSchedule, 
  exchangeResults = [], 
  onUpdateExchangeResult, 
  onDeleteExchangeResult,
  exchangeRate = 1520,
  exchangeRateEUR = 1620,
  exchangeRateJPY = 10,
  coffeeIndices = [],
  onUpdateCoffeeIndex,
  onDeleteCoffeeIndex,
  rawBeanContracts = [],
  onUpdateRawBeanContract,
  onDeleteRawBeanContract
}) => {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'exchange', 'coffee', 'beans'
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'COMPLETED'

  // Schedule Form State
  const [scheduleData, setScheduleData] = useState({
    date: '', client: '', amount: '', bank: '', account: '', desc: '', status: '지출결의 미확인', currency: 'USD',
  });

  // Exchange Form State
  const [exchangeData, setExchangeData] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    krwAmount: '', usdAmount: '', bank: '', desc: '', section: '스마트팩토리', type: 'BUY', currency: 'USD',
  });

  // Raw Bean Contract State
  const [contractData, setContractData] = useState({
    origin: '', supplier: '', contractNo: '', containerCount: '', installment: '',
    paymentStatus: 'X', paymentYear: '2026', paymentMonth: '01', paymentDay: '',
    contractMonth: '', differential: '', index: '', 
    weight: '', planExchangeRate: String(exchangeRate),
    isEditing: false, id: null
  });

  // 보조 상태: 산지/공급업체 직접 입력 모드
  const [isNewOrigin, setIsNewOrigin] = useState(false);
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  // Coffee Index Form State
  const [coffeeData, setCoffeeData] = useState({
    year: '26', monthNumber: '04', price: '', isEditing: false, id: null
  });

  // Calculation Modal State
  const [showCalc, setShowCalc] = useState(false);
  const [calcData, setCalcData] = useState({ indexId: '', quantity: '' });

  // 유니크한 산지/공급업체 리스트 추출
  const uniqueOrigins = Array.from(new Set(rawBeanContracts.map(c => c.origin).filter(Boolean))).sort();
  const uniqueSuppliers = Array.from(new Set(rawBeanContracts.map(c => c.supplier).filter(Boolean))).sort();

  const handleScheduleChange = (e) => {
    setScheduleData({ ...scheduleData, [e.target.name]: e.target.value });
  };

  const handleExchangeChange = (e) => {
    setExchangeData({ ...exchangeData, [e.target.name]: e.target.value });
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleData.date || !scheduleData.client || !scheduleData.amount) return;
    await onUpdateSchedule({
      id: Date.now(), ...scheduleData, amount: parseFloat(scheduleData.amount)
    });
    setScheduleData({
      date: '', client: '', amount: '', bank: '', account: '', desc: '', status: '지출결의 미확인', currency: 'USD'
    });
  };

  const handleAddExchange = async (e) => {
    e.preventDefault();
    const rate = parseFloat(exchangeData.krwAmount) / parseFloat(exchangeData.usdAmount);
    await onUpdateExchangeResult({
      ...exchangeData, id: Date.now(), exchangeRate: rate,
      krwAmount: parseFloat(exchangeData.krwAmount), usdAmount: parseFloat(exchangeData.usdAmount)
    });
    setExchangeData({
      date: new Date().toLocaleDateString('en-CA'),
      krwAmount: '', usdAmount: '', bank: '', desc: '', section: '스마트팩토리', type: 'BUY', currency: 'USD'
    });
  };

  const changeMonth = (offset) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(date.toISOString().substring(0, 7));
  };

  const startEditSchedule = (item) => {
    setEditingScheduleId(item.id);
    setEditScheduleData({ ...item });
  };

  const handleAddCoffeeIndex = async (e) => {
    e.preventDefault();
    if (!coffeeData.price) return;
    await onUpdateCoffeeIndex({
        id: coffeeData.isEditing ? coffeeData.id : Date.now(),
        month: `'${coffeeData.year}. ${coffeeData.monthNumber}월물`,
        price: parseFloat(coffeeData.price)
    });
    setCoffeeData({ year: '26', monthNumber: '04', price: '', isEditing: false, id: null });
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    await onUpdateRawBeanContract({
        ...contractData,
        id: contractData.isEditing ? contractData.id : Date.now(),
        containerCount: parseInt(contractData.containerCount || 0),
        differential: parseFloat(contractData.differential || 0),
        index: parseFloat(contractData.index || 0),
        weight: parseFloat(contractData.weight || 0),
        planExchangeRate: parseFloat(contractData.planExchangeRate || exchangeRate)
    });
    resetContractForm();
  };

  const resetContractForm = () => {
    setContractData({
        origin: '', supplier: '', contractNo: '', containerCount: '', installment: '',
        paymentStatus: 'X', paymentYear: '2026', paymentMonth: '01', paymentDay: '',
        contractMonth: '', differential: '', index: '', 
        weight: '', planExchangeRate: String(exchangeRate),
        isEditing: false, id: null
    });
    setIsNewOrigin(false);
    setIsNewSupplier(false);
  };

  const startEditContract = (item) => {
    setContractData({ ...item, isEditing: true });
    setIsNewOrigin(false);
    setIsNewSupplier(false);
    setActiveTab('beans');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyCalculation = () => {
    const selected = coffeeIndices.find(c => String(c.id) === String(calcData.indexId));
    if (!selected || !calcData.quantity) return;
    const expectedIndex = selected.price + 50;
    const calculatedAmount = (expectedIndex * 22.046 / 1000) * parseFloat(calcData.quantity);
    setScheduleData({ ...scheduleData, amount: calculatedAmount.toFixed(2), desc: `${selected.month} ${calcData.quantity}kg 산출분` });
    setShowCalc(false);
  };

  const filteredSchedule = fxSchedule.filter(s => s.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date));
  const filteredExchangeResults = (Array.isArray(exchangeResults) ? exchangeResults : []).filter(e => e.date.startsWith(selectedMonth));

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> 외화 송금 일정
          </button>
          <button onClick={() => setActiveTab('exchange')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'exchange' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ArrowRightLeft className="w-3.5 h-3.5" /> 환전 결과
          </button>
          <button onClick={() => setActiveTab('coffee')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'coffee' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Globe className="w-3.5 h-3.5 text-amber-500" /> 커피 지수
          </button>
          <button onClick={() => setActiveTab('beans')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'beans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Package className="w-3.5 h-3.5 text-indigo-500" /> 생두 계약 관리
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => changeMonth(-1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-black text-slate-700 px-3 min-w-[100px] text-center">{selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500" /> 신규 송금 일정</div>
              <button onClick={() => setShowCalc(true)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all flex items-center gap-1.5"><ArrowRightLeft className="w-3 h-3" /> 지수 기반 산출</button>
            </h3>
            <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지급예정일</label><input type="date" name="date" value={scheduleData.date} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래처</label><input type="text" name="client" value={scheduleData.client} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">금액 ({scheduleData.currency})</label><input type="number" step="0.01" name="amount" value={scheduleData.amount} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">상태</label><select name="status" value={scheduleData.status} onChange={handleScheduleChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2"><option value="지출결의 미확인">지출결의 미확인</option><option value="지출결의 확인">지출결의 확인</option><option value="송금 완료(집행)">송금 완료(집행)</option></select></div>
              <div className="md:col-span-4 mt-2"><button type="submit" className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> 등록하기</button></div>
            </form>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr><th className="px-4 py-3 border-r">지급예정일</th><th className="px-4 py-3 border-r">거래처</th><th className="px-4 py-3 border-r text-right">금액 (외화)</th><th className="px-6 py-3 border-r text-right text-indigo-500">환산 금액 (KRW)</th><th className="px-4 py-3 border-r">상태</th><th className="px-4 py-3 text-center">작업</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredSchedule.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 border-r font-bold">{s.date}</td>
                      <td className="px-4 py-3 border-r font-bold text-slate-800">{s.client}</td>
                      <td className="px-4 py-3 border-r text-right font-mono font-bold text-blue-600">{formatUSD(s.amount)}</td>
                      <td className="px-6 py-3 border-r text-right font-mono font-black text-slate-900 bg-indigo-50/10">{formatKRW(s.amount * exchangeRate)}</td>
                      <td className="px-4 py-3 border-r text-[9px] font-black">{s.status}</td>
                      <td className="px-4 py-3 text-center opacity-0 group-hover:opacity-100"><button onClick={() => onDeleteSchedule(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'exchange' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-emerald-500" /> 환전 결과 기록</h3>
            <form onSubmit={handleAddExchange} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">환전일자</label><input type="date" name="date" value={exchangeData.date} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KRW 금액</label><input type="number" name="krwAmount" value={exchangeData.krwAmount} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">USD 금액</label><input type="number" step="0.01" name="usdAmount" value={exchangeData.usdAmount} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" required /></div>
              <div className="flex items-end"><button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition">저장하기</button></div>
            </form>
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-3 border-r">일자</th><th className="px-4 py-3 border-r text-right">KRW 금액</th><th className="px-4 py-3 border-r text-right">USD 금액</th><th className="px-6 py-3 border-r text-center">적용 환율</th><th className="px-4 py-3 text-center">삭제</th></tr></thead>
              <tbody>{filteredExchangeResults.map(e => <tr key={e.id} className="border-b hover:bg-slate-50"><td className="px-4 py-3 border-r font-bold">{e.date}</td><td className="px-4 py-3 border-r text-right font-mono">{formatKRW(e.krwAmount)}</td><td className="px-4 py-3 border-r text-right font-mono">{formatUSD(e.usdAmount)}</td><td className="px-6 py-3 border-r text-center font-mono font-black">{e.exchangeRate?.toFixed(2)}</td><td className="px-4 py-3 text-center"><button onClick={() => onDeleteExchangeResult(e.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'coffee' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-amber-500" /> 커피 지수 데이터 관리</h3>
            <form onSubmit={handleAddCoffeeIndex} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-[10px] font-bold text-slate-400 mb-1">연도</label><select value={coffeeData.year} onChange={e => setCoffeeData({...coffeeData, year: e.target.value})} className="w-full text-sm font-black border rounded-lg px-3 py-2">{['24','25','26','27','28','29','30'].map(y => <option key={y} value={y}>{2000+parseInt(y)}년</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-400 mb-1">월물</label><select value={coffeeData.monthNumber} onChange={e => setCoffeeData({...coffeeData, monthNumber: e.target.value})} className="w-full text-sm font-black border rounded-lg px-3 py-2">{Array.from({length:12}).map((_,i) => {const m = String(i+1).padStart(2,'0'); return <option key={m} value={m}>{m}월물</option>})}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-400 mb-1">지수 (c/lb)</label><input type="number" step="0.01" value={coffeeData.price} onChange={e => setCoffeeData({...coffeeData, price: e.target.value})} className="w-full text-sm font-black border rounded-lg px-3 py-2" required /></div>
              <div className="flex items-end"><button type="submit" className="w-full bg-amber-500 text-white font-black py-2 rounded-lg hover:bg-amber-600 transition">저장</button></div>
            </form>
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 border-b"><tr><th className="px-6 py-3 border-r">월물</th><th className="px-6 py-3 border-r text-right">지수</th><th className="px-6 py-3 border-r text-right">예상 지수 (+50)</th><th className="px-6 py-3 text-center">삭제</th></tr></thead>
              <tbody>{coffeeIndices.map(item => <tr key={item.id} className="border-b font-black"><td className="px-6 py-4 border-r text-slate-800">{item.month}</td><td className="px-6 py-4 border-r text-right text-slate-400 font-mono">{item.price?.toFixed(2)}</td><td className="px-6 py-4 border-r text-right text-amber-600 font-mono">{(item.price + 50).toFixed(2)}</td><td className="px-6 py-4 text-center"><button onClick={() => onDeleteCoffeeIndex(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 scale-in-center">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm border-b pb-4">
              <Package className="w-4 h-4 text-indigo-500" /> 생두 계약 정보 등록/수정
              {contractData.isEditing && <span className="text-[10px] text-indigo-500 font-black ml-2 animate-pulse">[편집 중]</span>}
            </h3>
            <form onSubmit={handleAddContract} className="grid grid-cols-1 md:grid-cols-5 gap-y-6 gap-x-4">
              {/* 산지 선택 */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex justify-between">산지 <span>{isNewOrigin ? '직접입력' : '기존선택'}</span></label>
                <div className="flex gap-1">
                  {isNewOrigin ? (
                    <input type="text" placeholder="산지명 입력" value={contractData.origin} onChange={e => setContractData({...contractData, origin: e.target.value})} className="flex-1 text-xs font-black bg-white border-2 border-indigo-100 rounded-lg px-3 py-2.5 shadow-sm" required />
                  ) : (
                    <select value={contractData.origin} onChange={e => setContractData({...contractData, origin: e.target.value})} className="flex-1 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 appearance-none" required>
                      <option value="">산지 선택</option>
                      {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setIsNewOrigin(!isNewOrigin)} className={`px-3 py-2 rounded-lg border transition-all ${isNewOrigin ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400'}`}>
                    {isNewOrigin ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 공급업체 선택 */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex justify-between">공급업체 <span>{isNewSupplier ? '직접입력' : '기존선택'}</span></label>
                <div className="flex gap-1">
                  {isNewSupplier ? (
                    <input type="text" placeholder="업체명 입력" value={contractData.supplier} onChange={e => setContractData({...contractData, supplier: e.target.value})} className="flex-1 text-xs font-black bg-white border-2 border-indigo-100 rounded-lg px-3 py-2.5 shadow-sm" required />
                  ) : (
                    <select value={contractData.supplier} onChange={e => setContractData({...contractData, supplier: e.target.value})} className="flex-1 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 appearance-none" required>
                      <option value="">업체 선택</option>
                      {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setIsNewSupplier(!isNewSupplier)} className={`px-3 py-2 rounded-lg border transition-all ${isNewSupplier ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400'}`}>
                    {isNewSupplier ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 계약번호 / 차수 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">계약번호 / 지급차수</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="No." value={contractData.contractNo} onChange={e => setContractData({...contractData, contractNo: e.target.value})} className="flex-1 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5" />
                  <input type="text" placeholder="차수" value={contractData.installment} onChange={e => setContractData({...contractData, installment: e.target.value})} className="w-16 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5" />
                </div>
              </div>

              {/* 디퍼런셜 강조 */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-indigo-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> 디퍼런셜 (Differential) - 필수 입력
                </label>
                <div className="relative group">
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Diff 입력 (ex: -6.00)" 
                    value={contractData.differential} 
                    onChange={e => setContractData({...contractData, differential: e.target.value})} 
                    className="w-full text-xl font-black bg-indigo-50/50 border-2 border-indigo-300 rounded-xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-indigo-700 placeholder:text-indigo-200" 
                    required 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-300">c/lb</span>
                </div>
              </div>

              {/* 월물 / 지수 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">월물 선택 / 현재 지수</label>
                <div className="flex gap-1">
                  <select value={contractData.contractMonth} onChange={e => {
                    const month = e.target.value;
                    const price = coffeeIndices.find(c => c.month === month)?.price || '';
                    setContractData({...contractData, contractMonth: month, index: price});
                  }} className="flex-1 text-[10px] font-black border border-slate-200 rounded-lg px-2 py-2.5">
                    <option value="">월물 선택</option>
                    {coffeeIndices.map(c => <option key={c.id} value={c.month}>{c.month}</option>)}
                  </select>
                  <input type="number" step="0.01" placeholder="Index" value={contractData.index} onChange={e => setContractData({...contractData, index: e.target.value})} className="w-20 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-2 py-2.5" />
                </div>
              </div>

              {/* 중량 / 환율 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">중량 (kg) / 기안 환율</label>
                <div className="flex gap-1">
                  <input type="number" placeholder="kg" value={contractData.weight} onChange={e => setContractData({...contractData, weight: e.target.value})} className="flex-1 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-2 py-2.5" required />
                  <input type="number" value={contractData.planExchangeRate} onChange={e => setContractData({...contractData, planExchangeRate: e.target.value})} className="w-24 text-xs font-black bg-slate-100 border border-slate-300 rounded-lg px-2 py-2.5 text-indigo-600 shadow-inner" required />
                </div>
              </div>

              {/* 지급 시기 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">대금지급 예정 시기 (연/월)</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="2026" value={contractData.paymentYear} onChange={e => setContractData({...contractData, paymentYear: e.target.value})} className="flex-1 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-2 py-2.5" />
                  <input type="text" placeholder="01" value={contractData.paymentMonth} onChange={e => setContractData({...contractData, paymentMonth: e.target.value})} className="w-14 text-xs font-black bg-slate-50 border border-slate-200 rounded-lg px-2 py-2.5" />
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="md:col-span-2 flex items-end gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> {contractData.isEditing ? '계약 수정사항 저장' : '새로운 계약 등록'}
                </button>
                {contractData.isEditing && (
                  <button type="button" onClick={resetContractForm} className="px-4 py-3.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50">취소</button>
                )}
              </div>

              {/* 실시간 계산 요약 */}
              <div className="md:col-span-5 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-200">
                <div className="flex flex-wrap justify-center md:justify-start gap-8">
                  <div>
                    <span className="block text-[10px] text-indigo-200 font-bold uppercase mb-1">단가 산출 ($/kg)</span>
                    <span className="text-2xl font-black">
                      ${((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000).toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-indigo-200 font-bold uppercase mb-1">총 예상 금액 (USD)</span>
                    <span className="text-2xl font-black">
                      ${(((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000) * parseFloat(contractData.weight || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="border-l border-white/20 pl-8">
                    <span className="block text-[10px] text-indigo-200 font-bold uppercase mb-1">원화 환산 (KRW)</span>
                    <span className="text-2xl font-black text-amber-300">
                      {Math.round(((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000) * parseFloat(contractData.weight || 0) * (parseFloat(contractData.planExchangeRate) || exchangeRate)).toLocaleString()}원
                    </span>
                  </div>
                </div>
                <div className="text-[10px] bg-white/10 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
                   산식: (Index + Diff) * 22.046 / 1000
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <List className="w-4 h-4 text-indigo-500" /> 등록된 생두 계약 리스트 (전체)
                </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse whitespace-nowrap min-w-[1600px]">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3 border-r bg-slate-100/30 sticky left-0 z-10">산지</th>
                    <th className="px-4 py-3 border-r bg-slate-100/30 sticky left-[100px] z-10">공급업체</th>
                    <th className="px-4 py-3 border-r">계약번호</th>
                    <th className="px-4 py-3 border-r text-center">차수</th>
                    <th className="px-4 py-3 border-r text-center">지급 시기</th>
                    <th className="px-4 py-3 border-r">매칭 월물</th>
                    <th className="px-4 py-3 border-r text-center text-indigo-600 bg-indigo-50/30">디퍼런셜</th>
                    <th className="px-4 py-3 border-r text-center">합산 지수</th>
                    <th className="px-4 py-3 border-r text-right font-black text-indigo-600">단가 ($/kg)</th>
                    <th className="px-4 py-3 border-r text-right font-black text-indigo-800 bg-amber-50/20">총 원화 금액</th>
                    <th className="px-4 py-3 text-center sticky right-0 bg-white">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {rawBeanContracts.sort((a,b) => b.id - a.id).map((c) => {
                    const unitPrice = (parseFloat(c.index || 0) + parseFloat(c.differential || 0)) * 22.046 / 1000;
                    const amountUSD = unitPrice * parseFloat(c.weight || 0);
                    const amountKRW = Math.round(amountUSD * parseFloat(c.planExchangeRate || exchangeRate));
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 border-r font-black text-slate-900 bg-white sticky left-0 z-5 group-hover:bg-slate-50">{c.origin}</td>
                        <td className="px-4 py-3 border-r font-black text-slate-900 bg-white sticky left-[100px] z-5 group-hover:bg-slate-50">{c.supplier}</td>
                        <td className="px-4 py-3 border-r font-mono text-slate-400">{c.contractNo}</td>
                        <td className="px-4 py-3 border-r text-center">{c.installment}차</td>
                        <td className="px-4 py-3 border-r text-center font-bold text-slate-400">{c.paymentYear}.{c.paymentMonth}</td>
                        <td className="px-4 py-3 border-r font-black text-slate-700">{c.contractMonth}</td>
                        <td className="px-4 py-3 border-r text-center font-black text-indigo-700 bg-indigo-50/20">{c.differential?.toFixed(2)}</td>
                        <td className="px-4 py-3 border-r text-center font-mono">{(parseFloat(c.index || 0) + parseFloat(c.differential || 0)).toFixed(2)}</td>
                        <td className="px-4 py-3 border-r text-right font-black text-indigo-600">${unitPrice.toFixed(4)}</td>
                        <td className="px-4 py-3 border-r text-right font-black text-indigo-800 bg-amber-50/10">{amountKRW.toLocaleString()}원</td>
                        <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-5px_0_10px_rgba(0,0,0,0.02)] group-hover:bg-slate-50">
                           <div className="flex gap-2 justify-center">
                             <button onClick={() => startEditContract(c)} className="text-slate-300 hover:text-indigo-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                             <button onClick={() => onDeleteRawBeanContract(c.id)} className="text-slate-300 hover:text-rose-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
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
      )}

      {showCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-black flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> 커피 지수 기반 금액 산출</h3>
              <button onClick={() => setShowCalc(false)} className="hover:bg-indigo-500 p-1.5 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">지수 선택 (월물)</label><select value={calcData.indexId} onChange={e => setCalcData({...calcData, indexId: e.target.value})} className="w-full text-sm font-black bg-slate-50 border rounded-xl px-4 py-3">{<option value="">월물을 선택하세요</option>}{coffeeIndices.map(item => <option key={item.id} value={item.id}>{item.month} (지수: {item.price})</option>)}</select></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">총 물량 (KG)</label><input type="number" value={calcData.quantity} onChange={e => setCalcData({...calcData, quantity: e.target.value})} placeholder="ex) 19200" className="w-full text-sm font-black bg-slate-50 border rounded-xl px-4 py-3" /></div>
              {calcData.indexId && calcData.quantity && <div className="mt-3 text-[10px] font-bold text-amber-600 bg-amber-50 p-4 rounded-xl">계산결과: <span className="text-lg block text-amber-800 font-black">${(((coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price + 50) * 22.046 / 1000) * parseFloat(calcData.quantity)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>}
              <button onClick={applyCalculation} disabled={!calcData.indexId || !calcData.quantity} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl disabled:opacity-50">금액 적용하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForeignSchedulePage;
