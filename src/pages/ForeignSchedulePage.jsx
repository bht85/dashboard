import React, { useState } from 'react';
import { Globe, Plus, Trash2, ArrowRightLeft, Calendar, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
}) => {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'exchange', 'coffee'
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
      date: '',
      client: '',
      amount: '',
      bank: '',
      account: '',
      desc: '',
      status: '지출결의 미확인',
      currency: 'USD',
    });
  };

  const handleAddExchange = async (e) => {
    e.preventDefault();
    if (!exchangeData.date || !exchangeData.krwAmount || !exchangeData.usdAmount) return;

    const krw = parseFloat(exchangeData.krwAmount);
    const usd = parseFloat(exchangeData.usdAmount);

    const newExchange = {
      id: Date.now(),
      date: exchangeData.date,
      krwAmount: (exchangeData.type || 'BUY').toUpperCase() === 'BUY' ? -Math.abs(krw) : Math.abs(krw),
      usdAmount: (exchangeData.type || 'BUY').toUpperCase() === 'BUY' ? Math.abs(usd) : -Math.abs(usd),
      exchangeRate: Math.abs(krw) / (Math.abs(usd) || 1),
      bank: exchangeData.bank,
      desc: exchangeData.desc,
      section: exchangeData.section,
      type: exchangeData.type,
      currency: exchangeData.currency,
    };

    await onUpdateExchangeResult(newExchange);

    setExchangeData({
      date: new Date().toLocaleDateString('en-CA'),
      krwAmount: '',
      usdAmount: '',
      bank: '',
      desc: '',
      section: '스마트팩토리',
      type: 'BUY',
      currency: 'USD',
    });
  };

  const handleStatusChange = async (id, newStatus) => {
    const item = fxSchedule.find(i => String(i.id) === String(id));
    if (item) {
      await onUpdateSchedule({ ...item, status: newStatus });
    }
  };

  const handleDateChange = async (id, newDate) => {
    const item = fxSchedule.find(i => String(i.id) === String(id));
    if (item) {
      await onUpdateSchedule({ ...item, date: newDate });
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    const krw = parseFloat(editData.krwAmount);
    const usd = parseFloat(editData.usdAmount);
    const rate = krw / usd;

    await onUpdateExchangeResult({
      ...editData,
      krwAmount: krw,
      usdAmount: usd,
      exchangeRate: rate
    });
    setEditingId(null);
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

  const filteredSchedule = fxSchedule
    .filter(s => s.date.startsWith(selectedMonth))
    .filter(s => {
      if (scheduleStatusFilter === 'ALL') return true;
      if (scheduleStatusFilter === 'COMPLETED') return s.status === '송금 완료(집행)';
      if (scheduleStatusFilter === 'PENDING') return s.status !== '송금 완료(집행)';
      return true;
    });

  const filteredExchangeResults = exchangeResults.filter(e => e.date.startsWith(selectedMonth));

  const changeMonth = (delta) => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + delta);
    setSelectedMonth(date.toISOString().substring(0, 7));
  };

  const handleAddCoffeeIndex = async (e) => {
    e.preventDefault();
    if (!coffeeData.month || !coffeeData.price) return;
    
    await onUpdateCoffeeIndex({
        id: coffeeData.isEditing ? coffeeData.id : Date.now(),
        month: `'${coffeeData.year}. ${coffeeData.monthNumber}월물`,
        price: parseFloat(coffeeData.price)
    });
    
    setCoffeeData({ year: '26', monthNumber: '04', price: '', isEditing: false, id: null });
  };

  const startEditCoffee = (item) => {
    // "'26. 04월물" -> year: "26", month: "04"
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
    
    const calculatedAmount = (selected.price * 22.046 / 1000) * parseFloat(calcData.quantity);
    
    setScheduleData({
        ...scheduleData,
        amount: calculatedAmount.toFixed(2),
        desc: `${selected.month} ${calcData.quantity}kg 산출분 (${selected.price}c/lb)`
    });
    setShowCalc(false);
    setCalcData({ indexId: '', quantity: '' });
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            외화 송금 일정
          </button>
          <button 
            onClick={() => setActiveTab('exchange')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'exchange' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            외화 환전 결과
          </button>
          <button 
            onClick={() => setActiveTab('coffee')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'coffee' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            커피 지수 관리
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
                type="button"
                onClick={() => setShowCalc(!showCalc)}
                className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                커피 지수 기반 금액 산출 {showCalc ? '닫기' : ''}
              </button>
            </h3>

            {showCalc && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700 uppercase mb-1">적용 월물 선택</label>
                    <select 
                        value={calcData.indexId} 
                        onChange={(e) => setCalcData({...calcData, indexId: e.target.value})}
                        className="w-full text-xs font-black bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        <option value="">월물 선택...</option>
                        {coffeeIndices.map(c => (
                            <option key={c.id} value={c.id}>{c.month} ({c.price} c/lb)</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700 uppercase mb-1">물량 (kg)</label>
                    <input 
                        type="number" 
                        value={calcData.quantity} 
                        onChange={(e) => setCalcData({...calcData, quantity: e.target.value})}
                        placeholder="ex) 19200" 
                        className="w-full text-xs font-black bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" 
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                        type="button"
                        onClick={applyCalculation}
                        className="w-full bg-amber-500 text-white font-black py-2 rounded-lg hover:bg-amber-600 transition shadow-sm flex items-center justify-center gap-2"
                    >
                        산출 금액 적용
                    </button>
                  </div>
                </div>
                {calcData.indexId && calcData.quantity && (
                    <div className="mt-3 text-[10px] font-bold text-amber-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" />
                        계산식: ({coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price} * 22.046 / 1000) * {calcData.quantity}kg = 
                        <span className="text-sm font-black text-amber-800 ml-1">
                          ${((coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price * 22.046 / 1000) * parseFloat(calcData.quantity)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                    </div>
                )}
              </div>
            )}
            <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지급예정일</label>
                <input type="date" name="date" value={scheduleData.date} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래처</label>
                <input type="text" name="client" value={scheduleData.client} onChange={handleScheduleChange} placeholder="ex) 블레스빈" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="relative group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">금액 (USD)</label>
                <input type="number" step="0.01" name="amount" value={scheduleData.amount} onChange={handleScheduleChange} placeholder="ex) 5000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
                {scheduleData.amount && (
                  <div className="absolute -bottom-5 right-0 text-[9px] font-bold text-indigo-500 animate-in fade-in slide-in-from-top-1">
                    ≈ {formatKRW(parseFloat(scheduleData.amount) * (scheduleData.currency === 'EUR' ? exchangeRateEUR : scheduleData.currency === 'JPY' ? exchangeRateJPY : exchangeRate))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">상태</label>
                <select name="status" value={scheduleData.status} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="지출결의 확인">지출결의 확인</option>
                  <option value="지출결의 미확인">지출결의 미확인</option>
                  <option value="송금 완료(집행)">송금 완료(집행)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">통화</label>
                <select name="currency" value={scheduleData.currency} onChange={handleScheduleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">은행명</label>
                <input type="text" name="bank" value={scheduleData.bank} onChange={handleScheduleChange} placeholder="ex) 기업" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">내용</label>
                <input type="text" name="desc" value={scheduleData.desc} onChange={handleScheduleChange} placeholder="ex) 티오피아 대금지급..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">참고 환율 (실시간)</label>
                <div className="text-xs font-bold text-slate-400 h-9 flex items-center bg-slate-50/50 rounded-lg px-3 border border-slate-100">1$ = {exchangeRate?.toFixed(2)}원</div>
              </div>
              <div className="md:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 focus:scale-[0.98]">
                  <Plus className="w-4 h-4"/> 등록하기
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-blue-500" />
                  송금 일정 리스트
                </h3>
                <div className="h-4 w-[1px] bg-slate-200"></div>
                <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
                  <button 
                    onClick={() => setScheduleStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${scheduleStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    전체 ({fxSchedule.filter(s => s.date.startsWith(selectedMonth)).length})
                  </button>
                  <button 
                    onClick={() => setScheduleStatusFilter('PENDING')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${scheduleStatusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    송금 대기 ({fxSchedule.filter(s => s.date.startsWith(selectedMonth) && s.status !== '송금 완료(집행)').length})
                  </button>
                  <button 
                    onClick={() => setScheduleStatusFilter('COMPLETED')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${scheduleStatusFilter === 'COMPLETED' ? 'bg-emerald-50 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    송금 완료 ({fxSchedule.filter(s => s.date.startsWith(selectedMonth) && s.status === '송금 완료(집행)').length})
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-bold bg-slate-900 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider">
                Market Rate: {formatKRW(exchangeRate)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3 border-r">지급예정일</th>
                    <th className="px-4 py-3 border-r">거래처</th>
                    <th className="px-4 py-3 border-r text-right">금액 (외화)</th>
                    <th className="px-6 py-3 border-r text-right bg-indigo-50/30 text-indigo-600">환산 금액 (KRW)</th>
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
                              <input type="date" name="date" value={editScheduleData.date} onChange={handleEditScheduleChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none ring-2 ring-indigo-100" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <input type="text" name="client" value={editScheduleData.client} onChange={handleEditScheduleChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none ring-2 ring-indigo-100" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <div className="flex gap-1">
                                <select name="currency" value={editScheduleData.currency} onChange={handleEditScheduleChange} className="text-[10px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none w-16">
                                  <option value="USD">USD</option>
                                  <option value="EUR">EUR</option>
                                  <option value="JPY">JPY</option>
                                </select>
                                <input type="number" step="0.01" name="amount" value={editScheduleData.amount} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none text-right ring-2 ring-indigo-100" />
                              </div>
                            </td>
                            <td className="px-6 py-2 border-r text-right font-mono font-black text-slate-400 bg-indigo-50/10">
                              -
                            </td>
                            <td className="px-4 py-2 border-r text-center">
                              <input type="text" name="bank" value={editScheduleData.bank} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <input type="text" name="desc" value={editScheduleData.desc} onChange={handleEditScheduleChange} className="w-full text-[10px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <select name="status" value={editScheduleData.status} onChange={handleEditScheduleChange} className="text-[9px] font-black w-full border border-indigo-200 rounded px-1 py-1 outline-none">
                                <option value="지출결의 확인">지출결의 확인</option>
                                <option value="지출결의 미확인">지출결의 미확인</option>
                                <option value="송금 완료(집행)">송금 완료(집행)</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={saveEditSchedule} className="p-1 px-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm transition-all active:scale-95 text-[9px] font-bold">저장</button>
                                <button onClick={cancelEditSchedule} className="p-1 px-1.5 bg-white text-slate-400 border border-slate-200 rounded hover:text-red-500 transition-all text-[9px]">취소</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 border-r">
                              <input type="date" value={s.date} onChange={(e) => handleDateChange(s.id, e.target.value)} className="text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 py-0.5 outline-none transition-colors cursor-pointer block w-full" />
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
                                <button onClick={() => startEditSchedule(s)} className="text-slate-300 hover:text-indigo-500 transition-colors p-1">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onDeleteSchedule(s.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {filteredSchedule.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                           <Calendar className="w-8 h-8 opacity-20" />
                           <p className="text-[11px] font-bold">{selectedMonth.split('-')[1]}월에 해당하는 일정이 없습니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
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
                <input type="date" name="date" value={exchangeData.date} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래 통화</label>
                <select name="currency" value={exchangeData.currency} onChange={handleExchangeChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래 유형</label>
                <select name="type" value={exchangeData.type} onChange={handleExchangeChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="BUY">KRW → 외화 (매입)</option>
                  <option value="SELL">외화 → KRW (매각)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{exchangeData.type === 'BUY' ? '지출금액 (KRW)' : '입금금액 (KRW)'}</label>
                <input type="number" name="krwAmount" value={exchangeData.krwAmount} onChange={handleExchangeChange} placeholder="ex) 1500000" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="flex items-center justify-center pt-5">
                {exchangeData.type === 'BUY' ? <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> : <ArrowRightLeft className="w-4 h-4 text-rose-500 rotate-180" />}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{exchangeData.type === 'BUY' ? '입금금액 (외화)' : '지출금액 (외화)'}</label>
                <input type="number" step="0.01" name="usdAmount" value={exchangeData.usdAmount} onChange={handleExchangeChange} placeholder="ex) 1000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">적용 환율</label>
                <div className="w-full text-sm font-black text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2">
                  {exchangeData.krwAmount && exchangeData.usdAmount ? (parseFloat(exchangeData.krwAmount) / parseFloat(exchangeData.usdAmount)).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">매입 법인</label>
                <select name="section" value={exchangeData.section} onChange={handleExchangeChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="컴포즈커피">컴포즈커피</option>
                  <option value="스마트팩토리">스마트팩토리</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">내용 / 비고</label>
                <input type="text" name="desc" value={exchangeData.desc} onChange={handleExchangeChange} placeholder="3월분 생두 매입 대금 환전..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 focus:scale-[0.98]">
                  <Plus className="w-4 h-4"/> 결과 저장
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> 환전 집계 리스트
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse table-fixed">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b sticky top-0 z-10">
                  <tr>
                    <th className="w-[10%] px-4 py-3 border-r">환전 일자</th>
                    <th className="w-[8%] px-4 py-3 border-r text-center">유형</th>
                    <th className="w-[8%] px-4 py-3 border-r text-center">통화</th>
                    <th className="w-[17%] px-4 py-3 border-r text-right">매입 금액 (KRW)</th>
                    <th className="w-[17%] px-4 py-3 border-r text-right">환전 금액 (외화)</th>
                    <th className="w-[10%] px-6 py-3 border-r text-center bg-emerald-50/30 text-emerald-600">적용 환율</th>
                    <th className="w-[10%] px-4 py-3 border-r text-center">법인</th>
                    <th className="px-4 py-3">내용 / 비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredExchangeResults.map((e) => {
                    const isBuy = (e.type || 'BUY').toUpperCase() === 'BUY';
                    const krw = Number(e.krwAmount || 0);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="px-4 py-3 border-r font-bold">{e.date}</td>
                        <td className="px-4 py-3 border-r text-center">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black ${isBuy ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{isBuy ? '매입' : '매각'}</span>
                        </td>
                        <td className="px-4 py-3 border-r text-center font-black text-indigo-500">{e.currency || 'USD'}</td>
                        <td className="px-4 py-3 border-r text-right font-mono font-bold">{formatKRW(Math.abs(krw))}</td>
                        <td className="px-4 py-3 border-r text-right font-mono font-bold">{(e.currency || 'USD') === 'USD' ? formatUSD(Math.abs(e.usdAmount || 0)) : `${Math.abs(e.usdAmount || 0).toLocaleString()} ${e.currency}`}</td>
                        <td className="px-6 py-3 border-r text-center font-mono font-black">{e.exchangeRate?.toFixed(2)}</td>
                        <td className="px-4 py-3 border-r text-center">{e.section || '스마트'}</td>
                        <td className="px-4 py-3 text-[10px] text-slate-400">{e.desc}</td>
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
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-amber-500" /> 커피 지수(월물) 데이터 관리
            </h3>
            <form onSubmit={handleAddCoffeeIndex} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">연도 선택</label>
                <select 
                    value={coffeeData.year} 
                    onChange={(e) => setCoffeeData({...coffeeData, year: e.target.value})}
                    className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" 
                    required 
                >
                  {Array.from({ length: 7 }).map((_, i) => {
                    const year = 24 + i;
                    return (
                      <option key={year} value={String(year)}>{2000 + year}년</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">월물 선택</label>
                <select 
                    value={coffeeData.monthNumber} 
                    onChange={(e) => setCoffeeData({...coffeeData, monthNumber: e.target.value})}
                    className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" 
                    required 
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    return (
                      <option key={m} value={m}>{m}월물</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">커피 지수 (c/lb)</label>
                <input 
                    type="number" 
                    step="0.01"
                    value={coffeeData.price} 
                    onChange={(e) => setCoffeeData({...coffeeData, price: e.target.value})}
                    placeholder="ex) 294.05" 
                    className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500" 
                    required 
                />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="flex-1 bg-amber-500 text-white font-black py-2 rounded-lg hover:bg-amber-600 transition shadow-sm focus:scale-[0.98]">
                  {coffeeData.isEditing ? '수정 완료' : '데이터 저장'}
                </button>
                {coffeeData.isEditing && (
                    <button type="button" onClick={() => setCoffeeData({year: '26', monthNumber: '04', price: '', isEditing: false, id: null})} className="px-4 py-2 border border-slate-200 rounded-lg text-xs">취소</button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-amber-500" /> 저장된 지수 리스트
                </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px]">
                  <tr>
                    <th className="px-6 py-3 border-r">월물</th>
                    <th className="px-6 py-3 border-r text-right">커피 지수 (c/lb)</th>
                    <th className="px-6 py-3 border-r text-right text-indigo-500">KG당 단가 (USD)</th>
                    <th className="px-6 py-3 border-r text-center">기록 일자</th>
                    <th className="px-6 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {coffeeIndices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 border-r font-black text-slate-800">{item.month}</td>
                      <td className="px-6 py-4 border-r text-right font-mono font-black text-amber-600">{item.price?.toFixed(2)}</td>
                      <td className="px-6 py-4 border-r text-right font-mono font-bold text-indigo-500">
                        ${(item.price * 22.046 / 1000).toLocaleString(undefined, {minimumFractionDigits: 4})}
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
      )}
    </div>
  );
};

export default ForeignSchedulePage;
