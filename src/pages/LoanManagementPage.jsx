import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Calendar, Calculator, Edit2, ArrowRightLeft, FileText, ChevronRight } from 'lucide-react';
import { formatUSD, formatKRW, formatMillionKRW } from '../utils/formatters';

const LoanManagementPage = ({ 
  loans = [], 
  onUpdateLoan, 
  onDeleteLoan,
  exchangeRate = 1520,
  exchangeRateEUR = 1620,
  exchangeRateJPY = 10,
}) => {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'interest'
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMPLETED'
  const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL', 'KRW', 'FOREIGN'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [expandedRows, setExpandedRows] = useState({}); // Tracking which rows are expanded

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [formData, setFormData] = useState({
    lender: '컴포즈커피',
    borrower: '',
    date: new Date().toLocaleDateString('en-CA'),
    endDate: '',
    principal: '',
    currency: 'KRW',
    interestRate: '',
    status: 'ACTIVE',
    desc: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.borrower || !formData.principal || !formData.interestRate) return;

    const newLoan = {
      id: Date.now(),
      lender: formData.lender,
      borrower: formData.borrower,
      startDate: formData.date,
      endDate: formData.endDate,
      principal: parseFloat(formData.principal),
      currency: formData.currency,
      interestRate: parseFloat(formData.interestRate),
      status: formData.status,
      desc: formData.desc
    };

    await onUpdateLoan(newLoan);

    setFormData({
      lender: '컴포즈커피',
      borrower: '',
      date: new Date().toLocaleDateString('en-CA'),
      endDate: '',
      principal: '',
      currency: 'KRW',
      interestRate: '',
      status: 'ACTIVE',
      desc: ''
    });
  };

  const startEdit = (loan) => {
    setEditingId(loan.id);
    setEditData({ ...loan });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    await onUpdateLoan({
      ...editData,
      principal: parseFloat(editData.principal || 0),
      interestRate: parseFloat(editData.interestRate || 0)
    });
    setEditingId(null);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const calculateMonthlyInterest = (principal, rate) => {
    return (principal * (rate / 100)) / 12;
  };

  const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  const calculateProRataInterest = (principal, rate, year, month, startDateStr, endDateStr) => {
    if (!startDateStr) return 0;
    
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const loanStart = new Date(startDateStr);
    const loanEnd = endDateStr ? new Date(endDateStr) : new Date(2099, 11, 31);

    const start = monthStart > loanStart ? monthStart : loanStart;
    const end = monthEnd < loanEnd ? monthEnd : loanEnd;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > end) return 0;

    const activeDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = isLeapYear(year) ? 366 : 365;

    return principal * (rate / 100) * (activeDays / daysInYear);
  };
  
  const calculateYearlyTotalInterest = (principal, rate, year, startDateStr, endDateStr) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      total += calculateProRataInterest(principal, rate, year, m, startDateStr, endDateStr);
    }
    return total;
  };

  const currentYear = new Date().getFullYear();

  const filteredLoans = loans.filter(loan => {
    if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;
    if (currencyFilter === 'KRW' && loan.currency !== 'KRW') return false;
    if (currencyFilter === 'FOREIGN' && loan.currency === 'KRW') return false;
    return true;
  });

  const totalPrincipalKRW = loans.filter(l => l.status === 'ACTIVE').reduce((sum, loan) => {
    let amt = loan.principal || 0;
    if (loan.currency === 'USD') amt *= exchangeRate;
    if (loan.currency === 'EUR') amt *= exchangeRateEUR;
    if (loan.currency === 'JPY') amt *= exchangeRateJPY;
    return sum + amt;
  }, 0);

  const totalMonthlyInterestKRW = loans.filter(l => l.status === 'ACTIVE').reduce((sum, loan) => {
    let interest = calculateMonthlyInterest(loan.principal, loan.interestRate);
    if (loan.currency === 'USD') interest *= exchangeRate;
    if (loan.currency === 'EUR') interest *= exchangeRateEUR;
    if (loan.currency === 'JPY') interest *= exchangeRateJPY;
    return sum + interest;
  }, 0);

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Landmark className="w-3.5 h-3.5" /> 대여금 원장 관리
          </button>
          <button 
            onClick={() => setActiveTab('interest')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'interest' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-3.5 h-3.5" /> 월단위 이자 수취표
          </button>
        </div>

        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-xs font-bold divide-x divide-slate-100">
          <div className="px-4 py-2 flex items-center gap-2 bg-slate-50">
            <span className="text-slate-400">총 대여금 (KRW)</span>
            <span className="text-indigo-600 font-mono text-sm">{formatKRW(totalPrincipalKRW)}</span>
          </div>
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-slate-400">월 예상 이자</span>
            <span className="text-emerald-600 font-mono text-sm">+{formatKRW(totalMonthlyInterestKRW)}</span>
          </div>
        </div>
      </div>

      {activeTab === 'ledger' ? (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-indigo-500" /> 신규 대여금 등록
            </h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">대여 주체</label>
                <select name="lender" value={formData.lender} onChange={handleChange} className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="컴포즈커피">컴포즈커피</option>
                  <option value="스마트팩토리">스마트팩토리</option>
                </select>
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">차입 법인명</label>
                <input type="text" name="borrower" value={formData.borrower} onChange={handleChange} placeholder="ex) (주)제이엠" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">대여일</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">만기일 (선택)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">통화</label>
                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="KRW">KRW (₩)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">대여 원금</label>
                <input type="number" step={formData.currency === 'KRW' ? "1" : "0.01"} name="principal" value={formData.principal} onChange={handleChange} placeholder="ex) 10000000" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">연 이자율 (%)</label>
                <input type="number" step="0.01" name="interestRate" value={formData.interestRate} onChange={handleChange} placeholder="ex) 4.6" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">상태</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full text-sm font-black bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="ACTIVE">대여 중</option>
                  <option value="COMPLETED">상환 완료</option>
                </select>
              </div>
              <div className="lg:col-span-7">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">비고 / 내용</label>
                <input type="text" name="desc" value={formData.desc} onChange={handleChange} placeholder="비고 입력..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="lg:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-1.5 focus:scale-[0.98]">
                  <Plus className="w-4 h-4"/> 등록
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Calculator className="w-4 h-4 text-indigo-500" /> 대여금 원장 내역
              </h3>
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
                {['ALL', 'ACTIVE', 'COMPLETED'].map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {s === 'ALL' ? '전체' : s === 'ACTIVE' ? '대여 중' : '상환 완료'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="px-4 py-3 border-r">대여 주체</th>
                    <th className="px-4 py-3 border-r">차입 법인명</th>
                    <th className="px-4 py-3 border-r text-center">상태</th>
                    <th className="px-4 py-3 border-r text-center">대여 기간</th>
                    <th className="px-4 py-3 border-r text-center">통화</th>
                    <th className="px-4 py-3 border-r text-right">원금</th>
                    <th className="px-4 py-3 border-r text-center text-indigo-600 font-black">이자율</th>
                    <th className="px-4 py-3 border-r text-right text-indigo-600 font-black">월 예상 이자</th>
                    <th className="px-4 py-3 border-r">비고</th>
                    <th className="px-4 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredLoans.map((loan) => {
                    const isForeign = loan.currency !== 'KRW';
                    const monthlyInterest = calculateMonthlyInterest(loan.principal, loan.interestRate);
                    const isEditing = editingId === loan.id;
                    return (
                      <tr key={loan.id} className={`hover:bg-slate-50/50 transition-colors ${loan.status === 'COMPLETED' ? 'opacity-60 bg-slate-50' : ''}`}>
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2 border-r">
                              <select name="lender" value={editData.lender} onChange={handleEditChange} className="w-full text-[10px] font-black border border-indigo-200 rounded px-1 py-1 outline-none">
                                <option value="컴포즈커피">컴포즈</option>
                                <option value="스마트팩토리">스마트</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 border-r">
                               <input type="text" name="borrower" value={editData.borrower} onChange={handleEditChange} className="w-full text-[11px] font-bold border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r text-center">
                              <select name="status" value={editData.status} onChange={handleEditChange} className="w-full text-[10px] font-black border border-indigo-200 rounded px-1 py-1 outline-none">
                                <option value="ACTIVE">대여 중</option>
                                <option value="COMPLETED">상환 완료</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 border-r flex flex-wrap gap-1 items-center justify-center">
                               <input type="date" name="startDate" value={editData.startDate || editData.date} onChange={handleEditChange} className="text-[10px] border border-indigo-200 rounded p-0.5 outline-none" />
                               <span className="text-slate-300">~</span>
                               <input type="date" name="endDate" value={editData.endDate || ''} onChange={handleEditChange} className="text-[10px] border border-indigo-200 rounded p-0.5 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r text-center">
                              <select name="currency" value={editData.currency} onChange={handleEditChange} className="text-[10px] font-bold border border-indigo-200 rounded p-1 outline-none">
                                <option value="KRW">KRW</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="JPY">JPY</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 border-r">
                               <input type="number" name="principal" value={editData.principal} onChange={handleEditChange} className="w-full text-[11px] font-bold text-right border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 border-r text-center">
                               <input type="number" step="0.01" name="interestRate" value={editData.interestRate} onChange={handleEditChange} className="w-16 text-[11px] font-bold text-center border border-indigo-200 rounded px-1 py-1 outline-none text-indigo-600" /> %
                            </td>
                            <td className="px-4 py-2 border-r text-right font-mono font-bold text-indigo-600 bg-indigo-50/20">
                               {editData.currency === 'KRW' ? formatKRW(calculateMonthlyInterest(editData.principal || 0, editData.interestRate || 0)) : formatUSD(calculateMonthlyInterest(editData.principal || 0, editData.interestRate || 0))}
                            </td>
                            <td className="px-4 py-2 border-r">
                               <input type="text" name="desc" value={editData.desc} onChange={handleEditChange} className="w-full text-[10px] border border-indigo-200 rounded px-1 py-1 outline-none" />
                            </td>
                            <td className="px-4 py-2 text-center flex gap-1 justify-center">
                              <button onClick={saveEdit} className="p-1 px-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-[10px] font-bold">저장</button>
                              <button onClick={cancelEdit} className="p-1 px-2 bg-white text-slate-400 border border-slate-200 rounded hover:text-red-500 text-[10px]">취소</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 border-r text-center">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black border ${loan.lender === '스마트팩토리' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                {loan.lender || '컴포즈'}
                              </span>
                            </td>
                            <td className="px-4 py-4 border-r font-black text-slate-800">{loan.borrower}</td>
                            <td className="px-4 py-4 border-r text-center">
                              <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black border ${loan.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {loan.status === 'ACTIVE' ? '대여 중' : '상환 완료'}
                              </span>
                            </td>
                            <td className="px-4 py-4 border-r text-center text-[10px] text-slate-500 font-mono">
                              {loan.startDate} <br/><span className="text-slate-300">~</span> {loan.endDate || '미정'}
                            </td>
                            <td className="px-4 py-4 border-r text-center">
                               <span className={`font-black text-[10px] tracking-wider ${isForeign ? 'text-blue-500' : 'text-slate-400'}`}>{loan.currency}</span>
                            </td>
                            <td className="px-4 py-4 border-r text-right font-mono font-bold text-slate-800">
                               {loan.currency === 'KRW' ? formatKRW(loan.principal) : isForeign && loan.currency === 'USD' ? formatUSD(loan.principal) : `${loan.principal.toLocaleString()} ${loan.currency}`}
                               {isForeign && loan.status === 'ACTIVE' && (
                                 <div className="text-[9px] text-slate-400 mt-0.5 font-normal">
                                   ≈ {formatKRW(loan.principal * (loan.currency === 'EUR' ? exchangeRateEUR : loan.currency === 'JPY' ? exchangeRateJPY : exchangeRate))}
                                 </div>
                               )}
                            </td>
                            <td className="px-4 py-4 border-r text-center font-mono font-bold text-indigo-600 bg-indigo-50/10">
                               {loan.interestRate}%
                            </td>
                            <td className="px-4 py-4 border-r text-right font-mono font-black text-indigo-600 bg-indigo-50/30">
                               {loan.currency === 'KRW' ? formatKRW(monthlyInterest) : loan.currency === 'USD' ? formatUSD(monthlyInterest) : `${monthlyInterest.toLocaleString()} ${loan.currency}`}
                            </td>
                            <td className="px-4 py-4 border-r text-[10px] text-slate-400 break-words max-w-[150px]">{loan.desc}</td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => startEdit(loan)} className="text-slate-400 hover:text-indigo-500 p-1.5 bg-slate-50 rounded-md border border-slate-200">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onDeleteLoan(loan.id)} className="text-slate-400 hover:text-red-500 p-1.5 bg-slate-50 rounded-md border border-slate-200">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-emerald-500" /> 월단위 실질 이자 수취 명세표
            </h3>
            <div className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
              {currentYear} FISCAL YEAR
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[900px] ring-1 ring-slate-100 rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-emerald-50/50 text-slate-600 font-bold border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-4 border-r border-slate-100">대여 주체</th>
                  <th className="px-5 py-4 border-r border-slate-100">차입처 (법인명) <span className="text-[9px] font-normal text-slate-400 ml-1">(클릭시 상세보기)</span></th>
                  <th className="px-5 py-4 border-r border-slate-100 text-center">통화</th>
                  <th className="px-5 py-4 border-r border-slate-100 text-right">대여 원금</th>
                  <th className="px-5 py-4 border-r border-slate-100 text-center">이율</th>
                  <th className="px-5 py-4 border-r border-slate-100 text-right text-emerald-700 bg-emerald-100/20">월 평균 이자</th>
                  <th className="px-5 py-4 border-r border-slate-100 text-right text-indigo-700 bg-indigo-100/10">연간 합계 ({currentYear})</th>
                  <th className="px-5 py-4">관리 계좌</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeLoans.map((loan) => {
                  const isExpanded = !!expandedRows[loan.id];
                  const yearlyTotal = calculateYearlyTotalInterest(loan.principal, loan.interestRate, currentYear, loan.startDate, loan.endDate);
                  const isForeign = loan.currency !== 'KRW';
                  const monthlyInterest = calculateMonthlyInterest(loan.principal, loan.interestRate);

                  return (
                    <React.Fragment key={loan.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 border-r border-slate-100">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black border ${loan.lender === '스마트팩토리' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {loan.lender || '컴포즈'}
                          </span>
                        </td>
                        <td className="px-5 py-4 border-r border-slate-100">
                          <button onClick={() => toggleRow(loan.id)} className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600 transition-colors w-full text-left">
                            <ChevronRight className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} />
                            {loan.borrower}
                          </button>
                        </td>
                        <td className="px-5 py-4 border-r border-slate-100 text-center font-black text-slate-400">{loan.currency}</td>
                        <td className="px-5 py-4 border-r border-slate-100 text-right font-mono font-bold">
                          {loan.currency === 'KRW' ? formatKRW(loan.principal) : formatUSD(loan.principal)}
                        </td>
                        <td className="px-5 py-4 border-r border-slate-100 text-center font-mono font-bold text-slate-500">{loan.interestRate}%</td>
                        <td className="px-5 py-4 border-r border-slate-100 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">
                          {loan.currency === 'KRW' ? formatKRW(monthlyInterest) : formatUSD(monthlyInterest)}
                        </td>
                        <td className="px-5 py-4 border-r border-slate-100 text-right font-mono font-black text-indigo-600 bg-indigo-50/20">
                          {loan.currency === 'KRW' ? formatKRW(yearlyTotal) : formatUSD(yearlyTotal)}
                          {isForeign && (
                            <div className="text-[9px] font-bold text-indigo-400 mt-0.5">
                              ≈ {formatKRW(yearlyTotal * (loan.currency === 'EUR' ? exchangeRateEUR : loan.currency === 'JPY' ? exchangeRateJPY : exchangeRate))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <input type="text" placeholder="통장 번호..." className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-emerald-500" defaultValue={loan.receivingAccount || ""} onBlur={(e) => onUpdateLoan({...loan, receivingAccount: e.target.value})} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 animate-in slide-in-from-top-2">
                              <h4 className="text-[10px] font-black text-slate-400 mb-3 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> {currentYear}년 월별 일할 상세 내역
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                                  const amt = calculateProRataInterest(loan.principal, loan.interestRate, currentYear, m, loan.startDate, loan.endDate);
                                  const isZ = amt <= 0;
                                  return (
                                    <div key={m} className={`flex flex-col border rounded p-1 transition-colors ${isZ ? 'bg-slate-50 border-slate-100 opacity-30' : 'bg-indigo-50/30 border-indigo-100'}`}>
                                      <span className={`text-[8px] font-black ${isZ ? 'text-slate-400' : 'text-indigo-500'}`}>{m}월</span>
                                      <span className="text-[9px] font-mono font-bold text-slate-700">
                                        {loan.currency === 'KRW' ? formatMillionKRW(amt) : formatUSD(amt)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Footer Totals */}
                {activeLoans.length > 0 && (
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="px-5 py-4 text-right font-black text-slate-500 text-[10px] uppercase tracking-wider">전체 합계 (KRW 환산)</td>
                    <td className="px-5 py-4 border-r border-slate-100 text-right bg-emerald-50/30">
                      <div className="text-[8px] font-bold text-emerald-500 mb-0.5">월 이자 합계</div>
                      <div className="font-mono font-black text-emerald-700 text-sm">{formatKRW(totalMonthlyInterestKRW)}</div>
                    </td>
                    <td className="px-5 py-4 border-r border-slate-100 text-right bg-indigo-50/20">
                      <div className="text-[8px] font-bold text-indigo-500 mb-0.5">{currentYear}년 연간 합계</div>
                      <div className="font-mono font-black text-indigo-700 text-sm">
                        {formatKRW(activeLoans.reduce((sum, l) => {
                          const yTotal = calculateYearlyTotalInterest(l.principal, l.interestRate, currentYear, l.startDate, l.endDate);
                          let v = yTotal;
                          if (l.currency === 'USD') v *= exchangeRate;
                          if (l.currency === 'EUR') v *= exchangeRateEUR;
                          if (l.currency === 'JPY') v *= exchangeRateJPY;
                          return sum + v;
                        }, 0))}
                      </div>
                    </td>
                    <td className="px-5 py-4 bg-slate-50"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Monthly Total Grid (Footer Section) */}
          {activeLoans.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-[11px] font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-500" /> {currentYear}년 월별 실질 수취 총계 (전체 법인 KRW 환산)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const monthlySum = activeLoans.reduce((sum, loan) => {
                      let p = calculateProRataInterest(loan.principal, loan.interestRate, currentYear, m, loan.startDate, loan.endDate);
                      if (loan.currency === 'USD') p *= exchangeRate;
                      if (loan.currency === 'EUR') p *= exchangeRateEUR;
                      if (loan.currency === 'JPY') p *= exchangeRateJPY;
                      return sum + p;
                    }, 0);
                    return (
                      <div key={m} className="bg-slate-50 border border-slate-100 rounded-lg p-2 hover:shadow-md transition-all">
                        <span className="text-[8px] font-black text-slate-400 block mb-0.5 uppercase">{m}월</span>
                        <span className="text-[10px] font-mono font-black text-slate-900">{formatMillionKRW(monthlySum)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanManagementPage;
