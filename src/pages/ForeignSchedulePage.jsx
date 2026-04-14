import React, { useState } from 'react';
import { Globe, Plus, Trash2, ArrowRightLeft, Calendar, Edit2, Check, X, ChevronLeft, ChevronRight, Package, List, AlertCircle, Search, DollarSign } from 'lucide-react';
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
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }); // YYYY-MM
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
    paymentStatus: 'X', paymentYear: String(new Date().getFullYear()), paymentMonth: '01', 
    contractMonth: '', differential: '', index: '', 
    weight: '', planExchangeRate: String(exchangeRate),
    isEditing: false, id: null
  });

  // 모달 상태
  const [showCalc, setShowCalc] = useState(false);
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [calcData, setCalcData] = useState({ indexId: '', quantity: '' });

  // 보조 상태: 산지/공급업체 직접 입력 모드
  const [isNewOrigin, setIsNewOrigin] = useState(false);
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  // Coffee Index Form State
  const [coffeeData, setCoffeeData] = useState({
    year: '26', monthNumber: '04', price: '', isEditing: false, id: null
  });

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
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextYear}-${nextMonth}`);
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
        paymentStatus: 'X', paymentYear: String(new Date().getFullYear()), paymentMonth: '01', 
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

  const loadContractToSchedule = (contract) => {
    const unitPrice = (parseFloat(contract.index || 0) + parseFloat(contract.differential || 0)) * 22.046 / 1000;
    const amountUSD = unitPrice * parseFloat(contract.weight || 0);
    setScheduleData({
        ...scheduleData,
        client: contract.supplier,
        amount: amountUSD.toFixed(2),
        currency: 'USD',
        desc: `계약[${contract.contractNo || 'No'}] ${contract.origin} ${contract.installment}차분`
    });
    setShowContractPicker(false);
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
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
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

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shadow-inner">
          <button onClick={() => changeMonth(-1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-black text-slate-700 px-3 min-w-[100px] text-center">{selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden p-8">
            <h3 className="font-black text-slate-800 mb-6 flex items-center justify-between text-base">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-indigo-600" /></div>
                신규 송금 일정 계획
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowContractPicker(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"><Search className="w-3.5 h-3.5" /> 생두 계약 불러오기</button>
                <button onClick={() => setShowCalc(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-100"><ArrowRightLeft className="w-3.5 h-3.5" /> 산출기</button>
              </div>
            </h3>
            <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">지급예정일</label><input type="date" name="date" value={scheduleData.date} onChange={handleScheduleChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" required /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">거래처</label><input type="text" name="client" value={scheduleData.client} onChange={handleScheduleChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" required /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">송금액 (USD)</label><input type="number" step="0.01" name="amount" value={scheduleData.amount} onChange={handleScheduleChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" required /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">상태</label><select name="status" value={scheduleData.status} onChange={handleScheduleChange} className="w-full text-sm font-black bg-white border-2 border-slate-100 rounded-xl px-4 py-3"><option value="지출결의 미확인">지출결의 미확인</option><option value="지출결의 확인">지출결의 확인</option><option value="송금 완료(집행)">송금 완료(집행)</option></select></div>
              <div className="md:col-span-3"><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">송금 내용 / 적요</label><input type="text" name="desc" value={scheduleData.desc} onChange={handleScheduleChange} placeholder="ex) 생두 대금 지급..." className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" /></div>
              <div className="flex items-end h-[50px] self-end"><button type="submit" className="w-full h-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"><Check className="w-5 h-5" /> 등록하기</button></div>
            </form>
          </div>
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 text-slate-400 font-black border-b">
                  <tr><th className="px-8 py-4 border-r uppercase tracking-wider">지급예정일</th><th className="px-8 py-4 border-r uppercase tracking-wider">거래처</th><th className="px-8 py-4 border-r text-right uppercase tracking-wider">금액 (외화)</th><th className="px-8 py-4 border-r text-right text-indigo-600 uppercase tracking-wider">환산 금액 (KRW)</th><th className="px-8 py-4 border-r uppercase tracking-wider">상태</th><th className="px-8 py-4 text-center uppercase tracking-wider">작업</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredSchedule.map(s => <tr key={s.id} className="hover:bg-slate-50 transition-all font-black text-slate-900"><td className="px-8 py-4 border-r">{s.date}</td><td className="px-8 py-4 border-r">{s.client}</td><td className="px-8 py-4 border-r text-right text-blue-600">{formatUSD(s.amount)}</td><td className="px-8 py-4 border-r text-right text-indigo-900 bg-indigo-50/10">{formatKRW(s.amount * exchangeRate)}</td><td className="px-8 py-4 border-r"><span className={`px-2 py-0.5 rounded-full text-[9px] ${s.status === '송금 완료(집행)' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{s.status}</span></td><td className="px-8 py-4 text-center"><button onClick={() => onDeleteSchedule(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'exchange' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-8">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-base"><Plus className="w-5 h-5 text-emerald-500" /> 환전 결과 기록</h3>
            <form onSubmit={handleAddExchange} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">환전일자</label><input type="date" name="date" value={exchangeData.date} onChange={handleExchangeChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3" required /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">KRW 금액</label><input type="number" name="krwAmount" value={exchangeData.krwAmount} onChange={handleExchangeChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3" required /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">USD 금액</label><input type="number" step="0.01" name="usdAmount" value={exchangeData.usdAmount} onChange={handleExchangeChange} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3" required /></div>
              <div className="flex items-end"><button type="submit" className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl hover:bg-emerald-700 transition">저장하기</button></div>
            </form>
          </div>
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b text-slate-400 font-black"><tr><th className="px-8 py-4 border-r">일자</th><th className="px-8 py-4 border-r text-right">KRW 금액</th><th className="px-8 py-4 border-r text-right">USD 금액</th><th className="px-8 py-4 text-center">작업</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredExchangeResults.map(e => <tr key={e.id} className="hover:bg-slate-50"><td className="px-8 py-4 border-r font-black">{e.date}</td><td className="px-8 py-4 border-r text-right font-mono font-bold">{formatKRW(e.krwAmount)}</td><td className="px-8 py-4 border-r text-right font-mono font-bold text-blue-600">{formatUSD(e.usdAmount)}</td><td className="px-8 py-4 text-center"><button onClick={() => onDeleteExchangeResult(e.id)} className="text-slate-300 hover:text-red-500 font-black"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'coffee' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-8">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-base">
                <Globe className="w-5 h-5 text-amber-500" /> 
                {coffeeData.isEditing ? '커피 지수 정보 수정' : '커피 지수 데이터 관리'}
            </h3>
            <form onSubmit={handleAddCoffeeIndex} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">연도</label>
                <select value={coffeeData.year} onChange={e => setCoffeeData({...coffeeData, year: e.target.value})} className="w-full text-sm font-black border-2 border-slate-100 rounded-xl px-4 py-3">
                    {['24','25','26','27','28','29','30'].map(y => <option key={y} value={y}>{2000+parseInt(y)}년</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">월물</label>
                <select value={coffeeData.monthNumber} onChange={e => setCoffeeData({...coffeeData, monthNumber: e.target.value})} className="w-full text-sm font-black border-2 border-slate-100 rounded-xl px-4 py-3">
                    {Array.from({length:12}).map((_,i) => {const m = String(i+1).padStart(2,'0'); return <option key={m} value={m}>{m}월물</option>})}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">지수 (c/lb)</label>
                <input type="number" step="0.01" value={coffeeData.price} onChange={e => setCoffeeData({...coffeeData, price: e.target.value})} className="w-full text-sm font-black border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-amber-500" required />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className={`flex-1 ${coffeeData.isEditing ? 'bg-indigo-600' : 'bg-amber-500'} text-white font-black py-3 rounded-xl hover:opacity-90 transition shadow-lg`}>
                    {coffeeData.isEditing ? '수정 완료' : '지수 정보 저장'}
                </button>
                {coffeeData.isEditing && (
                    <button type="button" onClick={() => setCoffeeData({year: '26', monthNumber: '04', price: '', isEditing: false, id: null})} className="px-4 py-3 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50">취소</button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-xl text-[11px]">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-black text-slate-800 text-sm">저장된 월물 지수 리스트</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b text-slate-400 font-black"><tr><th className="px-8 py-4 border-r uppercase tracking-widest">월물 (Futures)</th><th className="px-8 py-4 border-r text-right uppercase">지수 (Price)</th><th className="px-8 py-4 border-r text-right uppercase text-amber-600 bg-amber-50/10">예상 지수 (+50)</th><th className="px-8 py-4 text-center">작업</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {coffeeIndices.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 font-black group transition-colors">
                    <td className="px-8 py-4 border-r text-slate-800">{item.month}</td>
                    <td className="px-8 py-4 border-r text-right text-slate-400 font-mono">{item.price?.toFixed(2)}</td>
                    <td className="px-8 py-4 border-r text-right text-amber-600 font-mono bg-amber-50/5">{(item.price + 50).toFixed(2)}</td>
                    <td className="px-8 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEditCoffee(item)} className="text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteCoffeeIndex(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl p-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-0"></div>
            <h3 className="font-black text-slate-800 mb-10 flex items-center gap-4 text-lg border-b pb-6 relative z-10">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                 <div>생두 구매 계약 관리 및 등록</div>
                 <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">RAW BEAN PROCUREMENT CONTRACTS</div>
              </div>
              {contractData.isEditing && <span className="text-[11px] bg-indigo-50 text-indigo-600 font-black px-3 py-1 rounded-full border border-indigo-100">편집 중</span>}
            </h3>
            
            <form onSubmit={handleAddContract} className="grid grid-cols-1 md:grid-cols-12 gap-y-10 gap-x-8 relative z-10">
              {/* Row 1: 산지 / 업체 / 계약번호 / 차수 */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3 px-1">{isNewOrigin ? '산지 직접입력' : '산지 선택'}</label>
                <div className="flex gap-2">
                  {isNewOrigin ? (
                    <input type="text" placeholder="산지명 입력" value={contractData.origin} onChange={e => setContractData({...contractData, origin: e.target.value})} className="flex-1 text-sm font-black bg-white border-2 border-indigo-200 rounded-2xl px-4 py-3.5 shadow-inner" required />
                  ) : (
                    <select value={contractData.origin} onChange={e => setContractData({...contractData, origin: e.target.value})} className="flex-1 text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 appearance-none cursor-pointer" required>
                      <option value="">산지 선택</option>
                      {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setIsNewOrigin(!isNewOrigin)} className={`p-3.5 rounded-2xl border-2 transition-all ${isNewOrigin ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-400'}`}>
                    {isNewOrigin ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3 px-1">{isNewSupplier ? '공급업체 직접' : '공급업체 선택'}</label>
                <div className="flex gap-2">
                  {isNewSupplier ? (
                    <input type="text" placeholder="업체명 입력" value={contractData.supplier} onChange={e => setContractData({...contractData, supplier: e.target.value})} className="flex-1 text-sm font-black bg-white border-2 border-indigo-200 rounded-2xl px-4 py-3.5 shadow-inner" required />
                  ) : (
                    <select value={contractData.supplier} onChange={e => setContractData({...contractData, supplier: e.target.value})} className="flex-1 text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 appearance-none cursor-pointer" required>
                      <option value="">업체 선택</option>
                      {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setIsNewSupplier(!isNewSupplier)} className={`p-3.5 rounded-2xl border-2 transition-all ${isNewSupplier ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-400'}`}>
                    {isNewSupplier ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3 px-1">계약 번호</label>
                <input type="text" placeholder="CONT-2024-XXXX" value={contractData.contractNo} onChange={e => setContractData({...contractData, contractNo: e.target.value})} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3 px-1">지급 차수 (BATCH)</label>
                <input type="text" placeholder="ex) 11차" value={contractData.installment} onChange={e => setContractData({...contractData, installment: e.target.value})} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5" />
              </div>

              {/* Row 2: 디퍼런셜(크게) / 월물 / 수량 / 환율 / 지급시기 */}
              <div className="md:col-span-4 bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-indigo-100">
                <label className="block text-xs font-black text-indigo-700 uppercase mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> 디퍼런셜 (DIFFERENTIAL / 필수)
                </label>
                <div className="relative">
                  <input type="number" step="0.01" value={contractData.differential} onChange={e => setContractData({...contractData, differential: e.target.value})} className="w-full text-4xl font-black bg-transparent border-b-4 border-indigo-300 outline-none pb-2 text-indigo-800 placeholder:text-indigo-200" placeholder="-6.00" required />
                  <span className="absolute right-0 bottom-4 text-sm font-black text-indigo-300 uppercase">cents / lb</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">월물 지수 (SELECT)</label>
                <select value={contractData.contractMonth} onChange={e => {
                  const m = e.target.value;
                  const p = coffeeIndices.find(ci => ci.month === m)?.price || '';
                  setContractData({...contractData, contractMonth: m, index: p});
                }} className="w-full text-xs font-black bg-white border-2 border-slate-100 rounded-2xl px-3 py-4 mb-2">
                   <option value="">월물 선택</option>
                   {coffeeIndices.map(ci => <option key={ci.id} value={ci.month}>{ci.month}</option>)}
                </select>
                <div className="relative">
                   <input type="number" step="0.01" value={contractData.index} onChange={e => setContractData({...contractData, index: e.target.value})} className="w-full text-sm font-black bg-slate-100 border-2 border-slate-100 rounded-xl px-4 py-2" placeholder="INDEX" />
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase">c/lb</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">구매 중량 (TOTAL KG)</label>
                <div className="relative mb-3">
                  <input type="number" value={contractData.weight} onChange={e => setContractData({...contractData, weight: e.target.value})} className="w-full text-base font-black bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-400" placeholder="ex) 19200" required />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">KG</span>
                </div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">기안 환율</label>
                <input type="number" value={contractData.planExchangeRate} onChange={e => setContractData({...contractData, planExchangeRate: e.target.value})} className="w-full text-sm font-black bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-indigo-700" required />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">대금 지급 시기 (PERIOD)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                     <span className="block text-[9px] font-black text-slate-300 mb-1 ml-1">YEAR</span>
                     <input type="text" value={contractData.paymentYear} onChange={e => setContractData({...contractData, paymentYear: e.target.value})} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3" />
                  </div>
                  <div className="w-20">
                     <span className="block text-[9px] font-black text-slate-300 mb-1 ml-1">MONTH</span>
                     <input type="text" value={contractData.paymentMonth} onChange={e => setContractData({...contractData, paymentMonth: e.target.value})} className="w-full text-sm font-black bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-center" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col justify-end">
                <button type="submit" className="w-full h-[110px] bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center gap-3 active:scale-95 group">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {contractData.isEditing ? <Check className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                  </div>
                  <span className="text-sm tracking-tight">{contractData.isEditing ? '변경 계약 저장' : '신규 계약 등록'}</span>
                </button>
                {contractData.isEditing && <button type="button" onClick={resetContractForm} className="mt-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors">편집 취소</button>}
              </div>

              {/* Row 3: 산출 대시보드 */}
              <div className="md:col-span-12 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-16 flex-1">
                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-indigo-400">
                             <DollarSign className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Unit Price / KG</span>
                         </div>
                         <div className="text-4xl font-black tracking-tighter">
                            ${((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000).toFixed(4)}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-indigo-400">
                             <Package className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total USD Volume</span>
                         </div>
                         <div className="text-4xl font-black tracking-tighter">
                            ${(((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000) * parseFloat(contractData.weight || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                         </div>
                      </div>
                      <div className="space-y-2 col-span-2 md:col-span-1 border-l border-white/10 pl-12">
                         <div className="flex items-center gap-2 text-amber-500">
                             <Calendar className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Estimated KRW Cost</span>
                         </div>
                         <div className="text-4xl font-black tracking-tighter text-amber-500">
                            {Math.round(((parseFloat(contractData.index || 0) + parseFloat(contractData.differential || 0)) * 22.046 / 1000) * parseFloat(contractData.weight || 0) * (parseFloat(contractData.planExchangeRate) || exchangeRate)).toLocaleString()}원
                         </div>
                      </div>
                   </div>
                   <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col items-end gap-1">
                      <div className="text-[9px] font-black text-indigo-300 uppercase letter-spacing-2 tracking-widest">Base Calculation Formula</div>
                      <div className="text-xs font-bold text-white/50">(Index + Diff) × 0.022046</div>
                   </div>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col mt-4 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-sm">
                    <List className="w-5 h-5 text-indigo-600" /> 등록된 생두 계약 히스토리
                </h3>
                <span className="text-[10px] font-black text-slate-300">Total {rawBeanContracts.length} Transactions</span>
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap min-w-[1700px]">
                <thead className="bg-slate-50 text-slate-400 font-black border-b uppercase">
                  <tr>
                    <th className="px-8 py-5 border-r bg-white sticky left-0 z-20">Origin</th>
                    <th className="px-8 py-5 border-r bg-white sticky left-[140px] z-20">Supplier</th>
                    <th className="px-8 py-5 border-r">Contract No.</th>
                    <th className="px-6 py-5 border-r text-center">Batch</th>
                    <th className="px-6 py-5 border-r text-center">Payment</th>
                    <th className="px-8 py-5 border-r">Matches</th>
                    <th className="px-8 py-5 border-r text-center text-indigo-600 bg-indigo-50/20 font-black">Diff</th>
                    <th className="px-6 py-5 border-r text-center">Total Index</th>
                    <th className="px-8 py-5 border-r text-right font-black text-indigo-700">$/kg</th>
                    <th className="px-10 py-5 border-r text-right font-black text-indigo-900 bg-slate-50/50">Amount (KRW)</th>
                    <th className="px-8 py-5 text-center sticky right-0 bg-white shadow-[-10px_0_20px_rgba(0,0,0,0.03)]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {rawBeanContracts.sort((a,b) => b.id - a.id).map((c) => {
                    const unitPrice = (parseFloat(c.index || 0) + parseFloat(c.differential || 0)) * 22.046 / 1000;
                    const amountUSD = unitPrice * parseFloat(c.weight || 0);
                    const amountKRW = Math.round(amountUSD * parseFloat(c.planExchangeRate || exchangeRate));
                    return (
                      <tr key={c.id} className="hover:bg-indigo-50/20 group transition-all">
                        <td className="px-8 py-4 border-r font-black text-slate-900 bg-white sticky left-0 z-10 group-hover:bg-indigo-50/10">{c.origin}</td>
                        <td className="px-8 py-4 border-r font-black text-slate-900 bg-white sticky left-[140px] z-10 group-hover:bg-indigo-50/10">{c.supplier}</td>
                        <td className="px-8 py-4 border-r font-bold font-mono text-slate-400">{c.contractNo}</td>
                        <td className="px-6 py-4 border-r text-center font-black">{c.installment}</td>
                        <td className="px-6 py-4 border-r text-center font-bold text-slate-400">{c.paymentYear}.{c.paymentMonth}</td>
                        <td className="px-8 py-4 border-r font-black text-slate-700">{c.contractMonth}</td>
                        <td className="px-8 py-4 border-r text-center font-black text-indigo-700 bg-indigo-50/20">{c.differential?.toFixed(2)}</td>
                        <td className="px-6 py-4 border-r text-center font-bold font-mono">{(parseFloat(c.index || 0) + parseFloat(c.differential || 0)).toFixed(2)}</td>
                        <td className="px-8 py-4 border-r text-right font-black text-indigo-600 font-mono">${unitPrice.toFixed(4)}</td>
                        <td className="px-10 py-4 border-r text-right font-black text-indigo-950 bg-indigo-50/5 font-mono underline decoration-indigo-200">{amountKRW.toLocaleString()}원</td>
                        <td className="px-8 py-4 text-center sticky right-0 bg-white shadow-[-10px_0_20px_rgba(0,0,0,0.03)] group-hover:bg-indigo-50/10">
                           <div className="flex gap-4 justify-center">
                             <button onClick={() => startEditContract(c)} className="text-slate-300 hover:text-indigo-600 transition-colors transform hover:scale-125"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => onDeleteRawBeanContract(c.id)} className="text-slate-300 hover:text-rose-600 transition-colors transform hover:scale-125"><Trash2 className="w-4 h-4" /></button>
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

      {/* 생두 계약 리스트 모달 (송금 일정에서 데이터 불러오기용) */}
      {showContractPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight">생두 계약 데이터 불러오기</h3>
                        <p className="text-[10px] text-indigo-100 font-bold mt-1 uppercase tracking-widest">Select coffee contract for remittance</p>
                    </div>
                 </div>
                 <button onClick={() => setShowContractPicker(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rawBeanContracts.sort((a,b) => b.id - a.id).map((c) => {
                        const unitPrice = (parseFloat(c.index || 0) + parseFloat(c.differential || 0)) * 22.046 / 1000;
                        const amountUSD = unitPrice * parseFloat(c.weight || 0);
                        return (
                            <button 
                                key={c.id} 
                                onClick={() => loadContractToSchedule(c)}
                                className="bg-white border-2 border-slate-100 text-left p-8 rounded-[2rem] hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">{c.origin}</span>
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">#{c.contractNo?.split('-').pop()}</span>
                                </div>
                                <div className="text-xl font-black text-slate-800 mb-6 group-hover:text-indigo-600 transition-colors line-clamp-1">{c.supplier}</div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                                        <span className="text-[10px] text-slate-400 font-black uppercase">Contract Total</span>
                                        <span className="text-xl font-black text-slate-900 tabular-nums">${amountUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-slate-400 font-bold">BATCH / PERIOD</span>
                                        <span className="font-black text-slate-600">{c.installment} • {c.paymentYear}.{c.paymentMonth}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                 </div>
              </div>
           </div>
        </div>
      )}

      {showCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-xl font-black flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center"><ArrowRightLeft className="w-6 h-6 text-indigo-400" /></div>
                금액 산출기
              </h3>
              <button onClick={() => setShowCalc(false)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest px-1">월물 지수 선택</label><select value={calcData.indexId} onChange={e => setCalcData({...calcData, indexId: e.target.value})} className="w-full text-base font-black bg-slate-100/50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 transition-all">{<option value="">지수 선택</option>}{coffeeIndices.map(item => <option key={item.id} value={item.id}>{item.month} (지수: {item.price})</option>)}</select></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest px-1">총 수량 (KG)</label><input type="number" value={calcData.quantity} onChange={e => setCalcData({...calcData, quantity: e.target.value})} placeholder="ex) 19200" className="w-full text-base font-black bg-slate-100/50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 transition-all font-mono" /></div>
              {calcData.indexId && calcData.quantity && (
                  <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 animate-in slide-in-from-top-2">
                      <div className="text-[10px] text-indigo-200 font-black uppercase mb-2 tracking-widest">Calculated Result</div>
                      <div className="text-4xl font-black tabular-nums tracking-tighter">
                        ${(((coffeeIndices.find(c => String(c.id) === String(calcData.indexId))?.price + 50) * 22.046 / 1000) * parseFloat(calcData.quantity)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </div>
                  </div>
              )}
              <button onClick={applyCalculation} disabled={!calcData.indexId || !calcData.quantity} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition shadow-2xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none translate-y-2 mt-4">계획에 즉시 반영</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForeignSchedulePage;
