import React, { useState } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { formatUSD, formatKRW } from '../utils/formatters';

const ForeignSchedulePage = ({ fxSchedule, onUpdateSchedule, onDeleteSchedule, exchangeRate = 1520 }) => {
  const [formData, setFormData] = useState({
    date: '',
    client: '',
    amount: '',
    bank: '',
    account: '',
    desc: '',
    status: '지출결의 대기',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.client || !formData.amount) return;

    const newSchedule = {
      id: Date.now(),
      date: formData.date,
      client: formData.client,
      amount: parseFloat(formData.amount),
      bank: formData.bank,
      account: formData.account,
      desc: formData.desc,
      status: formData.status,
    };

    await onUpdateSchedule(newSchedule);

    setFormData({
      date: '',
      client: '',
      amount: '',
      bank: '',
      account: '',
      desc: '',
      status: '지출결의 대기',
    });
  };

  const handleDelete = async (id) => {
    await onDeleteSchedule(id);
  };

  const handleStatusChange = async (id, newStatus) => {
    const item = fxSchedule.find(i => String(i.id) === String(id));
    if (item) {
      await onUpdateSchedule({ ...item, status: newStatus });
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">외화송금 일정 관리</h2>
        <p className="text-sm text-slate-500 mt-1">대시보드에 반영될 스마트팩토리(생두) 외화 송금 일정을 기입하고 관리합니다.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> 신규 일정 기입
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지급예정일</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">거래처</label>
            <input type="text" name="client" value={formData.client} onChange={handleChange} placeholder="ex) 블레스빈" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="relative group">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">금액 (USD)</label>
            <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} placeholder="ex) 5000.00" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
            {formData.amount && (
              <div className="absolute -bottom-5 right-0 text-[9px] font-bold text-indigo-500 animate-in fade-in slide-in-from-top-1">
                ≈ {formatKRW(parseFloat(formData.amount) * exchangeRate)}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">상태</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="지출결의 대기">지출결의 대기</option>
              <option value="지출결의 확인">지출결의 확인</option>
              <option value="지출결의 미확인">지출결의 미확인</option>
              <option value="송금 완료(집행)">송금 완료(집행)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">은행명</label>
            <input type="text" name="bank" value={formData.bank} onChange={handleChange} placeholder="ex) 기업" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">내용</label>
            <input type="text" name="desc" value={formData.desc} onChange={handleChange} placeholder="ex) 티오피아 대금지급..." className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">환율 정보 (실시간)</label>
            <div className="text-xs font-bold text-slate-400 h-9 flex items-center bg-slate-50/50 rounded-lg px-3 border border-slate-100">1$ = {exchangeRate?.toFixed(2)}원</div>
          </div>
          <div className="md:col-span-1 flex items-end">
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 focus:scale-[0.98]">
              <Plus className="w-4 h-4"/> 추가하기
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            등록된 일정 리스트
          </h3>
          <div className="text-[10px] font-bold bg-slate-900 text-slate-300 px-3 py-1 rounded-full">
            기준 환율: {formatKRW(exchangeRate)}
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
                  <td className="px-4 py-3 border-r">{s.date}</td>
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
                      <option value="지출결의 대기">지출결의 대기</option>
                      <option value="지출결의 확인">지출결의 확인</option>
                      <option value="지출결의 미확인">지출결의 미확인</option>
                      <option value="송금 완료(집행)">송금 완료(집행)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {fxSchedule.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-xs text-center border-b">등록된 외화 송금 일정이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForeignSchedulePage;
