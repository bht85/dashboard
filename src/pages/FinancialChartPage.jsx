import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Calendar, Building2, Globe, ListFilter,
  DollarSign, Landmark
} from 'lucide-react';
import { formatKRW, formatUSD } from '../utils/formatters';

const FinancialChartPage = ({ dailyStatuses = {}, recordDate, exchangeRate = 1 }) => {
  const [selectedMonth, setSelectedMonth] = useState(recordDate.substring(0, 7)); // "2026-03"
  const [selectedEntity, setSelectedEntity] = useState('ALL'); // ALL, 컴포즈, 스마트
  const [currencyMode, setCurrencyMode] = useState('KRW'); // KRW, USD
  const [excludeInternal, setExcludeInternal] = useState(true); // 내부 거래 제외 기본값 true

  // Available months from data
  const availableMonths = useMemo(() => {
    const months = new Set(Object.keys(dailyStatuses).map(d => d.substring(0, 7)));
    // Ensure the current selection date's month is always available
    months.add(recordDate.substring(0, 7));
    return Array.from(months).sort().reverse();
  }, [dailyStatuses, recordDate]);

  // Data Transformation for Recharts
  const chartData = useMemo(() => {
    return Object.keys(dailyStatuses)
      .filter(date => date.startsWith(selectedMonth))
      .sort()
      .map(date => {
        const status = dailyStatuses[date];
        const details = status.details || [];
        
        // Filter by entity if needed
        const filteredDetails = selectedEntity === 'ALL' 
          ? details 
          : details.filter(d => d.entity.includes(selectedEntity));

        // Calculate totals for this day based on currency mode
        const isUSDMode = currencyMode === 'USD';
        
        const dailyTotal = filteredDetails.reduce((s, i) => {
          const isUSD = i.currency === 'USD' || i.isUSD;
          if (isUSDMode) {
             return s + (isUSD ? Number(i.totalBalance || 0) : Number(i.totalBalance || 0) / exchangeRate);
          } else {
             return s + (isUSD ? Number(i.totalBalance || 0) * exchangeRate : Number(i.totalBalance || 0));
          }
        }, 0);

        const dailyInflow = filteredDetails.reduce((s, i) => {
          // 내부 거래 제외 로직 고도화
          // 1. 전체 법인(ALL) 보기: 모든 내부 거래(법인 간 이동 포함) 제외
          // 2. 특정 법인(컴포즈 or 스마트) 보기: 해당 법인 '내부'의 계좌 이동만 제외 (법인 간 입금은 외부 유입으로 처리)
          if (excludeInternal) {
            if (selectedEntity === 'ALL') {
              if (i.entity.includes('스마트') || i.group === '내부' || i.nickname.includes('내부')) return s;
            } else {
              // 진짜 '내부'라고 명시되거나 '환전' 내역인 경우 모두 제외 (자산의 총합에는 변동이 없는 내부 이동이므로)
              if (i.group === '내부' || (i.nickname && (i.nickname.includes('내부') || i.nickname.includes('환전') || i.nickname.includes('자동이체')))) return s;
            }
          }

          const isUSD = i.currency === 'USD' || i.isUSD;
          if (isUSDMode) {
             return s + (isUSD ? Number(i.deposits || 0) : Number(i.deposits || 0) / exchangeRate);
          } else {
             return s + (isUSD ? Number(i.deposits || 0) * exchangeRate : Number(i.deposits || 0));
          }
        }, 0);

        const dailyOutflow = filteredDetails.reduce((s, i) => {
          if (excludeInternal) {
            if (selectedEntity === 'ALL') {
              if (i.group === '내부' || i.nickname.includes('내부') || i.nickname.includes('자동이체')) return s;
            } else {
              // '내부' 계좌이동 및 '환전' 내역 제외
              if (i.group === '내부' || (i.nickname && (i.nickname.includes('내부') || i.nickname.includes('환전') || i.nickname.includes('자동이체')))) return s;
            }
          }

          const isUSD = i.currency === 'USD' || i.isUSD;
          if (isUSDMode) {
             return s + (isUSD ? Number(i.withdrawals || 0) : Number(i.withdrawals || 0) / exchangeRate);
          } else {
             return s + (isUSD ? Number(i.withdrawals || 0) * exchangeRate : Number(i.withdrawals || 0));
          }
        }, 0);

        return {
          name: date.split('-')[2] + '일',
          fullDate: date,
          balance: Math.floor(dailyTotal),
          inflow: Math.floor(dailyInflow),
          outflow: Math.floor(dailyOutflow),
          net: Math.floor(dailyInflow - dailyOutflow)
        };
      });
  }, [dailyStatuses, selectedMonth, selectedEntity, currencyMode, exchangeRate, excludeInternal]);

  // Calculate Beginning Balance (Opening balance of the month)
  const beginningBalance = useMemo(() => {
    // 1. Find the last recorded date before the selected month
    const previousDates = Object.keys(dailyStatuses)
      .filter(date => date < selectedMonth)
      .sort();
    
    if (previousDates.length > 0) {
      const lastDate = previousDates[previousDates.length - 1];
      const status = dailyStatuses[lastDate];
      const details = status.details || [];
      
      const filteredDetails = selectedEntity === 'ALL' 
          ? details 
          : details.filter(d => d.entity.includes(selectedEntity));
      
      const isUSDMode = currencyMode === 'USD';
      return filteredDetails.reduce((s, i) => {
          const isUSD = i.currency === 'USD' || i.isUSD;
          const balance = Number(i.totalBalance || 0);
          if (isUSDMode) {
             return s + (isUSD ? balance : balance / exchangeRate);
          } else {
             return s + (isUSD ? balance * exchangeRate : balance);
          }
      }, 0);
    }
    
    // 2. Fallback: if no previous data, use opening balance of first day in chartData
    if (chartData.length > 0) {
      return chartData[0].balance - chartData[0].net;
    }
    
    return 0;
  }, [dailyStatuses, selectedMonth, selectedEntity, currencyMode, exchangeRate, chartData]);

  // Summary Metrics for the selected period
  const metrics = useMemo(() => {
    const totalInflow = chartData.reduce((s, d) => s + d.inflow, 0);
    const totalOutflow = chartData.reduce((s, d) => s + d.outflow, 0);
    const startBalance = beginningBalance;
    const endBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : startBalance;
    const growth = startBalance !== 0 ? ((endBalance - startBalance) / startBalance) * 100 : 0;

    return {
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
      growth: growth.toFixed(1),
      beginning: startBalance,
      current: endBalance
    };
  }, [chartData, beginningBalance]);

  // Aggregate data by month for the long-term trend
  const monthlyTrendData = useMemo(() => {
    const monthlyStats = {};
    
    Object.keys(dailyStatuses).sort().forEach(date => {
      const monthStr = date.substring(0, 7);
      const status = dailyStatuses[date];
      const details = status.details || [];
      
      const filteredDetails = selectedEntity === 'ALL' 
        ? details 
        : details.filter(d => d.entity.includes(selectedEntity));
      
      const isUSDMode = currencyMode === 'USD';
      const dayBalance = filteredDetails.reduce((s, i) => {
        const isUSD = i.currency === 'USD' || i.isUSD;
        if (isUSDMode) {
           return s + (isUSD ? Number(i.totalBalance || 0) : Number(i.totalBalance || 0) / exchangeRate);
        } else {
           return s + (isUSD ? Number(i.totalBalance || 0) * exchangeRate : Number(i.totalBalance || 0));
        }
      }, 0);

      const dayInflow = filteredDetails.reduce((s, i) => {
        if (excludeInternal) {
          if (selectedEntity === 'ALL') {
            if (i.entity.includes('스마트') || i.group === '내부' || i.nickname.includes('내부')) return s;
          } else {
            if (i.group === '내부' || (i.nickname && (i.nickname.includes('내부') || i.nickname.includes('환전')))) return s;
          }
        }
        const isUSD = i.currency === 'USD' || i.isUSD;
        if (isUSDMode) return s + (isUSD ? Number(i.deposits || 0) : Number(i.deposits || 0) / exchangeRate);
        else return s + (isUSD ? Number(i.deposits || 0) * exchangeRate : Number(i.deposits || 0));
      }, 0);

      const dayOutflow = filteredDetails.reduce((s, i) => {
        if (excludeInternal) {
          if (selectedEntity === 'ALL') {
            if (i.group === '내부' || i.nickname.includes('내부')) return s;
          } else {
            if (i.group === '내부' || (i.nickname && (i.nickname.includes('내부') || i.nickname.includes('환전')))) return s;
          }
        }
        const isUSD = i.currency === 'USD' || i.isUSD;
        if (isUSDMode) return s + (isUSD ? Number(i.withdrawals || 0) : Number(i.withdrawals || 0) / exchangeRate);
        else return s + (isUSD ? Number(i.withdrawals || 0) * exchangeRate : Number(i.withdrawals || 0));
      }, 0);

      if (!monthlyStats[monthStr]) {
        monthlyStats[monthStr] = { month: monthStr, balance: 0, inflow: 0, outflow: 0 };
      }
      
      // Update with the latest balance of the month
      monthlyStats[monthStr].balance = Math.floor(dayBalance);
      // Accumulate inflow/outflow
      monthlyStats[monthStr].inflow += Math.floor(dayInflow);
      monthlyStats[monthStr].outflow += Math.floor(dayOutflow);
    });

    return Object.values(monthlyStats).map(d => ({
        ...d,
        name: `${d.month.split('-')[0].substring(2)}.${d.month.split('-')[1]}`,
        fullName: `${d.month.split('-')[0]}년 ${d.month.split('-')[1]}월`
    }));
  }, [dailyStatuses, selectedEntity, currencyMode, exchangeRate, excludeInternal]);

  const formatValue = (val) => currencyMode === 'KRW' ? formatKRW(val) : formatUSD(val);

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" /> 자금 분석 대시보드
          </h2>
          <p className="text-sm text-slate-500 font-medium">영업 및 재무 활동에 따른 현금 흐름 추이를 시각화합니다.</p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setExcludeInternal(!excludeInternal)}
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center gap-2 ${excludeInternal ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
          >
            <ListFilter className="w-3 h-3" />
            내부 거래 제외: {excludeInternal ? 'ON' : 'OFF'}
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setCurrencyMode('KRW')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currencyMode === 'KRW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>KRW</button>
             <button onClick={() => setCurrencyMode('USD')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currencyMode === 'USD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>USD</button>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            {availableMonths.map(m => <option key={m} value={m}>{m.replace('-', '년 ')}월</option>)}
          </select>
          <select 
            value={selectedEntity} 
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">전체 법인</option>
            <option value="컴포즈">컴포즈커피</option>
            <option value="스마트">스마트팩토리</option>
          </select>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <StatCard 
          title="월 초 잔액" 
          value={formatValue(metrics.beginning)} 
          icon={<Landmark className="w-4 h-4" />} 
          color="slate" 
          subtitle="해당 월 기초 시재"
        />
        <StatCard 
          title="총 입금액" 
          value={formatValue(metrics.inflow)} 
          icon={<ArrowUpRight className="w-4 h-4" />} 
          color="emerald" 
          subtitle="기간 내 누적 수입"
        />
        <StatCard 
          title="총 출금액" 
          value={formatValue(metrics.outflow)} 
          icon={<ArrowDownRight className="w-4 h-4" />} 
          color="rose" 
          subtitle="기간 내 누적 지출"
        />
        <StatCard 
          title="현 잔액" 
          value={formatValue(metrics.current)} 
          icon={<DollarSign className="w-4 h-4" />} 
          color="blue" 
          subtitle="해당 월 기말 시재"
        />
        <StatCard 
          title="순 증감액" 
          value={formatValue(metrics.net)} 
          icon={<Activity className="w-4 h-4" />} 
          color="indigo" 
          subtitle="자본 회전 결과"
          trend={metrics.net >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="자산 변동률" 
          value={`${metrics.growth}%`} 
          icon={<TrendingUp className="w-4 h-4" />} 
          color="amber" 
          subtitle="기초 대비 기말 변동"
          trend={parseFloat(metrics.growth) >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Main Balance Trend Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-500" /> 일별 자산 규모 추이 ({selectedMonth.replace('-', '년 ')})
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Daily balance trend for selected period</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip currencyMode={currencyMode} />} />
                <Area type="monotone" dataKey="balance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> 일별 입출금 현황 ({selectedMonth.replace('-', '년 ')})
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Daily inflow and outflow comparison</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip currencyMode={currencyMode} isComparison />} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase'}} />
                <Bar dataKey="inflow" name="입금" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="outflow" name="출금" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NEW: Monthly Long-term Trend Chart */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> 월별 자산 규모 추이 (Monthly Overview)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Long-term monthly balance and cashflow aggregated trend</p>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#475569'}} dy={10} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                            <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border-none">
                                <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 border-b border-white/10 pb-2">{data.fullName}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center gap-8">
                                        <span className="text-[10px] font-bold text-slate-400">마감 잔액:</span>
                                        <span className="text-xs font-black text-white">{formatValue(data.balance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-8">
                                        <span className="text-[10px] font-bold text-slate-400">월 입금액:</span>
                                        <span className="text-xs font-black text-emerald-400">{formatValue(data.inflow)}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-8">
                                        <span className="text-[10px] font-bold text-slate-400">월 출금액:</span>
                                        <span className="text-xs font-black text-rose-400">{formatValue(data.outflow)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                }} 
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: 30, fontSize: 10, fontWeight: 800, textTransform: 'uppercase'}} />
              <Bar dataKey="balance" name="마감 잔액" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle, trend }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:translate-y-[-4px] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-2xl ${colors[color]}`}>
          {icon}
        </div>
        {trend && (
           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {trend === 'up' ? 'Increase' : 'Decrease'}
           </span>
        )}
      </div>
      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
      <div className="text-sm font-black text-slate-900 tracking-tight mb-1 truncate" title={value}>{value}</div>
      <p className="text-[9px] text-slate-400 font-bold italic truncate">{subtitle}</p>
    </div>
  );
};

const CustomTooltip = ({ active, payload, currencyMode, isComparison }) => {
  if (active && payload && payload.length) {
    const format = (v) => currencyMode === 'KRW' ? formatKRW(v) : formatUSD(v);
    
    return (
      <div className="bg-slate-900 border-none rounded-2xl p-4 shadow-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b border-slate-700 pb-2">{payload[0].payload.fullDate}</p>
        <div className="space-y-1.5">
          {payload.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center gap-6">
              <span className="text-[10px] font-bold text-slate-300">{p.name === p.dataKey ? '잔액' : p.name}:</span>
              <span className="text-xs font-black text-white tabular-nums" style={{color: p.color || '#fff'}}>
                {format(p.value)}
              </span>
            </div>
          ))}
          {!isComparison && (
             <>
               <div className="flex justify-between items-center gap-6">
                 <span className="text-[10px] font-bold text-slate-300">입금액:</span>
                 <span className="text-xs font-black text-emerald-400 tabular-nums">{format(payload[0].payload.inflow)}</span>
               </div>
               <div className="flex justify-between items-center gap-6">
                 <span className="text-[10px] font-bold text-slate-300">출금액:</span>
                 <span className="text-xs font-black text-rose-400 tabular-nums">{format(payload[0].payload.outflow)}</span>
               </div>
             </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default FinancialChartPage;
