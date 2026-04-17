import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Upload, PieChart as PieChartIcon, BarChart3, TrendingUp, Search, 
  Trash2, Plus, CheckCircle2, AlertCircle, Calendar, User, Filter, 
  ArrowUpRight, Target
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { COMPOSE_SUBJECTS, SMART_SUBJECTS } from './AccountMappingPage';
import { formatKRW } from '../utils/formatters';

const CorporateCardPage = ({ usage, budget, onUpdateUsage, onBulkUpdateUsage, onDeleteUsage, onUpdateBudget, selectedDate }) => {
  const [activeTab, setActiveTab] = useState('usage');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(selectedDate.substring(0, 7)); // YYYY-MM
  const [uploading, setUploading] = useState(false);

  // Available months from usage data
  const availableMonths = useMemo(() => {
    const months = new Set(usage.map(u => u.month));
    months.add(selectedDate.substring(0, 7));
    // Filter out invalid months
    return Array.from(months).filter(m => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
  }, [usage, selectedDate]);
  // Combined subjects for category mapping
  const ALL_SUBJECTS = useMemo(() => {
    const subjects = new Set();
    Object.values(COMPOSE_SUBJECTS).forEach(list => list.forEach(s => subjects.add(s)));
    Object.values(SMART_SUBJECTS).forEach(list => list.forEach(s => subjects.add(s)));
    return Array.from(subjects).sort();
  }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  // Filtered usage data
  const filteredUsage = useMemo(() => {
    return usage.filter(u => {
      const isMonth = u.month === selectedMonth;
      const matchesSearch = searchTerm === '' || 
        (u.merchant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.cardCompany || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.dept1 || '').toLowerCase().includes(searchTerm.toLowerCase());
      return isMonth && matchesSearch;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [usage, selectedMonth, searchTerm]);

  // Aggregate stats
  const monthlyStats = useMemo(() => {
    const totalUsage = filteredUsage.reduce((sum, item) => sum + (item.amount || 0), 0);
    const monthlyBudget = budget.filter(b => b.month === selectedMonth)
                                .reduce((sum, item) => sum + (item.amount || 0), 0);
    const utilization = monthlyBudget > 0 ? (totalUsage / monthlyBudget) * 100 : 0;
    
    return {
      total: totalUsage,
      budget: monthlyBudget,
      utilization: utilization.toFixed(1)
    };
  }, [filteredUsage, budget, selectedMonth]);

  // Chart Data: Category Breakdown
  const categoryChartData = useMemo(() => {
    const map = {};
    filteredUsage.forEach(item => {
      const cat = item.category || '미지정';
      map[cat] = (map[cat] || 0) + (item.amount || 0);
    });
    return Object.keys(map).map(key => ({ name: key, value: map[key] }))
      .sort((a,b) => b.value - a.value);
  }, [filteredUsage]);

  // Chart Data: Actual vs Budget
  const budgetVsActualData = useMemo(() => {
    const monthBudgets = budget.filter(b => b.month === selectedMonth);
    const map = {};
    
    // Fill with budgets first
    monthBudgets.forEach(b => {
      map[b.category] = { category: b.category, budget: b.amount, actual: 0 };
    });
    
    // Add actual spending
    filteredUsage.forEach(u => {
      const cat = u.category || '미지정';
      if (!map[cat]) map[cat] = { category: cat, budget: 0, actual: 0 };
      map[cat].actual += u.amount;
    });
    
    return Object.values(map).sort((a,b) => b.actual - a.actual);
  }, [filteredUsage, budget, selectedMonth]);

  // Handle Excel Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        
        const targetSheetName = wb.SheetNames.find(name => name.includes("CC 카드사용내역")) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const rawData = XLSX.utils.sheet_to_json(ws);

        console.log(`Processing ${rawData.length} records from sheet "${targetSheetName}"...`);
        
        const preparedData = [];
        for (const row of rawData) {
          const cardCompany = row['카드사명'] || row['카드사'] || '';
          const cardNumber = row['카드번호'] || '';
          const dateVal = row['승인일자'] || row['이용일시'] || row['날짜'] || row['사용일자'];
          const merchant = row['가맹점명'] || row['가맹점'] || row['내용'] || '';
          const amount = parseInt(String(row['승인금액'] || row['이용금액'] || row['금액'] || 0).replace(/,/g, ''));
          const userName = row['구분'] || row['사용자'] || row['이름'] || row['카드명'] || '';
          const dept1 = row['조직1'] || '';
          const dept2 = row['조직2'] || '';

          if (dateVal && amount > 0) {
            let cleanDate = '';
            if (dateVal instanceof Date) {
              cleanDate = dateVal.toISOString().split('T')[0];
            } else {
              let s = String(dateVal);
              if (s.includes('.')) s = s.replace(/\./g, '-');
              cleanDate = s.split(' ')[0];
            }
            
            if (cleanDate.length >= 7) {
              const month = cleanDate.substring(0, 7);
              preparedData.push({
                id: `${cleanDate}_${merchant}_${amount}_${userName}_${cardNumber}`,
                date: cleanDate,
                month,
                cardCompany,
                cardNumber,
                merchant,
                amount,
                user: userName || '미지정',
                dept1,
                dept2,
                category: '' 
              });
            }
          }
        }

        if (preparedData.length > 0) {
          await onBulkUpdateUsage(preparedData);
          alert(`"${targetSheetName}" 시트에서 ${preparedData.length}건의 내역 업로드가 완료되었습니다.`);
        } else {
          alert('업로드할 유효한 데이터가 없습니다. 엑셀 형식을 확인해주세요.');
        }
      } catch (err) {
        console.error("Upload error:", err);
        if (err.code === 'permission-denied' || err.message?.includes('permission')) {
          alert('데이터베이스 권한 오류: 파이어베이스 콘솔에서 보안 규칙이 올바르게 적용되었는지 확인해주세요.');
        } else {
          alert(`업로드 실패: ${err.message || '알 수 없는 오류'}\n콘솔 로그를 확인해주세요.`);
        }
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Header & Monthly Overview */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-500" /> 법인카드 관리
          </h2>
          <p className="text-sm text-slate-500">월별 법인카드 사용 내역을 관리하고 예산 대비 지출을 분석합니다.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button onClick={() => setActiveTab('usage')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'usage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>내역 조회</button>
              <button onClick={() => setActiveTab('analysis')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>지출 분석</button>
              <button onClick={() => setActiveTab('budget')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>예산 관리</button>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            {availableMonths.map(m => <option key={m} value={m}>{m.replace('-', '년 ')}월</option>)}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>내역 업로드</span>
            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="월 총 사용액" 
          value={formatKRW(monthlyStats.total)} 
          icon={<TrendingUp className="w-4 h-4" />} 
          color="indigo" 
          subtitle="당월 전체 승인 금액"
        />
        <StatCard 
          title="월 총 예산" 
          value={formatKRW(monthlyStats.budget)} 
          icon={<Target className="w-4 h-4" />} 
          color="emerald" 
          subtitle="수립된 월간 예산 총액"
        />
        <StatCard 
          title="예산 대비 집행률" 
          value={`${monthlyStats.utilization}%`} 
          icon={<ArrowUpRight className="w-4 h-4" />} 
          color={parseFloat(monthlyStats.utilization) > 100 ? "rose" : "blue"} 
          subtitle="전체 지출 / 전체 예산"
        />
        <StatCard 
          title="결제 건수" 
          value={`${filteredUsage.length} 건`} 
          icon={<CreditCard className="w-4 h-4" />} 
          color="amber" 
          subtitle="당월 총 카드 승인 횟수"
        />
      </div>

      {/* Tabs Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {activeTab === 'usage' && (
          <div className="p-0">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="가맹점 또는 사용자 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="text-[11px] font-black text-slate-400 uppercase">
                  Showing {filteredUsage.length} transactions for {selectedMonth}
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-[#f8fafc] text-slate-500 font-bold border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-4">승인일자</th>
                     <th className="px-6 py-4">카드/조직</th>
                     <th className="px-6 py-4">가맹점</th>
                     <th className="px-6 py-4 text-right">금액</th>
                     <th className="px-6 py-4">사용자</th>
                     <th className="px-6 py-4">계정과목</th>
                     <th className="px-6 py-4 text-center w-20">작업</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredUsage.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="py-20 text-center text-slate-400">
                         <div className="flex flex-col items-center gap-2">
                           <AlertCircle className="w-8 h-8 text-slate-200" />
                           <p className="font-bold">표시할 내역이 없습니다.</p>
                           <p className="text-xs">상단의 '내역 업로드' 버튼을 통해 엑셀 파일을 업로드해주세요.</p>
                         </div>
                       </td>
                     </tr>
                   ) : filteredUsage.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-indigo-500">
                       <td className="px-6 py-4 font-medium text-slate-600">
                         <div className="flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5 text-slate-400" />
                           {item.date}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col gap-0.5">
                           <div className="flex items-center gap-1.5">
                             <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">{item.cardCompany || 'CARD'}</span>
                             <span className="text-[10px] font-bold text-slate-400 font-mono">{item.cardNumber?.slice(-4) ? `****${item.cardNumber.slice(-4)}` : '-'}</span>
                           </div>
                           <div className="text-[10px] text-indigo-500 font-bold">
                             {item.dept1}{item.dept2 ? ` > ${item.dept2}` : ''}
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 font-black text-slate-900">
                         <div className="truncate max-w-[180px]" title={item.merchant}>{item.merchant}</div>
                       </td>
                       <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{formatKRW(item.amount)}</td>
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-2 text-slate-600 font-bold">
                           <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">{item.user?.substring(0,1)}</div>
                           {item.user}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <select 
                           value={item.category || ''}
                           onChange={(e) => onUpdateUsage({ ...item, category: e.target.value })}
                           className={`w-full max-w-[160px] bg-white border ${item.category ? 'border-indigo-200 text-indigo-700 bg-indigo-50/30' : 'border-rose-100 text-rose-500 bg-rose-50/30'} rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                         >
                           <option value="">-- 과목 선택 --</option>
                           {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <button 
                           onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) onDeleteUsage(item.id) }} 
                           className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="p-8 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Category Breakdown Pie Chart */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-indigo-500" /> 계정과목별 지출 비율
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Spending breakdown by category</p>
                </div>
                <div className="h-[350px] w-full bg-slate-50/50 rounded-3xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatKRW(value)}
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Budget vs Actual Bar Chart */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" /> 예산 대비 지출 현황
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Budget vs Actual by category</p>
                </div>
                <div className="h-[350px] w-full bg-slate-50/50 rounded-3xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActualData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} width={80} />
                      <Tooltip 
                        formatter={(value) => formatKRW(value)}
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                      <Bar dataKey="budget" name="예산" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="actual" name="실제 지출" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Merchant Top List */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> Top Merchants (당월 최다 사용처)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {categoryChartData.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-xs">0{idx+1}</div>
                        <span className="text-xs font-bold text-slate-300">{item.name}</span>
                      </div>
                      <span className="text-sm font-black">{formatKRW(item.value)}</span>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">카테고리별 예산 설정</h3>
                <p className="text-sm text-slate-500">각 계정과목별로 한 달 예산을 설정합니다. ({selectedMonth})</p>
              </div>
              <p className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
                총 예산: {formatKRW(monthlyStats.budget)}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_SUBJECTS.map(cat => {
                const b = budget.find(b => b.month === selectedMonth && b.category === cat);
                const actual = filteredUsage.filter(u => u.category === cat).reduce((s, i) => s + i.amount, 0);
                const percent = b && b.amount > 0 ? (actual / b.amount) * 100 : 0;
                
                return (
                  <div key={cat} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">{cat}</span>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="0"
                          defaultValue={b ? b.amount : ''}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value.replace(/,/g, ''));
                            if (!isNaN(val)) {
                              onUpdateBudget({ month: selectedMonth, category: cat, amount: val });
                            }
                          }}
                          className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-right text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">원</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">실제 지출: {formatKRW(actual)}</span>
                        <span className={percent > 100 ? "text-rose-500" : "text-indigo-500"}>{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${percent > 100 ? "bg-rose-500" : "bg-indigo-500"}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:translate-y-[-4px] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-2xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
      <div className="text-lg font-black text-slate-900 tracking-tight mb-1 truncate" title={value}>{value}</div>
      <p className="text-[10px] text-slate-400 font-bold italic truncate">{subtitle}</p>
    </div>
  );
};

export default CorporateCardPage;
