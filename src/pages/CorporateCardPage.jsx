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

const CorporateCardPage = ({ usage, budget, onUpdateUsage, onBulkUpdateUsage, onDeleteUsage, onUpdateBudget, onBulkUpdateBudget, selectedDate }) => {
  const [activeTab, setActiveTab] = useState('analysis'); // Default to analysis
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(selectedDate.substring(0, 7)); // YYYY-MM
  const [selectedTrendSubject, setSelectedTrendSubject] = useState(''); // Category for trend analysis
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

  // Derived collections for the Matrix UI
  const { DEPTS_IN_DATA, ALL_SUBJECTS_IN_DATA } = useMemo(() => {
    const monthBudgets = budget.filter(b => b.month === selectedMonth);
    const depts = new Set();
    const subjects = new Set();
    
    // Core subjects from Excel
    monthBudgets.forEach(b => {
        depts.add(b.dept);
        subjects.add(b.category);
    });

    return {
        DEPTS_IN_DATA: Array.from(depts).sort(),
        ALL_SUBJECTS_IN_DATA: Array.from(subjects).sort()
    };
  }, [budget, selectedMonth]);

  // Aggregate stats
  const monthlyStats = useMemo(() => {
    const totalUsage = filteredUsage.reduce((sum, item) => sum + (item.amount || 0), 0);
    const monthlyBudgets = budget.filter(b => b.month === selectedMonth);
    const totalBudgetRecord = monthlyBudgets.find(b => b.dept === '전체부서');
    
    let monthlyBudgetValue = 0;
    let totalExcelActual = 0;
    
    if (totalBudgetRecord) {
      monthlyBudgets.filter(b => b.dept === '전체부서').forEach(b => {
        monthlyBudgetValue += (b.amount || 0);
        totalExcelActual += (b.actual || 0);
      });
    } else {
      monthlyBudgets.forEach(b => {
        monthlyBudgetValue += (b.amount || 0);
        totalExcelActual += (b.actual || 0);
      });
    }

    const finalTotalUsage = totalExcelActual > 0 ? totalExcelActual : totalUsage;
    const utilization = monthlyBudgetValue > 0 ? (finalTotalUsage / monthlyBudgetValue) * 100 : 0;
    
    return {
      total: finalTotalUsage,
      budget: monthlyBudgetValue,
      utilization: utilization.toFixed(1)
    };
  }, [filteredUsage, budget, selectedMonth]);

  // Chart Data: Team Analysis (Priority: Excel Execution Data)
  const teamAnalysisData = useMemo(() => {
    // Filter out subtotals to see departments clearly
    const monthBudgets = budget.filter(b => 
      b.month === selectedMonth && 
      b.dept !== '전체부서' && 
      !b.dept.includes('소계')
    );
    if (monthBudgets.length === 0) return [];
    
    const map = {};
    monthBudgets.forEach(b => {
      const dept = b.dept;
      if (!map[dept]) map[dept] = { name: dept, budget: 0, actual: 0 };
      map[dept].budget += (b.amount || 0);
      map[dept].actual += (b.actual || 0);
    });
    
    // Fallback if no execution data was in the Excel budget sheet
    if (Object.values(map).every(v => v.actual === 0)) {
      filteredUsage.forEach(u => {
        const dept = u.dept1 || '미지정';
        if (dept.includes('소계') || dept.includes('전체')) return;
        if (map[dept]) map[dept].actual += u.amount;
      });
    }
    
    return Object.values(map).sort((a,b) => b.actual - a.actual);
  }, [filteredUsage, budget, selectedMonth]);

  // Combined Trend Data for selected category (Last 6 months)
  const categoryTrendData = useMemo(() => {
    const target = selectedTrendSubject || ALL_SUBJECTS_IN_DATA[0];
    if (!target) return [];

    const monthList = [];
    const date = new Date(selectedMonth + "-01");
    for (let i = 5; i >= 0; i--) {
        const d = new Date(date);
        d.setMonth(d.getMonth() - i);
        monthList.push(d.toISOString().substring(0, 7));
    }

    return monthList.map(m => {
        const items = budget.filter(b => b.month === m && b.category === target);
        const totalRecord = items.find(b => b.dept === '전체부서');
        let budgetAmt = 0;
        let actualAmt = 0;

        if (totalRecord) {
            budgetAmt = totalRecord.amount || 0;
            actualAmt = totalRecord.actual || 0;
        } else {
            items.forEach(it => {
                budgetAmt += (it.amount || 0);
                actualAmt += (it.actual || 0);
            });
        }

        return {
            name: parseInt(m.substring(5)) + "월",
            budget: budgetAmt,
            actual: actualAmt
        };
    });
  }, [budget, selectedMonth, selectedTrendSubject, ALL_SUBJECTS_IN_DATA]);

  // Chart Data: Category Breakdown (Priority: Excel Execution Data)
  const categoryChartData = useMemo(() => {
    const monthBudgets = budget.filter(b => b.month === selectedMonth);
    const map = {};
    
    // 1. Try to use "전체부서" totals from Excel
    const totalBudgets = monthBudgets.filter(b => b.dept === '전체부서');
    if (totalBudgets.length > 0 && totalBudgets.some(b => (b.actual || 0) > 0)) {
       totalBudgets.forEach(b => {
         const cat = b.category || '미지정';
         map[cat] = (map[cat] || 0) + (b.actual || 0);
       });
    } else {
       // 2. Sum up all other depts from Excel
       const teamBudgets = monthBudgets.filter(b => b.dept !== '전체부서');
       if (teamBudgets.length > 0 && teamBudgets.some(b => (b.actual || 0) > 0)) {
         teamBudgets.forEach(b => {
           const cat = b.category || '미지정';
           map[cat] = (map[cat] || 0) + (b.actual || 0);
         });
       } else {
         // 3. Fallback to usage mapping
         filteredUsage.forEach(u => {
           const cat = u.category || '미지정';
           map[cat] = (map[cat] || 0) + u.amount;
         });
       }
    }
    
    return Object.entries(map)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredUsage, budget, selectedMonth]);

  // Chart Data: Actual vs Budget (Account subjects)
  const budgetVsActualData = useMemo(() => {
    const monthBudgets = budget.filter(b => b.month === selectedMonth);
    const map = {};
    
    // Find representative category set (from Budget sheet)
    const baseBudgets = monthBudgets.length > 0 ? 
      (monthBudgets.filter(b => b.dept === '전체부서').length > 0 ? 
        monthBudgets.filter(b => b.dept === '전체부서') : monthBudgets) 
      : [];

    baseBudgets.forEach(b => {
       if (!map[b.category]) map[b.category] = { category: b.category, budget: 0, actual: 0 };
       // If we're using all budgets, we need to sum. If "전체부서", it's already there.
       // For safety, let's just use the logic consistent with categories
    });

    // Re-use logic from categoryChartData for "actual"
    // and sum up "budget" from totalBudgets or sum depts
    const totalBudgets = monthBudgets.filter(b => b.dept === '전체부서');
    if (totalBudgets.length > 0) {
        totalBudgets.forEach(b => {
            if (!map[b.category]) map[b.category] = { category: b.category, budget: 0, actual: 0 };
            map[b.category].budget += (b.amount || 0);
            map[b.category].actual += (b.actual || 0);
        });
    } else {
        monthBudgets.filter(b => b.dept !== '전체부서').forEach(b => {
            if (!map[b.category]) map[b.category] = { category: b.category, budget: 0, actual: 0 };
            map[b.category].budget += (b.amount || 0);
            map[b.category].actual += (b.actual || 0);
        });
    }

    // Fallback for execution data if Excel actuals are zero
    if (Object.values(map).every(v => v.actual === 0)) {
      filteredUsage.forEach(u => {
        const cat = u.category || '미지정';
        if (!map[cat]) map[cat] = { category: cat, budget: 0, actual: 0 };
        map[cat].actual += u.amount;
      });
    }
    
    return Object.values(map).sort((a,b) => b.actual - a.actual);
  }, [filteredUsage, budget, selectedMonth]);

  // Handle Excel Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- UX Improvement: Confirm target month ---
    const confirmUpload = window.confirm(`현재 선택된 [ ${selectedMonth} ] 데이터로 업로드하시겠습니까?\n(파일 내역의 월과 관계없이 현재 선택된 월로 데이터가 생성됩니다.)`);
    if (!confirmUpload) {
      e.target.value = ''; // Reset input
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        
        const targetSheetName = wb.SheetNames.find(name => name.includes("CC 카드사용내역")) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert(`"${targetSheetName}" 시트에 데이터가 없습니다.`);
          return;
        }

        // Normalize data keys (trim spaces)
        const normalizedData = rawData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            newRow[String(key).trim()] = row[key];
          });
          return newRow;
        });

        const firstKeys = Object.keys(normalizedData[0]);
        console.log("Detected keys:", firstKeys);
        
        const aggregationMap = {};

        for (const row of normalizedData) {
          const cardCompany = row['카드사명'] || row['카드사'] || '';
          const cardNumber = row['카드번호'] || '';
          const dateVal = row['승인일자'] || row['이용일시'] || row['날짜'] || row['사용일자'] || row['거래일자'];
          
          // Use Math.abs up front and better parsing
          const rawAmount = row['승인금액'] || row['이용금액'] || row['금액'] || row['결제금액'] || 0;
          const amount = typeof rawAmount === 'number' ? rawAmount : parseInt(String(rawAmount).replace(/,/g, ''));
          
          const userName = row['구분'] || row['사용자'] || row['이름'] || row['카드명'] || '';
          const dept1 = row['조직1'] || row['부서1'] || '';
          const dept2 = row['조직2'] || row['부서2'] || '';

          if (dateVal && Math.abs(amount) > 0) {
            let cleanMonth = '';
            if (dateVal instanceof Date) {
              cleanMonth = dateVal.toISOString().substring(0, 7);
            } else {
              let s = String(dateVal);
              if (s.includes('.')) s = s.replace(/\./g, '-');
              cleanMonth = s.substring(0, 7);
            }
            
            if (cleanMonth.length === 7) {
              const aggKey = `${cleanMonth}_${cardNumber}_${userName}`;
              
              if (!aggregationMap[aggKey]) {
                aggregationMap[aggKey] = {
                  id: aggKey,
                  month: cleanMonth,
                  date: `${cleanMonth}-01`,
                  cardCompany,
                  cardNumber,
                  merchant: `${userName} 월 합계`,
                  amount: 0,
                  user: userName || '미지정',
                  dept1,
                  dept2,
                  category: '',
                  isSummary: true
                };
              }
              aggregationMap[aggKey].amount += amount;
            }
          }
        }

        const preparedData = Object.values(aggregationMap);

        // --- Enhanced: Parse "예산" sheet grid (Main Grid + Side Table for Other Travel) ---
        const budgetSheetName = wb.SheetNames.find(name => name.includes("예산"));
        if (budgetSheetName) {
          const bws = wb.Sheets[budgetSheetName];
          const bRawData = XLSX.utils.sheet_to_json(bws, { header: 1 });
          console.log(`Parsing budget matrix for [${selectedMonth}]...`);
          
          if (bRawData.length >= 2) {
            const categoryHeaders = bRawData[1] || [];
            const budgetMap = {};
            let lastTeamName = ''; 
            
            // 1. Scan Main Grid (Left side)
            for (let r = 2; r < bRawData.length; r++) {
              const row = bRawData[r];
              const rawTeamName = String(row[0] || '').trim();
              if (rawTeamName && !rawTeamName.includes('부서')) {
                lastTeamName = rawTeamName;
              }
              const currentTeam = lastTeamName;
              if (!currentTeam) continue;
              
              const dataType = String(row[1] || '').trim();
              const isBudget = dataType.includes('예산액');
              const isActual = dataType.includes('집행액');
              
              if (isBudget || isActual) {
                // Main grid categories (usually start from Column C/index 2 up to index 15/Column P)
                for (let c = 2; c < Math.min(row.length, 16); c++) {
                   const rawCategory = String(categoryHeaders[c] || '').trim();
                   if (!rawCategory || rawCategory === '항목') continue;
                   
                   const amountValue = parseInt(String(row[c] || 0).replace(/[^0-9-]/g, ''));
                   const key = `${currentTeam}_${rawCategory}`;
                   
                   if (!budgetMap[key]) {
                     budgetMap[key] = { month: selectedMonth, dept: currentTeam, category: rawCategory, amount: 0, actual: 0 };
                   }
                   if (isBudget) budgetMap[key].amount = amountValue;
                   if (isActual) budgetMap[key].actual = amountValue;
                }
              }
            }

            // 2. Scan Side Table (Right side for '여비교통비 - 기타')
            // Based on screenshot: Col Q (16) is Team, Col T (19) is '여비교통비-기타'
            const OTHER_TRAVEL_CAT = '여비교통비 - 기타';
            for (let r = 2; r < bRawData.length; r++) {
                const row = bRawData[r];
                const teamNameInSide = String(row[16] || '').trim();
                if (teamNameInSide && !teamNameInSide.includes('부서')) {
                    const travelActual = parseInt(String(row[19] || 0).replace(/[^0-9-]/g, ''));
                    if (travelActual > 0) {
                        const key = `${teamNameInSide}_${OTHER_TRAVEL_CAT}`;
                        if (!budgetMap[key]) {
                            budgetMap[key] = { month: selectedMonth, dept: teamNameInSide, category: OTHER_TRAVEL_CAT, amount: 0, actual: 0 };
                        }
                        budgetMap[key].actual += travelActual;
                    }
                }
            }

            const budgetData = Object.values(budgetMap).filter(b => b.amount > 0 || b.actual > 0);
            if (budgetData.length > 0 && onBulkUpdateBudget) {
              console.log(`Parsed ${budgetData.length} budget/execution records (Including Side-Table).`);
              await onBulkUpdateBudget(budgetData);
            }
          }
        }

        if (preparedData.length > 0) {
          await onBulkUpdateUsage(preparedData);
          alert(`업로드 완료!\n- 내역: ${preparedData.length}건 요약\n- 예산: 시트 분석 완료`);
        } else {
          alert('업로드할 유효한 데이터가 없습니다. 엑셀의 "승인일자"와 "승인금액" 컬럼명이 올바른지 확인해주세요.');
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
              <button 
                onClick={() => setActiveTab('analysis')} 
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                지출 분석
              </button>
              <button 
                onClick={() => setActiveTab('budget')} 
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                예산 관리
              </button>
              <button 
                onClick={() => setActiveTab('usage')} 
                className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === 'usage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                내역 조회
              </button>
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
                     <th className="px-6 py-4">카드 / 부서</th>
                     <th className="px-6 py-4">요약 내용 (사용자)</th>
                     <th className="px-6 py-4 text-right">금액</th>
                     <th className="px-6 py-4 text-center w-24">작업</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredUsage.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="py-20 text-center text-slate-400">
                         <div className="flex flex-col items-center gap-2">
                           <AlertCircle className="w-8 h-8 text-slate-200" />
                           <p className="font-bold">표시할 내역이 없습니다.</p>
                           <p className="text-xs">상단의 '내역 업로드' 버튼을 통해 엑셀 파일을 업로드해주세요.</p>
                         </div>
                       </td>
                     </tr>
                   ) : filteredUsage.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-indigo-500">
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
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-black">{item.user?.substring(0,1)}</div>
                           <div>
                              <div className="text-sm font-black text-slate-900">{item.merchant}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{item.user}</div>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-right font-mono font-black text-indigo-600 text-base">{formatKRW(item.amount)}</td>
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
                <div className="h-[350px] min-h-[350px] w-full bg-slate-50/50 rounded-3xl p-4">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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

              {/* Budget vs Actual (By Team) */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" /> 부서별 예산 대비 지출 현황
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Budget vs Actual by Department</p>
                </div>
                <div className="h-[350px] min-h-[350px] w-full bg-slate-50/50 rounded-3xl p-4">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart data={teamAnalysisData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} width={100} />
                      <Tooltip 
                        formatter={(value) => formatKRW(value)}
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                      <Bar dataKey="budget" name="예산" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="actual" name="실제 지출" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Account Subject Analysis */}
            <div className="space-y-6">
               <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 <Target className="w-5 h-5 text-indigo-500" /> 계정과목별 상세 분석
               </h3>
               <div className="h-[300px] w-full bg-white border border-slate-200 rounded-3xl p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActualData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(value) => formatKRW(value)}
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="budget" name="예산" fill="#f1f5f9" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="actual" name="지출" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
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

            {/* Monthly Subject Trend Analysis (New Feature) */}
            <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                       <Calendar className="w-5 h-5 text-indigo-500" /> 월간 계정과목 추이 분석
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Historical Trend Analysis per Category</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 px-2 uppercase">과목 선택</span>
                    <select 
                        value={selectedTrendSubject || ALL_SUBJECTS_IN_DATA[0]} 
                        onChange={(e) => setSelectedTrendSubject(e.target.value)}
                        className="bg-white border-0 text-xs font-black text-slate-700 px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                        {ALL_SUBJECTS_IN_DATA.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="h-[400px] w-full bg-slate-50/20 rounded-3xl p-6 border border-slate-100">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={categoryTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => (val/10000).toLocaleString() + "만"} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#94a3b8' }} />
                        <Tooltip 
                            formatter={(val) => formatKRW(val)}
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '20px', color: '#fff' }}
                        />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingBottom: '20px' }} />
                        <Line type="monotone" dataKey="budget" stroke="#e2e8f0" strokeWidth={3} dot={{ r: 4 }} name="예산" />
                        <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1' }} activeDot={{ r: 8 }} name="집행액" />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900">예산 및 집행 현황 (매트릭스)</h3>
                  <p className="text-sm text-slate-500">부서별 계정과목 예산 및 집행 상세 내역입니다. ({selectedMonth})</p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-end">
                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Budget</span>
                     <span className="text-lg font-black text-indigo-600">{formatKRW(monthlyStats.budget)}</span>
                  </div>
                  <div className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-end">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Execution</span>
                     <span className="text-lg font-black text-slate-900">{formatKRW(monthlyStats.total)}</span>
                  </div>
               </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="sticky left-0 z-20 bg-slate-50 p-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 min-w-[140px]">부서 / 팀</th>
                        {ALL_SUBJECTS_IN_DATA.map(cat => (
                          <th key={cat} className="p-6 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest min-w-[160px] border-r border-slate-200/50">
                            {cat}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DEPTS_IN_DATA.map(dept => (
                        <tr key={dept} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 p-6 text-xs font-black text-slate-900 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            {dept}
                          </td>
                          {ALL_SUBJECTS_IN_DATA.map(cat => {
                            const b = budget.find(bi => bi.month === selectedMonth && bi.dept === dept && bi.category === cat);
                            const actual = (b?.actual || 0);
                            const budgetAmt = (b?.amount || 0);
                            const utilization = budgetAmt > 0 ? (actual / budgetAmt) * 100 : 0;
                            
                            return (
                              <td key={cat} className="p-6 text-right border-r border-slate-100 last:border-0">
                                { (budgetAmt > 0 || actual > 0) ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-col">
                                      {budgetAmt > 0 && <span className="text-[10px] text-slate-400 font-bold mb-0.5">예산: {formatKRW(budgetAmt)}</span>}
                                      <span className="text-sm font-black text-slate-900">{formatKRW(actual)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-1000 ${utilization > 100 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-[10px] font-black uppercase flex justify-end gap-1">
                                      <span className={utilization > 100 ? 'text-rose-500' : 'text-slate-400'}>{utilization.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-200 text-xs">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            {budget.filter(b => b.month === selectedMonth).length === 0 && (
                 <div className="mt-8 py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-black text-slate-400">데이터가 없습니다.</p>
                    <p className="text-xs text-slate-400">업로드를 통해 예산 및 집행 내역을 확인하세요.</p>
                 </div>
            )}
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
