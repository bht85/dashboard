import React, { useState } from 'react';
import { Building2, Factory, Plus, Trash2, CreditCard } from 'lucide-react';
import { formatKRW, formatUSD } from '../utils/formatters';

const AccountManagementPage = ({ composeAccounts, smartAccounts, onAddAccount, onDeleteAccount }) => {
  const [formData, setFormData] = useState({
    section: 'compose',
    bank: '',
    no: '',
    type: '일반',
    isUSD: false,
  });


  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.bank || !formData.no) return;

    const newAccount = {
      id: Date.now(),
      no: formData.no,
      type: formData.type,
      balance: 0,
      withdraw: 0,
      internal: 0,
      final: 0,
      bank: formData.bank,
      isUSD: formData.isUSD,
    };

    await onAddAccount(formData.section, newAccount);

    setFormData({
      section: 'compose',
      bank: '',
      no: '',
      type: '일반',
      isUSD: false,
    });
  };

  const handleDelete = async (id, section) => {
    await onDeleteAccount(section, id);
  };

  const renderManager = (title, accounts, section) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          {section === 'compose' ? <Building2 className="w-4 h-4 text-indigo-500"/> : <Factory className="w-4 h-4 text-emerald-500"/>}
          {title}
        </h3>
      </div>
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="text-slate-500 bg-slate-50/30 text-xs border-b">
            <tr>
              <th className="px-6 py-3">은행</th>
              <th className="px-6 py-3">계좌번호</th>
              <th className="px-6 py-3">구분</th>
              <th className="px-6 py-3 text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-700">{acc.bank}</td>
                <td className="px-6 py-3 font-mono text-slate-500">{acc.no}</td>
                <td className="px-6 py-3 text-slate-600">
                  {acc.type} {acc.isUSD && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">USD</span>}
                </td>
                <td className="px-6 py-3 text-center">
                  <button onClick={() => handleDelete(acc.id, section)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">등록된 계좌가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">계좌 관리 및 설정</h2>
        <p className="text-sm text-slate-500 mt-1">자금 일보에 표시될 사업부별 활성 계좌를 관리합니다.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" /> 신규 계좌 등록
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">사업부 (섹션)</label>
            <select name="section" value={formData.section} onChange={handleChange} className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="compose">컴포즈커피</option>
              <option value="smart">스마트팩토리</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">계좌 종류 (구분)</label>
            <input type="text" name="type" value={formData.type} onChange={handleChange} placeholder="ex) 일반 / MMT" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">은행</label>
            <input type="text" name="bank" value={formData.bank} onChange={handleChange} placeholder="ex) 하나은행" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">계좌번호</label>
            <input type="text" name="no" value={formData.no} onChange={handleChange} placeholder="ex) 102-910000-00000" className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="md:col-span-3 flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors w-fit">
              <input type="checkbox" name="isUSD" checked={formData.isUSD} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded bg-white border-slate-300 focus:ring-indigo-500" />
              외화(USD) 계좌 여부
            </label>
          </div>
          <div className="md:col-span-1 flex items-end">
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 focus:scale-[0.98]">
              <Plus className="w-4 h-4"/> 등록하기
            </button>
          </div>
        </form>
      </div>

      {renderManager("컴포즈커피 계좌 리스트", composeAccounts, 'compose')}
      {renderManager("스마트팩토리 계좌 리스트", smartAccounts, 'smart')}
    </div>
  );
};

export default AccountManagementPage;
