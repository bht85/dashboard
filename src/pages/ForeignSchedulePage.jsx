import React, { useState } from 'react';
import { Globe, Plus, Trash2, ArrowRightLeft, Calendar, Edit2, Check, X, ChevronLeft, ChevronRight, Package, List } from 'lucide-react';
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
    date: '',
    client: '',
    amount: '',
    bank: '',
    account: '',
    desc: '',
    status: '지출결의 미확인',
    currency: 'USD',
  });

  // Exchange Form State
  const [exchangeData, setExchangeData] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    krwAmount: '',
    usdAmount: '',
    bank: '',
    desc: '',
    section: '스마트팩토리',
    type: 'BUY',
    currency: 'USD',
  });

  // Raw Bean Contract State
  const [contractData, setContractData] = useState({
    origin: '', supplier: '', contractNo: '', containerCount: '', installment: '',
    paymentStatus: 'X', paymentYear: '2026', paymentMonth: '01', paymentDay: '',
    contractMonth: '', differential: '', index: '', indexStatus: '미정',
    weight: '', planExchangeRate: '1500', amountConfirmed: '미확정',
    isEditing: false, id: null
  });

  // Coffee Index Form State
  const [coffeeData, setCoffeeData] = useState({
    year: '26',
    monthNumber: '04',
    price: '',
    isEditing: false,
    id: null
  });

  // Calculation Modal State
  const [showCalc, setShowCalc] = useState(false);
  const [calcData, setCalcData] = useState({
    indexId: '',
    quantity: '',
  });

  const handleScheduleChange = (e) => {
    setScheduleData({ ...scheduleData, [e.target.name]: e.target.value });
  };

  const handleExchangeChange = (e) => {
    setExchangeData({ ...exchangeData, [e.target.name]: e.target.value });
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleData.date || !scheduleData.client || !scheduleData.amount) return;

    const newSchedule = {
      id: Date.now(),
      date: scheduleData.date,
      client: scheduleData.client,
      amount: parseFloat(scheduleData.amount),
      bank: scheduleData.bank,
      account: scheduleData.account,
      desc: scheduleData.desc,
      status: scheduleData.status,
      currency: scheduleData.currency,
    };

    await onUpdateSchedule(newSchedule);
    setScheduleData({
      date: '', client: '', amount: '', bank: '', account: '', desc: '', status: '지출결의 미확인', currency: 'USD'
    });
  };

  const handleAddExchange = async (e) => {
    e.preventDefault();
    const rate = parseFloat(exchangeData.krwAmount) / parseFloat(exchangeData.usdAmount);
    await onUpdateExchangeResult({
      ...exchangeData,
      id: Date.now(),
      exchangeRate: rate,
      krwAmount: parseFloat(exchangeData.krwAmount),
      usdAmount: parseFloat(exchangeData.usdAmount)
    });
    setExchangeData({
      date: new Date().toLocaleDateString('en-CA'),
      krwAmount: '', usdAmount: '', bank: '', desc: '', section: '스마트팩토리', type: 'BUY', currency: 'USD'
    });
  };

  const handleStatusChange = async (id, newStatus) => {
    const item = fxSchedule.find(s => s.id === id);
    if (item) {
      await onUpdateSchedule({ ...item, status: newStatus });
    }
  };

  const handleDateChange = async (id, newDate) => {
    const item = fxSchedule.find(s => s.id === id);
    if (item) {
      await onUpdateSchedule({ ...item, date: newDate });
    }
  };

  const changeMonth = (offset) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(date.toISOString().substring(0, 7));
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const startEditSchedule = (item) => {
    setEditingScheduleId(item.id);
    setEditScheduleData({ ...item });
  };

  const cancelEditSchedule = () => {
    setEditingScheduleId(null);
    setEditScheduleData({});
  };

  const handleEditScheduleChange = (e) => {
    setEditScheduleData({ ...editScheduleData, [e.target.name]: e.target.value });
  };

  const saveEditSchedule = async () => {
    await onUpdateSchedule({
      ...editScheduleData,
      amount: parseFloat(editScheduleData.amount)
    });
    setEditingScheduleId(null);
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
        planExchangeRate: parseFloat(contractData.planExchangeRate || 0)
    });
    resetContractForm();
  };

  const resetContractForm = () => {
    setContractData({
        origin: '', supplier: '', contractNo: '', containerCount: '', installment: '',
        paymentStatus: 'X', paymentYear: '2026', paymentMonth: '01', paymentDay: '',
        contractMonth: '', differential: '', index: '', indexStatus: '미정',
        weight: '', planExchangeRate: '1500', amountConfirmed: '미확정',
        isEditing: false, id: null
    });
  };

  const startEditContract = (item) => {
    setContractData({ ...item, isEditing: true });
    setActiveTab('beans');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditCoffee = (item) => {
    const match = item.month.match(/'(\d{2})\.\s*(\d{2})월물/);
    setCoffeeData({ 
        ...item, 
        year: match ? match[1] : '26',
        monthNumber: match ? match[2] : '01',
        isEditing: true 
    });
  };

  const applyCalculation = () => {
    const selected = coffeeIndices.find(c => String(c.id) === String(calcData.indexId));
    if (!selected || !calcData.quantity) return;
    
    const expectedIndex = selected.price + 50;
    const calculatedAmount = (expectedIndex * 22.046 / 1000) * parseFloat(calcData.quantity);
    
    setScheduleData({
        ...scheduleData,
        amount: calculatedAmount.toFixed(2),
        desc: `${selected.month} ${calcData.quantity}kg 산출분 (예상:${expectedIndex}c/lb)`
    });
    setShowCalc(false);
    setCalcData({ indexId: '', quantity: '' });
  };

  const filteredSchedule = fxSchedule
    .filter(s => s.date.startsWith(selectedMonth))
    .filter(s => {
      if (scheduleStatusFilter === 'PENDING') return s.status !== '송금 완료(집행)';
      if (scheduleStatusFilter === 'COMPLETED') return s.status === '송금 완료(집행)';
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredExchangeResults = (Array.isArray(exchangeResults) ? exchangeResults : [])
    .filter(e => e.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> 외화 송금 일정
          </button>
          <button onClick={() => setActiveTab('exchange')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'exchange' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ArrowRightLeft className="w-3.5 h-3.5" /> 외화 환전 결과
          </button>
          <button onClick={() => setActiveTab('coffee')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'coffee' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Globe className="w-3.5 h-3.5 text-amber-500" /> 커피 지수 관리
          </button>
          <button onClick={() => setActiveTab('beans')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'beans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Package className="w-3.5 h-3.5 text-indigo-500" /> 생두 계약 관리
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => changeMonth(-1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-700 px-3 min-w-[100px] text-center">
            {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월
          </span>
          <button onClick={() => changeMonth(1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" /> 신규 송금 일정 기입
              </div>
              <button 
                onClick={() => setShowCalc(true)}
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3 h-3" /> 커피 지수 기반 금액 산출
              </button>
            </h3>
            <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지급예정일</label>
                <input type="date" name="date" value={scheduleData.date} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래처</label>
                <input type="text" name="client" value={scheduleData.client} onChange={handleScheduleChange} placeholder="ex) 블레스빈" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">금액 ({scheduleData.currency})</label>
                <input type="number" step="0.01" name="amount" value={scheduleData.amount} onChange={handleScheduleChange} placeholder="ex) 5000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">상태</label>
                <select name="status" value={scheduleData.status} onChange={handleScheduleChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="지출결의 미확인">지출결의 미확인</option>
                  <option value="지출결의 확인">지출결의 확인</option>
                  <option value="송금 완료(집행)">송금 완료(집행)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">통화</label>
                <select name="currency" value={scheduleData.currency} onChange={handleScheduleChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">은행명</label>
                <input type="text" name="bank" value={scheduleData.bank} onChange={handleScheduleChange} placeholder="ex) 기업" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">내용</label>
                <input type="text" name="desc" value={scheduleData.desc} onChange={handleScheduleChange} placeholder="ex) 에티오피아 대금지급..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-4 mt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> 등록하기
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-indigo-500" /> 송금 일정 리스트
                </h3>
                <div className="flex bg-slate-200/50 p-1 rounded-lg gap-1">
                    {['ALL', 'PENDING', 'COMPLETED'].map(f => (
                         <button key={f} onClick={() => setScheduleStatusFilter(f)} className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${scheduleStatusFilter === f ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                            {f === 'ALL' ? `전체 (${fxSchedule.filter(s => s.date.startsWith(selectedMonth)).length})` : f === 'PENDING' ? `송금 대기 (${fxSchedule.filter(s => s.date.startsWith(selectedMonth) && s.status !== '송금 완료(집행)').length})` : `송금 완료 (${fxSchedule.filter(s => s.date.startsWith(selectedMonth) && s.status === '송금 완료(집행)').length})`}
                         </button>
                    ))}
                </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3 border-r">지급예정일</th>
                    <th className="px-4 py-3 border-r">거래처</th>
                    <th className="px-4 py-3 border-r text-right">금액 (외화)</th>
                    <th className="px-6 py-3 border-r text-right text-indigo-500">환산 금액 (KRW)</th>
                    <th className="px-4 py-3 border-r text-center">은행명</th>
                    <th className="px-4 py-3 border-r">내용</th>
                    <th className="px-4 py-3 border-r">상태</th>
                    <th className="px-4 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredSchedule.map((s) => {
                    const isEditing = editingScheduleId === s.id;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 group transition-colors ${isEditing ? 'bg-indigo-50/30' : ''}`}>
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2 border-r">
                              <input type="date" name="date" value={editScheduleData.date} onChange={handleEditScheduleChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <input type="text" name="client" value={editScheduleData.client} onChange={handleEditScheduleChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <div className="flex gap-1">
                                <select name="currency" value={editScheduleData.currency} onChange={handleEditScheduleChange} className="text-[10px] font-bold border rounded w-16">
                                  <option value="USD">USD</option>
                                  <option value="EUR">EUR</option>
                                  <option value="JPY">JPY</option>
                                </select>
                                <input type="number" step="0.01" name="amount" value={editScheduleData.amount} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border rounded px-1 py-1 outline-none text-right" />
                              </div>
                            </td>
                            <td className="px-6 py-2 border-r text-right font-mono font-black text-slate-400 bg-indigo-50/10">-</td>
                            <td className="px-4 py-2 border-r text-center">
                              <input type="text" name="bank" value={editScheduleData.bank} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border rounded px-1 py-1" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <input type="text" name="desc" value={editScheduleData.desc} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border rounded px-1 py-1" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <select name="status" value={editScheduleData.status} onChange={handleEditScheduleChange} className="text-[9px] font-black w-full border rounded p-1">
                                <option value="지출결의 확인">지출결의 확인</option>
                                <option value="지출결의 미확인">지출결의 미확인</option>
                                <option value="송금 완료(집행)">송금 완료(집행)</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={saveEditSchedule} className="p-1.5 bg-indigo-600 text-white rounded text-[9px] font-bold">저장</button>
                                <button onClick={cancelEditSchedule} className="p-1.5 bg-white text-slate-400 border rounded text-[9px]">취소</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 border-r">
                              <input type="date" value={s.date} onChange={(e) => handleDateChange(s.id, e.target.value)} className="text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer w-full" />
                            </td>
                            <td className="px-4 py-3 border-r font-bold text-slate-800">{s.client}</td>
                            <td className="px-4 py-3 border-r text-right font-mono font-bold text-blue-600">
                              {(!s.currency || s.currency === 'USD') ? formatUSD(s.amount) : `${s.amount.toLocaleString()} ${s.currency}`}
                            </td>
                            <td className="px-6 py-3 border-r text-right font-mono font-black text-slate-900 bg-indigo-50/10">
                              {formatKRW(s.amount * (s.currency === 'EUR' ? exchangeRateEUR : s.currency === 'JPY' ? exchangeRateJPY : exchangeRate))}
                            </td>
                            <td className="px-4 py-3 border-r text-center">{s.bank}</td>
                            <td className="px-4 py-3 border-r text-[10px] text-slate-400">{s.desc}</td>
                            <td className="px-4 py-3 border-r">
                              <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value)} className={`text-[9px] font-black px-2 py-1 rounded-lg border-0 outline-none cursor-pointer transition-colors ${s.status === '송금 완료(집행)' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : s.status === '지출결의 확인' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                <option value="지출결의 확인">지출결의 확인</option>
                                <option value="지출결의 미확인">지출결의 미확인</option>
                                <option value="송금 완료(집행)">송금 완료(집행)</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEditSchedule(s)} className="text-slate-300 hover:text-indigo-500 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onDeleteSchedule(s.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'exchange' ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-emerald-500" /> 신규 환전 결과 기록
            </h3>
            <form onSubmit={handleAddExchange} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">환전일자</label>
                <input type="date" name="date" value={exchangeData.date} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래 통화</label>
                <select name="currency" value={exchangeData.currency} onChange={handleExchangeChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래 유형</label>
                <select name="type" value={exchangeData.type} onChange={handleExchangeChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
                  <option value="BUY">KRW → 외화 (매입)</option>
                  <option value="SELL">외화 → KRW (매각)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{exchangeData.type === 'BUY' ? '지출금액 (KRW)' : '입금금액 (KRW)'}</label>
                <input type="number" name="krwAmount" value={exchangeData.krwAmount} onChange={handleExchangeChange} placeholder="ex) 1500000" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required />
              </div>
              <div className="flex items-center justify-center pt-5">
                <ArrowRightLeft className={`w-4 h-4 ${exchangeData.type === 'BUY' ? 'text-emerald-500' : 'text-rose-500 rotate-180'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{exchangeData.type === 'BUY' ? '입금금액 (외화)' : '지출금액 (외화)'}</label>
                <input type="number" step="0.01" name="usdAmount" value={exchangeData.usdAmount} onChange={handleExchangeChange} placeholder="ex) 1000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" required />
              </div>
              <div className="md:col-span-5 grid grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">적용 환율</label>
                   <div className="w-full text-sm font-black text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2">
                     {exchangeData.krwAmount && exchangeData.usdAmount ? (parseFloat(exchangeData.krwAmount) / parseFloat(exchangeData.usdAmount)).toFixed(2) : '0.00'}
                   </div>
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">매입 법인</label>
                   <select name="section" value={exchangeData.section} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none">
                     <option value="컴포즈커피">컴포즈커피</option>
                     <option value="스마트팩토리">스마트팩토리</option>
                   </select>
                 </div>
                 <div className="flex items-end">
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 focus:scale-[0.98]">
                      <Plus className="w-4 h-4"/> 결과 저장
                    </button>
                 </div>
              </div>
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">내용 / 비고</label>
                <input type="text" name="desc" value={exchangeData.desc} onChange={handleExchangeChange} placeholder="3월분 생두 매입 대금 환전..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" />
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> 환전 집계 리스트
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3 border-r">환전 일자</th>
                    <th className="px-4 py-3 border-r text-center">유형</th>
                    <th className="px-4 py-3 border-r text-center">통화</th>
                    <th className="px-4 py-3 border-r text-right">매입 금액 (KRW)</th>
                    <th className="px-4 py-3 border-r text-right">환전 금액 (외화)</th>
                    <th className="px-6 py-3 border-r text-center bg-emerald-50/30 text-emerald-600">적용 환율</th>
                    <th className="px-4 py-3 border-r text-center">법인</th>
                    <th className="px-4 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredExchangeResults.map((e) => {
                    const isBuy = (e.type || 'BUY').toUpperCase() === 'BUY';
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="px-4 py-3 border-r font-bold">{e.date}</td>
                        <td className="px-4 py-3 border-r text-center">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black ${isBuy ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{isBuy ? '매입' : '매각'}</span>
                        </td>
                        <td className="px-4 py-3 border-r text-center font-black text-indigo-500">{e.currency || 'USD'}</td>
                        <td className="px-4 py-3 border-r text-right font-mono font-bold">{formatKRW(e.krwAmount)}</td>
                        <td className="px-4 py-3 border-r text-right font-mono font-bold">{(e.currency || 'USD') === 'USD' ? formatUSD(e.usdAmount) : `${e.usdAmount.toLocaleString()} ${e.currency}`}</td>
                        <td className="px-6 py-3 border-r text-center font-mono font-black">{e.exchangeRate?.toFixed(2)}</td>
                        <td className="px-4 py-3 border-r text-center">{e.section || '스마트'}</td>
                        <td className="px-4 py-3 text-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => onDeleteExchangeResult(e.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'coffee' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-amber-500" /> 커피 지수(월물) 데이터 관리
            </h3>
            <form onSubmit={handleAddCoffeeIndex} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">연도 선택</label>
                <select value={coffeeData.year} onChange={(e) => setCoffeeData({...coffeeData, year: e.target.value})} className="w-full text-sm font-black bg-slate-50 border rounded-lg px-3 py-2">
                  {['24','25','26','27','28','29','30'].map(y => <option key={y} value={y}>{2000+parseInt(y)}년</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">월물 선택</label>
                <select value={coffeeData.monthNumber} onChange={(e) => setCoffeeData({...coffeeData, monthNumber: e.target.value})} className="w-full text-sm font-black bg-slate-50 border rounded-lg px-3 py-2">
                  {Array.from({length:12}).map((_,i) => {
                    const m = String(i+1).padStart(2,'0');
                    return <option key={m} value={m}>{m}월물</option>
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">커피 지수 (c/lb)</label>
                <input type="number" step="0.01" value={coffeeData.price} onChange={(e) => setCoffeeData({...coffeeData, price: e.target.value})} className="w-full text-sm font-black bg-slate-50 border rounded-lg px-3 py-2" required />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="flex-1 bg-amber-500 text-white font-black py-2 rounded-lg hover:bg-amber-600 transition shadow-sm">
                  {coffeeData.isEditing ? '수정 완료' : '데이터 저장'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-amber-500" /> 저장된 지수 리스트
                </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px]">
                  <tr>
                    <th className="px-6 py-3 border-r">월물</th>
                    <th className="px-6 py-3 border-r text-right">커피 지수 (c/lb)</th>
                    <th className="px-6 py-3 border-r text-right bg-amber-50 text-amber-700">예상 커피 지수 (+50)</th>
                    <th className="px-6 py-3 border-r text-right text-indigo-500">예상 KG당 단가 (USD)</th>
                    <th className="px-6 py-3 border-r text-center">기록 일자</th>
                    <th className="px-6 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {coffeeIndices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 border-r font-black text-slate-800">{item.month}</td>
                      <td className="px-6 py-4 border-r text-right font-mono font-black text-slate-400">{item.price?.toFixed(2)}</td>
                      <td className="px-6 py-4 border-r text-right font-mono font-black text-amber-600 bg-amber-50/20">{(item.price + 50).toFixed(2)}</td>
                      <td className="px-6 py-4 border-r text-right font-mono font-bold text-indigo-500">
                        ${((item.price + 50) * 22.046 / 1000).toLocaleString(undefined, {minimumFractionDigits: 4})}
                      </td>
                      <td className="px-6 py-4 border-r text-center font-bold text-slate-400">{item.updatedAt || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => onDeleteCoffeeIndex(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm border-b pb-4">
              <Package className="w-4 h-4 text-indigo-500" /> 신규 생두 계약 등록
            </h3>
            <form onSubmit={handleAddContract} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">산지 / 공급업체</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="산지" value={contractData.origin} onChange={e => setContractData({...contractData, origin: e.target.value})} className="w-1/2 text-xs font-bold bg-slate-50 border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" required />
                  <input type="text" placeholder="공급업체" value={contractData.supplier} onChange={e => setContractData({...contractData, supplier: e.target.value})} className="w-1/2 text-xs font-bold bg-slate-50 border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">계약번호 / 컨테이너</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="No." value={contractData.contractNo} onChange={e => setContractData({...contractData, contractNo: e.target.value})} className="flex-1 text-xs font-bold bg-slate-50 border rounded px-2 py-1.5 outline-none" />
                  <input type="number" placeholder="Cnt" value={contractData.containerCount} onChange={e => setContractData({...contractData, containerCount: e.target.value})} className="w-12 text-xs font-bold bg-slate-50 border rounded px-1 py-1.5 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">차수 / 지급상태</label>
                <div className="flex gap-1">
                  <input type="text" placeholder="차수" value={contractData.installment} onChange={e => setContractData({...contractData, installment: e.target.value})} className="w-12 text-xs font-bold bg-slate-50 border rounded px-1 py-1.5 outline-none" />
                  <select value={contractData.paymentStatus} onChange={e => setContractData({...contractData, paymentStatus: e.target.value})} className="flex-1 text-xs font-bold border rounded p-1">
                    <option value="O">완료</option>
                    <option value="X">미완</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">월물 / 합산지수(Index + Diff)</label>
                <div className="flex gap-1">
                  <select value={contractData.contractMonth} onChange={e => {
                    const month = e.target.value;
                    const index = coffeeIndices.find(c => c.month === month)?.price || '';
                    setContractData({...contractData, contractMonth: month, index: index});
                  }} className="flex-1 text-[9px] font-bold border rounded p-1">
                    <option value="">월물 선택</option>
                    {coffeeIndices.map(c => <option key={c.id} value={c.month}>{c.month}</option>)}
                  </select>
                  <input type="number" step="0.01" placeholder="Index" value={contractData.index} onChange={e => setContractData({...contractData, index: e.target.value})} className="w-14 text-xs font-bold bg-slate-50 border rounded px-1 py-1.5 outline-none" />
                  <input type="number" step="0.1" placeholder="Diff" value={contractData.differential} onChange={e => setContractData({...contractData, differential: e.target.value})} className="w-10 text-xs font-bold bg-slate-50 border rounded px-1 py-1.5 outline-none" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-xs">
                  {contractData.isEditing ? '계약 수정' : '계약 등록'}
                </button>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">중량 (kg) / 기안 환율</label>
                <div className="flex gap-1">
                  <input type="number" placeholder="kg" value={contractData.weight} onChange={e => setContractData({...contractData, weight: e.target.value})} className="w-1/2 text-xs font-bold bg-slate-50 border rounded px-2 py-1.5 outline-none" required />
                  <input type="number" placeholder="환율" value={contractData.planExchangeRate} onChange={e => setContractData({...contractData, planExchangeRate: e.target.value})} className="w-1/2 text-xs font-bold bg-slate-50 border rounded px-2 py-1.5 outline-none" required />
                </div>
              </div>
              <div className="md:col-span-1">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지수 상태 / 금액 확정</label>
                 <div className="flex gap-1">
                   <select value={contractData.indexStatus} onChange={e => setContractData({...contractData, indexStatus: e.target.value})} className="w-1/2 text-xs font-bold border rounded p-1">
                     <option value="미정">미정</option>
                     <option value="확정">확정</option>
                   </select>
                   <select value={contractData.amountConfirmed} onChange={e => setContractData({...contractData, amountConfirmed: e.target.value})} className="w-1/2 text-xs font-bold border rounded p-1">
                     <option value="미확정">미확정</option>
                     <option value="금액 확정">확정</option>
                   </select>
                 </div>
              </div>
              <div className="md:col-span-3 bg-indigo-50/50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex gap-4">
                  <div>
                    <span className="block text-[9px] text-indigo-400 font-bold">예상 단가 ($/kg)</span>
                    <span className="text-sm font-black text-indigo-700">
                      ${((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000).toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-indigo-400 font-bold">총 금액 (USD)</span>
                    <span className="text-sm font-black text-indigo-700">
                      ${(((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000) * parseFloat(contractData.weight || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <List className="w-4 h-4 text-indigo-500" /> 생두 계약 리스트 (통합 뷰)
                </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse whitespace-nowrap min-w-[1500px]">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-3 py-3 border-r bg-slate-100/50 sticky left-0 z-20">산지</th>
                    <th className="px-3 py-3 border-r bg-slate-100/50 sticky left-[60px] z-20">공급업체</th>
                    <th className="px-3 py-3 border-r">계약번호</th>
                    <th className="px-3 py-3 border-r text-center">차수</th>
                    <th className="px-3 py-3 border-r">지급시기</th>
                    <th className="px-3 py-3 border-r">월물</th>
                    <th className="px-3 py-3 border-r text-center">지수</th>
                    <th className="px-3 py-3 border-r text-center">디퍼</th>
                    <th className="px-3 py-3 border-r text-right bg-indigo-50/50 text-indigo-600 font-black">단가 ($/kg)</th>
                    <th className="px-3 py-3 border-r text-right font-black text-indigo-800">금액 (원)</th>
                    <th className="px-3 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {rawBeanContracts.map((c) => {
                    const unitPrice = (parseFloat(c.index || 0) + parseFloat(c.differential || 0)) * 22.046 / 1000;
                    const amountUSD = unitPrice * parseFloat(c.weight || 0);
                    const amountKRW = Math.round(amountUSD * parseFloat(c.planExchangeRate || 0));
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 group">
                        <td className="px-3 py-2 border-r font-bold bg-white sticky left-0 z-10 group-hover:bg-slate-50">{c.origin}</td>
                        <td className="px-3 py-2 border-r font-bold bg-white sticky left-[60px] z-10 group-hover:bg-slate-50">{c.supplier}</td>
                        <td className="px-3 py-2 border-r">{c.contractNo}</td>
                        <td className="px-3 py-2 border-r text-center">{c.installment}</td>
                        <td className="px-3 py-2 border-r">
                           {c.paymentYear}.{c.paymentMonth}
                        </td>
                        <td className="px-3 py-2 border-r font-bold">{c.contractMonth}</td>
                        <td className="px-3 py-2 border-r text-center">{c.index}</td>
                        <td className="px-3 py-2 border-r text-center">{c.differential}</td>
                        <td className="px-3 py-2 border-r text-right font-black text-indigo-600">${unitPrice.toFixed(4)}</td>
                        <td className="px-3 py-2 border-r text-right font-black text-indigo-800">{amountKRW.toLocaleString()}원</td>
                        <td className="px-3 py-2 text-center">
                           <div className="flex items-center justify-center gap-1.5 focus:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEditContract(c)} className="text-slate-300 hover:text-indigo-500"><Edit2 className="w-3 h-3" /></button>
                             <button onClick={() => onDeleteRawBeanContract(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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
              <h3 className="font-black flex items-center gap-2 tracking-tight">
                <ArrowRightLeft className="w-5 h-5" /> 커피 지수 기반 금액 산출
              </h3>
              <button onClick={() => setShowCalc(false)} className="hover:bg-indigo-500 p-1.5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">지수 선택 (월물)</label>
                <select 
                  value={calcData.indexId} 
                  onChange={(e) => setCalcData({...calcData, indexId: e.target.value})}
                  className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">지수 또는 월물을 선택하세요</option>
                  {coffeeIndices.map(item => (
                    <option key={item.id} value={item.id}>{item.month} (지수: {item.price} c/lb)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">총 물량 (KG)</label>
                <input 
                  type="number" 
                  value={calcData.quantity} 
                  onChange={(e) => setCalcData({...calcData, quantity: e.target.value})}
                  placeholder="ex) 19200"
                  className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {calcData.indexId && calcData.quantity && (
                  <div className="mt-3 text-[10px] font-bold text-amber-600 flex items-center gap-2 bg-amber-50 p-3 rounded-xl">
                      <Check className="w-3.5 h-3.5" />
                      <div>
                        계산식: (({coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price} + 50) * 22.046 / 1000) * {calcData.quantity}kg = 
                        <div className="text-lg font-black text-amber-800">
                          ${(((coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price + 50) * 22.046 / 1000) * parseFloat(calcData.quantity)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                  </div>
              )}

              <button 
                onClick={applyCalculation}
                disabled={!calcData.indexId || !calcData.quantity}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
              >
                금액 적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForeignSchedulePage;
