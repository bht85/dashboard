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
}) => {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'exchange'
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // Schedule Form State
  const [scheduleData, setScheduleData] = useState({
    date: '',
    client: '',
    amount: '',
    bank: '',
    account: '',
    desc: '',
    status: '지출결의 미확인',
    currency: 'USD', // Added currency field
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
    currency: 'USD', // Added currency field
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
      currency: scheduleData.currency, // Save currency
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
    const rate = krw / usd;

    const newExchange = {
      id: Date.now(),
      date: exchangeData.date,
      krwAmount: krw,
      usdAmount: usd,
      exchangeRate: rate,
      bank: exchangeData.bank,
      desc: exchangeData.desc,
      section: exchangeData.section,
      type: exchangeData.type,
      currency: exchangeData.currency, // Save currency
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

  // Edit logic
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

  const filteredExchangeResults = exchangeResults.filter(e => e.date.startsWith(selectedMonth));

  const changeMonth = (delta) => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + delta);
    setSelectedMonth(date.toISOString().substring(0, 7));
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">외화 관리 센터</h2>
          <p className="text-sm text-slate-500 mt-1">외화 송금 예약 일정과 실제 환전 결과를 통합하여 관리합니다.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'schedule' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            외화 송금 일정
          </button>
          <button 
            onClick={() => setActiveTab('exchange')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'exchange' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            외화 환전 결과
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-indigo-500" /> 신규 송금 일정 기입
            </h3>
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
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-blue-500" />
                등록된 송금 일정
              </h3>
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
                    <th className="px-4 py-3 border-r text-right">금액 (USD)</th>
                    <th className="px-6 py-3 border-r text-right bg-indigo-50/30 text-indigo-600">환산 금액 (KRW)</th>
                    <th className="px-4 py-3 border-r text-center">은행명</th>
                    <th className="px-4 py-3 border-r">내용</th>
                    <th className="px-4 py-3 border-r">비고</th>
                    <th className="px-4 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {fxSchedule.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 border-r">
                        <input 
                          type="date" 
                          value={s.date} 
                          onChange={(e) => handleDateChange(s.id, e.target.value)}
                          className="text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 py-0.5 outline-none transition-colors cursor-pointer block w-full"
                        />
                      </td>
                      <td className="px-4 py-3 border-r font-bold text-slate-800">{s.client}</td>
                      <td className="px-4 py-3 border-r text-right font-mono font-bold text-blue-600">{formatUSD(s.amount)}</td>
                      <td className="px-6 py-3 border-r text-right font-mono font-black text-slate-900 bg-indigo-50/10">
                        {formatKRW(s.amount * exchangeRate)}
                      </td>
                      <td className="px-4 py-3 border-r text-center">{s.bank}</td>
                      <td className="px-4 py-3 border-r text-[10px] text-slate-400">{s.desc}</td>
                      <td className="px-4 py-3 border-r">
                        <select 
                          value={s.status} 
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className={`text-[9px] font-black px-2 py-1 rounded-lg border-0 outline-none cursor-pointer transition-colors ${
                            s.status === '송금 완료(집행)' 
                            ? 'bg-emerald-50 text-emerald-600 font-black ring-1 ring-emerald-200' 
                            : s.status === '지출결의 확인'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <option value="지출결의 확인">지출결의 확인</option>
                          <option value="지출결의 미확인">지출결의 미확인</option>
                          <option value="송금 완료(집행)">송금 완료(집행)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => onDeleteSchedule(s.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {fxSchedule.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-[11px] border-b">등록된 외화 송금 일정이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
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
                  <option value="BUY">KRW → {exchangeData.currency} (매입)</option>
                  <option value="SELL">{exchangeData.currency} → KRW (매각)</option>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{exchangeData.type === 'BUY' ? `입금금액 (${exchangeData.currency})` : `지출금액 (${exchangeData.currency})`}</label>
                <input type="number" step="0.01" name="usdAmount" value={exchangeData.usdAmount} onChange={handleExchangeChange} placeholder="ex) 1000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">적용 환율</label>
                <div className="w-full text-sm font-black text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2">
                  {exchangeData.krwAmount && exchangeData.usdAmount 
                    ? (parseFloat(exchangeData.krwAmount) / parseFloat(exchangeData.usdAmount)).toFixed(2)
                    : '0.00'}
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
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                환전 집계 리스트
              </h3>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                  <button onClick={() => changeMonth(-1)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-700 px-2 min-w-[80px] text-center">
                    {selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월
                  </span>
                  <button onClick={() => changeMonth(1)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                <div className="text-[10px] font-bold text-slate-400 flex gap-2">
                  <span>전체: {exchangeResults.length}건</span>
                  <span className="text-indigo-400">당월: {filteredExchangeResults.length}건</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse table-fixed">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b sticky top-0 z-10">
                  <tr>
                    <th className="w-[12%] px-4 py-3 border-r">환전 일자</th>
                    <th className="w-[15%] px-4 py-3 border-r text-center">통화</th>
                    <th className="w-[20%] px-4 py-3 border-r text-right">매입 금액 (KRW)</th>
                    <th className="w-[18%] px-4 py-3 border-r text-right">환전 금액 (외화)</th>
                    <th className="w-[12%] px-6 py-3 border-r text-center bg-emerald-50/30 text-emerald-600">적용 환율</th>
                    <th className="w-[12%] px-4 py-3 border-r text-center">법인</th>
                    <th className="px-4 py-3">내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredExchangeResults.map((e) => (
                    <tr key={e.id} className={`hover:bg-slate-50 group transition-colors ${editingId === e.id ? 'bg-indigo-50/20' : ''}`}>
                      {editingId === e.id ? (
                        <>
                          <td className="px-4 py-2 border-r">
                            <input type="date" name="date" value={editData.date} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1.5 py-1 outline-none ring-2 ring-indigo-100" />
                          </td>
                          <td className="px-4 py-2 border-r">
                            <select name="currency" value={editData.currency} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1.5 py-1 outline-none ring-2 ring-indigo-100">
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="JPY">JPY</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 border-r text-right">
                            <input type="number" name="krwAmount" value={editData.krwAmount} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1.5 py-1 outline-none text-right ring-2 ring-indigo-100" />
                          </td>
                          <td className="px-4 py-2 border-r text-right">
                            <input type="number" step="0.01" name="usdAmount" value={editData.usdAmount} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1.5 py-1 outline-none text-right ring-2 ring-indigo-100" />
                          </td>
                          <td className="px-6 py-2 border-r text-center font-black text-emerald-600">
                            {(parseFloat(editData.krwAmount) / parseFloat(editData.usdAmount)).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 border-r">
                            <input type="text" name="desc" value={editData.desc} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1.5 py-1 outline-none ring-2 ring-indigo-100" />
                          </td>
                          <td className="px-4 py-2 flex items-center justify-center gap-1.5">
                            <button onClick={saveEdit} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-red-500 hover:border-red-100 transition-all active:scale-95">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 border-r font-bold">{e.date}</td>
                          <td className="px-4 py-3 border-r text-center font-black text-indigo-500">{e.currency || 'USD'}</td>
                          <td className="px-4 py-3 border-r text-right font-mono font-bold">
                            <span className={(e.type || '').toUpperCase() === 'SELL' ? 'text-emerald-600' : 'text-slate-700'}>
                              {(e.type || '').toUpperCase() === 'SELL' ? '+' : '-'} {formatKRW(Math.abs(e.krwAmount || 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r text-right font-mono font-bold">
                            <span className={(e.type || '').toUpperCase() === 'BUY' ? 'text-blue-600' : 'text-rose-500'}>
                              {(e.type || '').toUpperCase() === 'BUY' ? '+' : '-'} {(e.currency || 'USD') === 'USD' ? formatUSD(Math.abs(e.usdAmount || 0)) : `${Math.abs(e.usdAmount || 0).toLocaleString()} ${e.currency || 'USD'}`}
                            </span>
                          </td>
                          <td className="px-6 py-3 border-r text-center font-mono font-black text-slate-900 bg-emerald-50/10">
                            {e.exchangeRate?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 border-r text-center">
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black ${e.section === '스마트팩토리' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {e.section || '스마트'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-400 truncate hover:text-slate-600 cursor-default" title={e.desc}>{e.desc}</td>
                          <td className="px-4 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onDeleteExchangeResult(e.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredExchangeResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-300">
                        <div className="flex flex-col items-center gap-2">
                          <ArrowRightLeft className="w-8 h-8 opacity-20" />
                          <p className="text-[11px] font-bold">{selectedMonth.split('-')[1]}월에 등록된 환전 결과가 없습니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredExchangeResults.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-12 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">당월 매입 총액 (KRW)</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">
                    {formatKRW(filteredExchangeResults.reduce((sum, e) => sum + Math.abs(e.krwAmount || 0), 0))}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">당월 환전 총액 (USD 외)</span>
                  <span className="text-lg font-black text-blue-600 tabular-nums">
                    {filteredExchangeResults.reduce((sum, e) => sum + Math.abs(e.usdAmount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter mb-1">당월 평균 환율 (KRW/Unit)</span>
                  <span className="text-lg font-black text-emerald-600 tabular-nums">
                    {(filteredExchangeResults.reduce((sum, e) => sum + Math.abs(e.krwAmount || 0), 0) / (filteredExchangeResults.reduce((sum, e) => sum + Math.abs(e.usdAmount || 0), 0) || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ForeignSchedulePage;
