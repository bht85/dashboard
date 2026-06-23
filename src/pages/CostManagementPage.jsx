import React, { useState, useMemo, useEffect } from 'react';
import {
  Package, Warehouse, ArrowDownToLine, ClipboardList, Settings2, ChevronRight,
  Plus, Trash2, Check, X, AlertTriangle, TrendingUp, TrendingDown,
  Coffee, Factory, Box, ArrowRight, Edit3, Save, RotateCcw, Eye,
  ChevronDown, ChevronUp, Calendar, DollarSign, Scale, Layers,
  BarChart3, PieChart, Upload
} from 'lucide-react';
import { calculateFIFO, calculateMonthlyInventory, formatCostKRW, formatKG, formatMillionKRW } from '../utils/fifoCalculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

// ─── 상수 ───────────────────────────────────────────
const GREEN_BEAN_TYPES = ['브라질', '브라질S', '콜롬비아', '에티오피아', '콜롬비아 디카페인'];
const PRODUCTS = ['비터홀릭', '디카페인'];
const SILO_TYPES = {
  greenSilo: GREEN_BEAN_TYPES.map(b => `생두사일로-${b}`),
  roastedSilo: GREEN_BEAN_TYPES.map(b => `원두사일로-${b}`),
};
const CATEGORIES = [
  { key: 'greenBean', label: '생두', items: GREEN_BEAN_TYPES, icon: Coffee, color: 'amber' },
  { key: 'greenSilo', label: '생두 사일로', items: SILO_TYPES.greenSilo, icon: Warehouse, color: 'orange' },
  { key: 'roastedSilo', label: '원두 사일로', items: SILO_TYPES.roastedSilo, icon: Factory, color: 'yellow' },
  { key: 'product', label: '제품', items: PRODUCTS, icon: Box, color: 'emerald' },
];
const TABS = [
  { id: 'summary', label: '수불현황', icon: ClipboardList },
  { id: 'receipt', label: '입고관리', icon: ArrowDownToLine },
  { id: 'inventory', label: '재고입력', icon: Package },
  { id: 'fifoBoard', label: 'FIFO 보드', icon: Layers },
  { id: 'settings', label: '설정', icon: Settings2 },
];

// ─── 메인 컴포넌트 ────────────────────────────────────
const CostManagementPage = ({
  rawBeanContracts = [],
  inventoryReceipts = [],
  monthlyInventory = [],
  costSettings = {},
  fxSchedule = [],
  exchangeRate = 1520,
  onUpdateReceipt,
  onDeleteReceipt,
  onBulkAddReceipt,
  onUpdateMonthlyInventory,
  onDeleteMonthlyInventory,
  onUpdateCostSettings,
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState(() => new Date().getMonth() + 1);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleApplyMonth = () => {
    setSelectedMonth(`${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`);
  };

  // ─── 탭 1: 수불현황 ─────────────────────────────────
  const SummaryTab = () => {
    const monthReceipts = inventoryReceipts.filter(r => r.receiptMonth === selectedMonth);
    const monthInv = monthlyInventory.filter(m => m.month === selectedMonth);
    
    // 전월 구하기
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const prevMonthInvConfirmed = monthlyInventory.filter(mi => mi.month === prevMonth && mi.status === 'confirmed');
    const prevMonthInvDraft = monthlyInventory.filter(mi => mi.month === prevMonth && mi.status === 'draft');
    const prevMonthInv = prevMonthInvConfirmed.length > 0 ? prevMonthInvConfirmed : prevMonthInvDraft;
    const isPrevConfirmed = prevMonthInvConfirmed.length > 0;
    const hasPrevDraft = prevMonthInvDraft.length > 0;

    // 생두별 수불현황 계산
    const summaryData = GREEN_BEAN_TYPES.map(beanType => {
      const prevData = prevMonthInv.find(p => p.category === 'greenBean' && p.itemName === beanType);
      const currData = monthInv.find(c => c.category === 'greenBean' && c.itemName === beanType);
      const beanReceipts = monthReceipts.filter(r => r.origin === beanType);

      const openingQty = prevData ? (prevData.closingQty || 0) : 0;
      const openingCost = prevData ? (prevData.closingCostKRW || 0) : 0;
      const purchaseQty = beanReceipts.reduce((s, r) => s + (r.quantity || 0), 0);
      const purchaseCost = beanReceipts.reduce((s, r) => s + (r.totalCostKRW || 0), 0);
      const closingQty = currData ? (currData.closingQty || 0) : 0;
      const closingCost = currData ? (currData.closingCostKRW || 0) : 0;
      const consumedQty = Math.max(0, openingQty + purchaseQty - closingQty);
      const consumedCost = currData ? (currData.consumedCostKRW || 0) : (openingCost + purchaseCost - closingCost);
      const avgUnitCost = consumedQty > 0 ? consumedCost / consumedQty : 0;

      return {
        itemName: beanType,
        openingQty, openingCost,
        purchaseQty, purchaseCost,
        consumedQty, consumedCost,
        closingQty, closingCost,
        avgUnitCost,
      };
    });

    // 소계 계산
    const totals = summaryData.reduce((acc, d) => ({
      openingQty: acc.openingQty + d.openingQty,
      openingCost: acc.openingCost + d.openingCost,
      purchaseQty: acc.purchaseQty + d.purchaseQty,
      purchaseCost: acc.purchaseCost + d.purchaseCost,
      consumedQty: acc.consumedQty + d.consumedQty,
      consumedCost: acc.consumedCost + d.consumedCost,
      closingQty: acc.closingQty + d.closingQty,
      closingCost: acc.closingCost + d.closingCost,
    }), { openingQty: 0, openingCost: 0, purchaseQty: 0, purchaseCost: 0, consumedQty: 0, consumedCost: 0, closingQty: 0, closingCost: 0 });
    totals.avgUnitCost = totals.consumedQty > 0 ? totals.consumedCost / totals.consumedQty : 0;

    // 사일로/제품 수불현황
    const otherCategories = CATEGORIES.filter(c => c.key !== 'greenBean');
    const otherSummary = otherCategories.map(cat => {
      const items = cat.items.map(itemName => {
        const prev = prevMonthInv.find(p => p.category === cat.key && p.itemName === itemName);
        const curr = monthInv.find(c => c.category === cat.key && c.itemName === itemName);
        return {
          itemName,
          openingQty: prev?.closingQty || 0,
          closingQty: curr?.closingQty || 0,
          consumedQty: Math.max(0, (prev?.closingQty || 0) - (curr?.closingQty || 0)),
        };
      });
      return { ...cat, items };
    });

    // 월별 추이 차트 데이터
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const trendData = last6Months.map(month => {
      const mInv = monthlyInventory.filter(mi => mi.month === month && mi.category === 'greenBean' && mi.status === 'confirmed');
      return {
        month: month.substring(5) + '월',
        투입원가: mInv.reduce((s, mi) => s + (mi.consumedCostKRW || 0), 0) / 1000000,
        잔여재고: mInv.reduce((s, mi) => s + (mi.closingCostKRW || 0), 0) / 1000000,
      };
    });

    const isConfirmed = monthInv.length > 0 && monthInv.every(m => m.status === 'confirmed');
    const isDraft = monthInv.length > 0 && monthInv.some(m => m.status === 'draft');

    return (
      <div className="space-y-6">
        {/* 상태 안내 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">데이터 상태:</span>
            {isConfirmed ? (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> 확정 완료
              </span>
            ) : isDraft ? (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <Save className="w-3 h-3" /> 임시저장 (작성중)
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 재고 미입력
              </span>
            )}
          </div>
          {!isConfirmed && (
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
              * 재고입력 탭에서 월말 재고를 입력하고 FIFO 계산 후 확정해주세요.
            </span>
          )}
        </div>

        {!isPrevConfirmed && (hasPrevDraft || prevMonthInv.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-amber-800">
                이전 월({prevMonth})의 재고가 확정되지 않아, 임시저장된 수량이 기초재고로 반영되었습니다. 정확한 원가 계산을 위해 이전 월 재고를 먼저 확정해주세요.
              </span>
            </div>
          </div>
        )}

        {/* 핵심 KPI 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '기초재고', value: formatKG(totals.openingQty), sub: formatCostKRW(totals.openingCost), icon: Package, gradient: 'from-slate-500 to-slate-700' },
            { label: '당월 매입', value: formatKG(totals.purchaseQty), sub: formatCostKRW(totals.purchaseCost), icon: ArrowDownToLine, gradient: 'from-blue-500 to-blue-700' },
            { label: '투입(소진)', value: formatKG(totals.consumedQty), sub: formatCostKRW(totals.consumedCost), icon: TrendingUp, gradient: 'from-amber-500 to-amber-700' },
            { label: '잔여재고', value: formatKG(totals.closingQty), sub: formatCostKRW(totals.closingCost), icon: Warehouse, gradient: 'from-emerald-500 to-emerald-700' },
          ].map((card, i) => (
            <div key={i} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{card.label}</span>
                <card.icon className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-xl font-black">{card.value}</p>
              <p className="text-sm font-medium opacity-80 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* 수불현황 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <Coffee className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-800">생두 수불현황</h3>
            <span className="text-xs text-slate-400 font-medium ml-auto">단위: KG / KRW</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left font-black text-slate-600 border-b-2 border-slate-200" rowSpan={2}>항목</th>
                  <th className="px-3 py-2 text-center font-black text-slate-500 border-b border-slate-200" colSpan={2}>기초재고</th>
                  <th className="px-3 py-2 text-center font-black text-blue-500 border-b border-slate-200" colSpan={2}>매입</th>
                  <th className="px-3 py-2 text-center font-black text-amber-600 border-b border-slate-200" colSpan={2}>투입</th>
                  <th className="px-3 py-2 text-center font-black text-emerald-600 border-b border-slate-200" colSpan={2}>잔여재고</th>
                  <th className="px-3 py-2 text-center font-black text-purple-600 border-b-2 border-slate-200" rowSpan={2}>평균단가<br/><span className="font-medium text-slate-400">(원/kg)</span></th>
                </tr>
                <tr className="bg-slate-50/50">
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">수량</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">금액</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">수량</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">금액</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">수량</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">금액</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">수량</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-400 border-b-2 border-slate-200">금액</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      {row.itemName}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600">{row.openingQty > 0 ? row.openingQty.toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">{row.openingCost > 0 ? formatMillionKRW(row.openingCost) : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-600 font-bold">{row.purchaseQty > 0 ? row.purchaseQty.toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-500">{row.purchaseCost > 0 ? formatMillionKRW(row.purchaseCost) : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-amber-600 font-bold">{row.consumedQty > 0 ? row.consumedQty.toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-amber-500">{row.consumedCost > 0 ? formatMillionKRW(row.consumedCost) : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-600 font-bold">{row.closingQty > 0 ? row.closingQty.toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-500">{row.closingCost > 0 ? formatMillionKRW(row.closingCost) : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-purple-600 font-bold">{row.avgUnitCost > 0 ? Math.round(row.avgUnitCost).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {/* 소계 행 */}
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-4 py-3">생두 소계</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.openingQty > 0 ? totals.openingQty.toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.openingCost > 0 ? formatMillionKRW(totals.openingCost) : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.purchaseQty > 0 ? totals.purchaseQty.toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.purchaseCost > 0 ? formatMillionKRW(totals.purchaseCost) : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.consumedQty > 0 ? totals.consumedQty.toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.consumedCost > 0 ? formatMillionKRW(totals.consumedCost) : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.closingQty > 0 ? totals.closingQty.toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.closingCost > 0 ? formatMillionKRW(totals.closingCost) : '-'}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.avgUnitCost > 0 ? Math.round(totals.avgUnitCost).toLocaleString() : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 사일로 / 제품 재고 */}
        {otherSummary.map((cat, ci) => (
          <div key={ci} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <cat.icon className={`w-5 h-5 text-${cat.color}-600`} />
              <h3 className="text-sm font-black text-slate-800">{cat.label} 재고현황</h3>
              <span className="text-xs text-slate-400 font-medium ml-auto">단위: KG</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left font-black text-slate-600">항목</th>
                    <th className="px-3 py-3 text-right font-black text-slate-500">기초재고</th>
                    <th className="px-3 py-3 text-right font-black text-amber-600">투입(소진)</th>
                    <th className="px-3 py-3 text-right font-black text-emerald-600">잔여재고</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item, ii) => (
                    <tr key={ii} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700">{item.itemName || item}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">{(item.openingQty || 0) > 0 ? item.openingQty.toLocaleString() : '-'}</td>
                      <td className="px-3 py-3 text-right font-mono text-amber-600">{(item.consumedQty || 0) > 0 ? item.consumedQty.toLocaleString() : '-'}</td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-600 font-bold">{(item.closingQty || 0) > 0 ? item.closingQty.toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* 월별 추이 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            생두 원가 월별 추이 <span className="text-xs font-medium text-slate-400">(백만원)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v) => `${v.toFixed(1)}M`}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="투입원가" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="잔여재고" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // ─── 탭 2: 입고관리 ─────────────────────────────────
  const ReceiptTab = () => {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [excelPreview, setExcelPreview] = useState([]);
    const fileInputRef = React.useRef(null);
    const [form, setForm] = useState({
      contractId: '', origin: '', supplier: '', contractNo: '',
      receiptDate: '', quantity: '', unitCostUSD: '', exchangeRate: exchangeRate, containerNo: ''
    });

    // 필터링 상태 (조회월, 산지)
    const [receiptFilterMonth, setReceiptFilterMonth] = useState(selectedMonth);
    const [receiptFilterOrigin, setReceiptFilterOrigin] = useState('ALL');

    useEffect(() => {
      setReceiptFilterMonth(selectedMonth);
    }, [selectedMonth]);

    // 사용 가능한 월 리스트 추출
    const availableMonths = useMemo(() => {
      const months = new Set(inventoryReceipts.map(r => r.receiptMonth).filter(Boolean));
      months.add(selectedMonth);
      return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [inventoryReceipts, selectedMonth]);

    // 계약에서 불러오기 기능
    const loadFromContract = (contract) => {
      // 계약의 단가 계산 (시장가 연동 vs 고정단가)
      let unitPrice = 0;
      if (contract.isFixedPrice) {
        unitPrice = contract.fixedPrice || 0;
      } else {
        unitPrice = ((contract.index || 0) + (contract.differential || 0)) * 22.046 / 1000;
      }

      // 외화 지급 스케줄에서 해당 계약의 환율 찾기
      const relatedFx = fxSchedule.find(
        fx => fx.desc && fx.desc.includes(contract.contractNo) && fx.status === '송금 완료(집행)'
      );

      setForm({
        contractId: contract.id,
        origin: contract.origin || '',
        supplier: contract.supplier || '',
        contractNo: contract.contractNo || '',
        containerNo: '',
        receiptDate: new Date().toLocaleDateString('en-CA'),
        quantity: contract.remainingQty !== undefined ? contract.remainingQty : (contract.weight || ''),
        unitCostUSD: unitPrice.toFixed(4),
        exchangeRate: relatedFx?.exchangeRate || contract.planExchangeRate || exchangeRate,
      });
      setShowForm(true);
      setEditId(null);
    };

    const handleSave = async () => {
      if (!form.origin || !form.receiptDate || !form.quantity) {
        alert('산지, 입고일, 수량은 필수 입력입니다.');
        return;
      }
      const qty = parseFloat(form.quantity);
      const unitUSD = parseFloat(form.unitCostUSD) || 0;
      const rate = parseFloat(form.exchangeRate) || exchangeRate;
      const unitKRW = unitUSD * rate;

      const receiptMonth = form.receiptDate.substring(0, 7);

      // lotNumber: 해당 월 내 입고 순번
      const existingMonthReceipts = inventoryReceipts.filter(r => r.receiptMonth === receiptMonth);
      const lotNumber = editId
        ? (inventoryReceipts.find(r => r.id === editId)?.lotNumber || existingMonthReceipts.length + 1)
        : existingMonthReceipts.length + 1;

      const data = {
        id: editId || Date.now().toString(),
        contractId: form.contractId || '',
        origin: form.origin,
        supplier: form.supplier,
        contractNo: form.contractNo,
        containerNo: form.containerNo || '',
        receiptDate: form.receiptDate,
        receiptMonth,
        quantity: qty,
        unitCostUSD: unitUSD,
        unitCostKRW: unitKRW,
        totalCostUSD: qty * unitUSD,
        totalCostKRW: qty * unitKRW,
        exchangeRate: rate,
        remainingQty: qty,
        status: 'active',
        lotNumber,
        createdAt: editId ? (inventoryReceipts.find(r => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      };

      await onUpdateReceipt(data);
      setShowForm(false);
      setForm({ contractId: '', origin: '', supplier: '', contractNo: '', containerNo: '', receiptDate: '', quantity: '', unitCostUSD: '', exchangeRate: exchangeRate });
      setEditId(null);
    };

    const handleEdit = (receipt) => {
      setForm({
        contractId: receipt.contractId || '',
        origin: receipt.origin || '',
        supplier: receipt.supplier || '',
        contractNo: receipt.contractNo || '',
        containerNo: receipt.containerNo || '',
        receiptDate: receipt.receiptDate || '',
        quantity: receipt.quantity || '',
        unitCostUSD: receipt.unitCostUSD || '',
        exchangeRate: receipt.exchangeRate || exchangeRate,
      });
      setEditId(receipt.id);
      setShowForm(true);
    };

    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const parsed = [];
          
          const mapOrigin = (val) => {
            if (!val) return '';
            const upper = String(val).toUpperCase().replace(/\s+/g, '');
            if (upper.includes('BRA(S)') || upper === '브라질S') return '브라질S';
            if (upper.includes('BRA') || upper.includes('브라질')) return '브라질';
            if (upper.includes('DECAF') || upper.includes('디카페인')) return '콜롬비아 디카페인';
            if (upper.includes('COL') || upper.includes('콜롬비아')) return '콜롬비아';
            if (upper.includes('ETH') || upper.includes('에티오피아')) return '에티오피아';
            return String(val);
          };

          const safeNum = (val) => {
            return (val === undefined || val === null || isNaN(val)) ? 0 : Number(val);
          };

          const safeStr = (val) => {
            if (val === undefined || val === null) return '';
            const str = String(val).trim();
            return str === 'undefined' || str === 'null' ? '' : str;
          };

          wb.SheetNames.forEach(wsname => {
            const ws = wb.Sheets[wsname];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            let headerIdx = -1;
            let headers = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i] || [];
              if (row.some(c => typeof c === 'string' && (c.includes('Origin') || c.includes('산지') || c.includes('품목코드')))) {
                headerIdx = i;
                headers = row.map(c => typeof c === 'string' ? c.replace(/\s+/g, '').toLowerCase() : String(c || ''));
                break;
              }
            }

            if (headerIdx === -1) return; // No header found in this sheet

            for (let i = headerIdx + 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || !row.length) continue;
              
              const findValue = (keywords) => {
                const colIdx = headers.findIndex(h => keywords.some(kw => h.includes(kw.toLowerCase())));
                return colIdx !== -1 ? (row[colIdx] ?? '') : '';
              };

              const rawOrigin = findValue(['산지', '품목코드', 'origin']);
              const origin = mapOrigin(rawOrigin);
              
              let rawDate = findValue(['통관일']);
              if (!rawDate || String(rawDate).trim() === '-') {
                rawDate = findValue(['팩토리입고일', '입고일']);
              }
              let receiptDate = '';
              if (typeof rawDate === 'number') {
                const date = new Date((rawDate - 25569) * 86400 * 1000);
                const y = date.getUTCFullYear();
                const m = String(date.getUTCMonth() + 1).padStart(2, '0');
                const d = String(date.getUTCDate()).padStart(2, '0');
                receiptDate = `${y}-${m}-${d}`;
              } else if (typeof rawDate === 'string') {
                const parts = rawDate.replace(/\./g, '/').replace(/-/g, '/').split('/');
                if (parts.length >= 3) {
                  const y = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
                  const m = parts[1].padStart(2, '0');
                  const d = parts[2].padStart(2, '0');
                  receiptDate = `${y}-${m}-${d}`;
                } else {
                  receiptDate = rawDate.replace(/\//g, '-');
                }
              }

              let quantity = findValue(['수량', '구매수량', 'kg']);
              if (typeof quantity === 'string') quantity = quantity.replace(/,/g, '');
              quantity = parseFloat(quantity) || 0;

              const containerNo = findValue(['컨테이너', 'b/lno']);
              
              let unitCostUSD = findValue(['구매단가', '단가($)', '단가']);
              if (typeof unitCostUSD === 'string') unitCostUSD = unitCostUSD.replace(/,/g, '');
              unitCostUSD = parseFloat(unitCostUSD) || 0;

              let exRate = findValue(['적용환율', '환율']);
              if (typeof exRate === 'string') exRate = exRate.replace(/,/g, '');
              exRate = parseFloat(exRate) || parseFloat(exchangeRate) || 0;

              const supplier = findValue(['공급업체']);
              const contractNo = findValue(['계약번호', 'lot']);

              let unitKRW = findValue(['kg단가', '단가(원)']);
              if (typeof unitKRW === 'string') unitKRW = unitKRW.replace(/,/g, '');
              unitKRW = parseFloat(unitKRW) || (unitCostUSD * exRate);

              let totalCostKRW = findValue(['지급금액', '총금액']);
              if (typeof totalCostKRW === 'string') totalCostKRW = totalCostKRW.replace(/,/g, '');
              totalCostKRW = parseFloat(totalCostKRW) || (quantity * unitKRW);

              if (origin && receiptDate && receiptDate.length >= 8 && quantity > 0) {
                parsed.push({
                  _key: `${wsname}_${i}`,
                  origin,
                  receiptDate,
                  quantity,
                  containerNo: safeStr(containerNo),
                  unitCostUSD: safeNum(unitCostUSD),
                  exchangeRate: safeNum(exRate),
                  unitCostKRW: safeNum(unitKRW),
                  totalCostUSD: safeNum(quantity * unitCostUSD),
                  totalCostKRW: safeNum(totalCostKRW),
                  supplier: safeStr(supplier),
                  contractNo: safeStr(contractNo),
                  status: 'active',
                  remainingQty: quantity,
                });
              }
            }
          });
          
          setExcelPreview(parsed);
          setShowExcelModal(true);
        } catch (error) {
          console.error("Excel parse error:", error);
          alert(`엑셀 파일을 파싱하는 중 오류가 발생했습니다: ${error.message || error}`);
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
    };

    const handleExcelConfirm = async () => {
      try {
        const safeNum = (val) => {
          return (val === undefined || val === null || isNaN(val)) ? 0 : Number(val);
        };

        const safeStr = (val) => {
          if (val === undefined || val === null) return '';
          const str = String(val).trim();
          return str === 'undefined' || str === 'null' ? '' : str;
        };

        const receiptsToSave = excelPreview.map((item, idx) => {
          const receiptMonth = item.receiptDate.substring(0, 7);
          const existingMonthReceipts = inventoryReceipts.filter(r => r.receiptMonth === receiptMonth);
          const lotNumber = existingMonthReceipts.length + idx + 1; // 대략적인 로트 넘버
          
          return {
            contractId: '',
            origin: safeStr(item.origin),
            supplier: safeStr(item.supplier),
            contractNo: safeStr(item.contractNo),
            containerNo: safeStr(item.containerNo),
            receiptDate: safeStr(item.receiptDate),
            receiptMonth,
            quantity: safeNum(item.quantity),
            unitCostUSD: safeNum(item.unitCostUSD),
            unitCostKRW: safeNum(item.unitCostKRW),
            totalCostUSD: safeNum(item.totalCostUSD),
            totalCostKRW: safeNum(item.totalCostKRW),
            exchangeRate: safeNum(item.exchangeRate),
            remainingQty: safeNum(item.remainingQty),
            status: safeStr(item.status),
            lotNumber,
            createdAt: new Date().toISOString()
          };
        });
        
        if (onBulkAddReceipt) {
          await onBulkAddReceipt(receiptsToSave);
        } else {
          // Fallback if bulkAdd is not available
          for (const data of receiptsToSave) {
            await onUpdateReceipt(data);
          }
        }
        
        setShowExcelModal(false);
        setExcelPreview([]);
        alert(`${receiptsToSave.length}건의 입고가 일괄 등록되었습니다.`);
      } catch (error) {
        console.error("Error saving excel receipts:", error);
        alert(`저장 중 오류가 발생했습니다: ${error.message || error}`);
      }
    };

    // 선택된 월 및 산지로 필터링된 입고 내역
    const filteredReceipts = inventoryReceipts
      .filter(r => {
        const matchMonth = receiptFilterMonth === 'ALL' || r.receiptMonth === receiptFilterMonth;
        const matchOrigin = receiptFilterOrigin === 'ALL' || r.origin === receiptFilterOrigin;
        return matchMonth && matchOrigin;
      })
      .sort((a, b) => (a.receiptDate || '').localeCompare(b.receiptDate || '') || (a.lotNumber || 0) - (b.lotNumber || 0));

    // 미입고 계약 목록
    const unreceivedContracts = rawBeanContracts.map(c => {
      const receivedQty = inventoryReceipts
        .filter(r => r.contractId === c.id)
        .reduce((sum, r) => sum + (r.quantity || 0), 0);
      const remainingQty = (c.weight || 0) - receivedQty;
      return {
        ...c,
        receivedQty,
        remainingQty: Math.max(0, remainingQty)
      };
    }).filter(c => c.remainingQty > 1);

    return (
      <div className="space-y-6">
        {/* 계약에서 불러오기 */}
        {unreceivedContracts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-800">미입고 계약 목록</h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{unreceivedContracts.length}건</span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-500">산지</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">공급업체</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">계약번호</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">계약중량(KG)</th>
                    <th className="px-3 py-3 text-right font-bold text-blue-500">누적입고(KG)</th>
                    <th className="px-3 py-3 text-right font-bold text-emerald-600">남은수량(KG)</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">단가($/kg)</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">지급연월</th>
                    <th className="px-3 py-3 text-center font-bold text-slate-500">입고등록</th>
                  </tr>
                </thead>
                <tbody>
                  {unreceivedContracts.map((c, i) => {
                    let unitPrice = 0;
                    if (c.isFixedPrice) {
                      unitPrice = c.fixedPrice || 0;
                    } else {
                      unitPrice = ((c.index || 0) + (c.differential || 0)) * 22.046 / 1000;
                    }
                    return (
                      <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">{c.origin}</td>
                        <td className="px-3 py-3 text-slate-600">{c.supplier}</td>
                        <td className="px-3 py-3 font-mono text-slate-600">{c.contractNo}</td>
                        <td className="px-3 py-3 text-right font-mono text-slate-700">{(c.weight || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono text-blue-600 font-bold">
                          {c.receivedQty > 0 ? `${c.receivedQty.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-600 font-bold">
                          {c.remainingQty.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-700">${unitPrice.toFixed(3)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{c.paymentYear}.{c.paymentMonth}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => loadFromContract(c)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            입고 등록
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 입고 등록 폼 */}
        {showForm && (() => {
          const contract = rawBeanContracts.find(c => c.id === form.contractId);
          const totalWeight = contract ? (contract.weight || 0) : 0;
          const receivedWeight = contract
            ? inventoryReceipts
                .filter(r => r.contractId === contract.id && r.id !== editId)
                .reduce((sum, r) => sum + (r.quantity || 0), 0)
            : 0;
          const remainingWeight = Math.max(0, totalWeight - receivedWeight);

          return (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6 animate-in fade-in slide-in-from-top-4 duration-200">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                {editId ? '입고 수정' : '신규 입고 등록'}
              </h3>

              {contract && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
                  <div>
                    <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded mr-2 uppercase tracking-wide">계약 연동됨</span>
                    <strong className="text-slate-700">{contract.contractNo}</strong> <span className="text-slate-400">({contract.supplier})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 font-bold">
                    <div>계약 중량: <strong className="text-slate-800">{totalWeight.toLocaleString()} kg</strong></div>
                    <div>기입고: <strong className="text-blue-600">{receivedWeight.toLocaleString()} kg</strong></div>
                    <div>남은 미입고: <strong className="text-emerald-600">{remainingWeight.toLocaleString()} kg</strong></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">산지 *</label>
                  <select
                    value={form.origin}
                    onChange={e => setForm({ ...form, origin: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  >
                    <option value="">선택</option>
                    {GREEN_BEAN_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">입고일 *</label>
                  <input
                    type="date"
                    value={form.receiptDate}
                    onChange={e => setForm({ ...form, receiptDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">수량 (KG) *</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                  {contract && parseFloat(form.quantity) > remainingWeight && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      계약 잔량({remainingWeight.toLocaleString()} kg)을 초과함
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">공급업체</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={e => setForm({ ...form, supplier: e.target.value })}
                    placeholder="업체명"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">계약번호</label>
                  <input
                    type="text"
                    value={form.contractNo}
                    onChange={e => setForm({ ...form, contractNo: e.target.value })}
                    placeholder="CONT-XXXX"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">컨테이너/B/L번호</label>
                  <input
                    type="text"
                    value={form.containerNo}
                    onChange={e => setForm({ ...form, containerNo: e.target.value })}
                    placeholder="CONT-1234"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">단가 (USD/kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.unitCostUSD}
                    onChange={e => setForm({ ...form, unitCostUSD: e.target.value })}
                    placeholder="0.000"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">적용 환율 (KRW/USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.exchangeRate}
                    onChange={e => setForm({ ...form, exchangeRate: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 flex-1 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400">원화 단가</p>
                    <p className="text-sm font-black text-slate-800">
                      {form.unitCostUSD && form.exchangeRate
                        ? `₩${Math.round(parseFloat(form.unitCostUSD) * parseFloat(form.exchangeRate)).toLocaleString()}/kg`
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>
              {/* 총 매입금액 미리보기 */}
              {form.quantity && form.unitCostUSD && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase">총 매입금액 (USD)</p>
                      <p className="text-lg font-black text-amber-800">
                        ${(parseFloat(form.quantity) * parseFloat(form.unitCostUSD)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase">총 매입금액 (KRW)</p>
                      <p className="text-lg font-black text-amber-800">
                        ₩{Math.round(parseFloat(form.quantity) * parseFloat(form.unitCostUSD) * parseFloat(form.exchangeRate || exchangeRate)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> {editId ? '수정 저장' : '입고 등록'}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                  취소
                </button>
              </div>
            </div>
          );
        })()}

        {/* 수동 입고 등록 버튼 */}
        {!showForm && (
          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ contractId: '', origin: '', supplier: '', contractNo: '', containerNo: '', receiptDate: '', quantity: '', unitCostUSD: '', exchangeRate: exchangeRate }); }}
              className="flex-1 py-3 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> 수동 입고 등록
            </button>
            <div className="flex-1">
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> 엑셀 업로드
              </button>
            </div>
          </div>
        )}

        {/* 입고 이력 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ArrowDownToLine className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800">입고 이력</h3>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredReceipts.length}건</span>
            </div>

            {/* 필터 컨트롤러 영역 */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">조회월</span>
                <select
                  value={receiptFilterMonth}
                  onChange={e => setReceiptFilterMonth(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white cursor-pointer"
                >
                  <option value="ALL">전체 월</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m.replace('-', '년 ')}월</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">산지</span>
                <select
                  value={receiptFilterOrigin}
                  onChange={e => setReceiptFilterOrigin(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white cursor-pointer"
                >
                  <option value="ALL">전체 산지</option>
                  {GREEN_BEAN_TYPES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {(receiptFilterMonth !== selectedMonth || receiptFilterOrigin !== 'ALL') && (
                <button
                  onClick={() => {
                    setReceiptFilterMonth(selectedMonth);
                    setReceiptFilterOrigin('ALL');
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] font-bold"
                  title="필터 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  초기화
                </button>
              )}
            </div>
          </div>
          {filteredReceipts.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold">해당 월에 등록된 입고가 없습니다</p>
              <p className="text-xs mt-1">위의 계약 목록에서 입고를 등록하거나, 수동 입고 등록을 이용하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-3 text-center font-bold text-slate-500">LOT#</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">산지</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">계약번호</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">공급업체</th>
                    <th className="px-3 py-3 text-center font-bold text-slate-500">입고일</th>
                    <th className="px-3 py-3 text-left font-bold text-slate-500">컨테이너/B/L</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">수량(KG)</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">$/kg</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">원/kg</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">환율</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">총액(KRW)</th>
                    <th className="px-3 py-3 text-right font-bold text-slate-500">잔여</th>
                    <th className="px-3 py-3 text-center font-bold text-slate-500">상태</th>
                    <th className="px-3 py-3 text-center font-bold text-slate-500">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-amber-50/20 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md">#{r.lotNumber || i + 1}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700">{r.origin}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 text-[10px]">{r.contractNo || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{r.supplier || '-'}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{r.receiptDate}</td>
                      <td className="px-3 py-3 text-left font-mono text-slate-600 text-[10px]">{r.containerNo || '-'}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">{(r.quantity || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">${(r.unitCostUSD || 0).toFixed(3)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">₩{Math.round(r.unitCostKRW || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-500">{(r.exchangeRate || 0).toFixed(1)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-700">₩{Math.round(r.totalCostKRW || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-600">{(r.remainingQty || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {r.status === 'active' ? '활성' : '소진'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="수정">
                            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button
                            onClick={async () => { if (window.confirm('이 입고 기록을 삭제하시겠습니까?')) await onDeleteReceipt(r.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 엑셀 미리보기 모달 */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-black text-slate-800">엑셀 업로드 미리보기</h2>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    총 {excelPreview.length}건
                  </span>
                </div>
                <button
                  onClick={() => { setShowExcelModal(false); setExcelPreview([]); }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-500">산지</th>
                        <th className="px-3 py-3 text-center font-bold text-slate-500">통관일(입고일)</th>
                        <th className="px-3 py-3 text-left font-bold text-slate-500">컨테이너/B/L</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-500">수량(KG)</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-500">단가($)</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-500">환율</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-500">단가(원/kg)</th>
                        <th className="px-3 py-3 text-right font-bold text-slate-500">총액(원)</th>
                        <th className="px-3 py-3 text-left font-bold text-slate-500">공급업체</th>
                        <th className="px-3 py-3 text-left font-bold text-slate-500">계약번호</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-700">{item.origin}</td>
                          <td className="px-3 py-3 text-center text-slate-600">{item.receiptDate}</td>
                          <td className="px-3 py-3 text-left font-mono text-slate-600">{item.containerNo || '-'}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-600">
                            ${item.unitCostUSD.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-500">
                            {item.exchangeRate.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-600">
                            ₩{Math.round(item.unitCostKRW).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-amber-700">
                            ₩{Math.round(item.totalCostKRW).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-left text-slate-600">{item.supplier || '-'}</td>
                          <td className="px-3 py-3 text-left font-mono text-slate-600">{item.contractNo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                  onClick={() => { setShowExcelModal(false); setExcelPreview([]); }}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleExcelConfirm}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                  <Check className="w-4 h-4" /> 일괄 등록 확정
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── 탭 3: 재고입력 ─────────────────────────────────
  const InventoryTab = () => {
    const [inventoryInputs, setInventoryInputs] = useState({});
    const [calculating, setCalculating] = useState(false);
    const [calcResults, setCalcResults] = useState(null);

    // 기존 월 데이터 로딩
    useEffect(() => {
      const existing = {};
      monthlyInventory
        .filter(mi => mi.month === selectedMonth)
        .forEach(mi => {
          existing[`${mi.category}_${mi.itemName}`] = mi.closingQty || 0;
        });
      setInventoryInputs(existing);
      setCalcResults(null);
    }, [selectedMonth]);

    const handleInputChange = (category, itemName, value) => {
      setInventoryInputs(prev => ({
        ...prev,
        [`${category}_${itemName}`]: parseFloat(value) || 0,
      }));
      setCalcResults(null);
    };

    // FIFO 원가 계산 실행
    const handleCalculate = () => {
      setCalculating(true);
      const results = {};
      const [y, m] = selectedMonth.split('-').map(Number);
      const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

      GREEN_BEAN_TYPES.forEach(beanType => {
        // 기초재고 로트: 전월의 잔여 로트들 (확정 우선, 없으면 임시저장 참고)
        const prevConfirmed = monthlyInventory.find(
          mi => mi.month === prevMonth && mi.category === 'greenBean' && mi.itemName === beanType && mi.status === 'confirmed'
        ) || monthlyInventory.find(
          mi => mi.month === prevMonth && mi.category === 'greenBean' && mi.itemName === beanType && mi.status === 'draft'
        );

        // 기초재고 로트 구성 (이전 월의 잔여 로트 데이터가 없으면 빈 배열)
        let openingLots = [];
        if (prevConfirmed && prevConfirmed.remainingLots) {
          openingLots = prevConfirmed.remainingLots;
        } else {
          // 전월 잔여재고가 있지만 로트 데이터가 없으면 단일 로트로 구성
          const prevClosingQty = prevConfirmed?.closingQty || 0;
          const prevClosingCost = prevConfirmed?.closingCostKRW || 0;
          if (prevClosingQty > 0) {
            openingLots = [{
              id: `opening_${beanType}_${selectedMonth}`,
              origin: beanType,
              receiptDate: `${prevMonth}-01`,
              quantity: prevClosingQty,
              remainingQty: prevClosingQty,
              unitCostKRW: prevClosingCost / prevClosingQty,
              unitCostUSD: 0,
              status: 'active',
              lotNumber: 0,
              contractNo: '이월재고',
            }];
          }
        }

        // 당월 매입 로트
        const purchaseLots = inventoryReceipts
          .filter(r => r.receiptMonth === selectedMonth && r.origin === beanType)
          .sort((a, b) => (a.receiptDate || '').localeCompare(b.receiptDate || '') || (a.lotNumber || 0) - (b.lotNumber || 0));

        // 잔여재고 (공장 입력)
        const closingQty = inventoryInputs[`greenBean_${beanType}`] || 0;

        // FIFO 계산
        const result = calculateMonthlyInventory(openingLots, purchaseLots, closingQty);
        results[beanType] = result;
      });

      setCalcResults(results);
      setCalculating(false);
    };

    // 확정 저장
    const handleConfirm = async () => {
      if (!calcResults) return;
      if (!window.confirm(`${selectedMonth} 월별 재고를 확정하시겠습니까?\n확정 후에는 FIFO 로트가 업데이트됩니다.`)) return;

      for (const beanType of GREEN_BEAN_TYPES) {
        const result = calcResults[beanType];
        if (!result) continue;

        const docId = `${selectedMonth}_greenBean_${beanType}`;
        await onUpdateMonthlyInventory({
          id: docId,
          month: selectedMonth,
          category: 'greenBean',
          itemName: beanType,
          openingQty: result.openingQty,
          openingCostKRW: result.openingCostKRW,
          purchaseQty: result.purchaseQty,
          purchaseCostKRW: result.purchaseCostKRW,
          closingQty: result.closingQty,
          closingCostKRW: result.closingCostKRW,
          consumedQty: result.consumedQty,
          consumedCostKRW: result.consumedCostKRW,
          avgUnitCost: result.avgUnitCost,
          remainingLots: result.remainingLots,
          consumedLots: result.consumedLots,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        });

        // 입고 로트의 remainingQty 업데이트
        for (const lot of result.remainingLots) {
          if (lot.id && !lot.id.startsWith('opening_')) {
            const existing = inventoryReceipts.find(r => r.id === lot.id);
            if (existing && existing.remainingQty !== lot.remainingQty) {
              await onUpdateReceipt({
                ...existing,
                remainingQty: lot.remainingQty,
                status: lot.remainingQty <= 0 ? 'depleted' : 'active',
              });
            }
          }
        }
      }

      // 사일로/제품 재고 저장
      for (const cat of CATEGORIES) {
        if (cat.key === 'greenBean') continue;
        for (const itemName of cat.items) {
          const closingQty = inventoryInputs[`${cat.key}_${itemName}`] || 0;
          if (closingQty > 0) {
            const docId = `${selectedMonth}_${cat.key}_${itemName}`;
            await onUpdateMonthlyInventory({
              id: docId,
              month: selectedMonth,
              category: cat.key,
              itemName: itemName,
              closingQty,
              status: 'confirmed',
              confirmedAt: new Date().toISOString(),
            });
          }
        }
      }

      alert('확정 완료! 재고가 저장되었습니다.');
      setCalcResults(null);
    };

    // 임시 저장
    const handleTempSave = async () => {
      try {
        for (const cat of CATEGORIES) {
          for (const itemName of cat.items) {
            const key = `${cat.key}_${itemName}`;
            const closingQty = inventoryInputs[key];
            if (closingQty !== undefined && closingQty !== null && closingQty !== '') {
              const docId = `${selectedMonth}_${cat.key}_${itemName}`;
              await onUpdateMonthlyInventory({
                id: docId,
                month: selectedMonth,
                category: cat.key,
                itemName: itemName,
                closingQty: Number(closingQty) || 0,
                status: 'draft',
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        alert('임시저장이 완료되었습니다.');
      } catch (error) {
        console.error('임시저장 실패:', error);
        alert('임시저장 중 오류가 발생했습니다.');
      }
    };

    const [y, m] = selectedMonth.split('-').map(Number);
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const prevMonthInvConfirmed = monthlyInventory.filter(mi => mi.month === prevMonth && mi.status === 'confirmed');
    const prevMonthInvDraft = monthlyInventory.filter(mi => mi.month === prevMonth && mi.status === 'draft');
    const isPrevConfirmed = prevMonthInvConfirmed.length > 0;
    const hasPrevDraft = prevMonthInvDraft.length > 0;

    const isConfirmed = monthlyInventory.some(mi => mi.month === selectedMonth && mi.status === 'confirmed');

    return (
      <div className="space-y-6">
        {!isPrevConfirmed && (hasPrevDraft || prevMonthInvDraft.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-800">
              이전 월({prevMonth})의 재고가 확정되지 않았습니다. 이전 월의 재고를 확정해야 이번 달({selectedMonth})의 기초재고 및 FIFO 원가 계산이 정상적으로 이월됩니다.
            </span>
          </div>
        )}
        {isConfirmed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">이 월은 이미 확정되었습니다. 재계산하면 기존 데이터가 덮어씌워집니다.</span>
          </div>
        )}

        {/* 생두 잔여재고 입력 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <Coffee className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-800">생두 잔여재고 입력</h3>
            <span className="text-xs text-slate-400 ml-auto">공장에서 전달받은 월말 잔여재고(KG)를 입력하세요</span>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
            {GREEN_BEAN_TYPES.map((bean, i) => (
              <div key={i} className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-2">
                  {bean}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inventoryInputs[`greenBean_${bean}`] || ''}
                    onChange={e => handleInputChange('greenBean', bean, e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-3 border border-amber-200 rounded-xl text-lg font-black text-slate-800 text-right focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 사일로 재고 입력 */}
        {CATEGORIES.filter(c => c.key !== 'greenBean').map((cat, ci) => (
          <div key={ci} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <cat.icon className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-black text-slate-800">{cat.label} 잔여재고 입력</h3>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
              {cat.items.map((item, ii) => (
                <div key={ii} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-2 truncate" title={item}>
                    {item.replace('생두사일로-', '').replace('원두사일로-', '')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={inventoryInputs[`${cat.key}_${item}`] || ''}
                      onChange={e => handleInputChange(cat.key, item, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-3 border border-slate-200 rounded-xl text-lg font-black text-slate-800 text-right focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KG</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 하단 고정 액션바 */}
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 -mx-6 px-6 py-4 mt-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-b-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{isConfirmed ? '이미 확정된 월입니다. 재저장 시 덮어씌워집니다.' : '입력 후 반드시 저장해주세요.'}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleTempSave}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 border border-slate-200"
              >
                <Save className="w-4 h-4" />
                임시저장
              </button>
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                <Scale className="w-4 h-4" />
                {calculating ? '계산 중...' : 'FIFO 원가 계산'}
              </button>
              {calcResults && (
                <button
                  onClick={handleConfirm}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200 animate-pulse"
                >
                  <Check className="w-4 h-4" /> 확정 저장
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 계산 결과 미리보기 */}
        {calcResults && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/50 flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-indigo-800">FIFO 원가 계산 결과</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left font-black text-slate-600">생두</th>
                    <th className="px-3 py-3 text-right font-black text-slate-500">기초재고<br/><span className="font-normal text-[10px]">(KG / 원)</span></th>
                    <th className="px-3 py-3 text-right font-black text-blue-500">매입<br/><span className="font-normal text-[10px]">(KG / 원)</span></th>
                    <th className="px-3 py-3 text-right font-black text-amber-600">투입<br/><span className="font-normal text-[10px]">(KG / 원)</span></th>
                    <th className="px-3 py-3 text-right font-black text-emerald-600">잔여재고<br/><span className="font-normal text-[10px]">(KG / 원)</span></th>
                    <th className="px-3 py-3 text-right font-black text-purple-600">투입 평균단가<br/><span className="font-normal text-[10px]">(원/kg)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {GREEN_BEAN_TYPES.map((bean, i) => {
                    const r = calcResults[bean];
                    if (!r) return null;
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-bold text-slate-700">{bean}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-mono text-slate-700">{r.openingQty.toLocaleString()} kg</div>
                          <div className="font-mono text-slate-400 text-[10px]">{formatCostKRW(r.openingCostKRW)}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-mono text-blue-600">{r.purchaseQty.toLocaleString()} kg</div>
                          <div className="font-mono text-blue-400 text-[10px]">{formatCostKRW(r.purchaseCostKRW)}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-mono text-amber-600 font-bold">{r.consumedQty.toLocaleString()} kg</div>
                          <div className="font-mono text-amber-500 text-[10px]">{formatCostKRW(r.consumedCostKRW)}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-mono text-emerald-600 font-bold">{r.closingQty.toLocaleString()} kg</div>
                          <div className="font-mono text-emerald-500 text-[10px]">{formatCostKRW(r.closingCostKRW)}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-purple-700 font-bold">
                          {r.avgUnitCost > 0 ? `₩${Math.round(r.avgUnitCost).toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 소진 로트 상세 */}
            {Object.entries(calcResults).some(([, r]) => r.consumedLots?.length > 0) && (
              <div className="border-t border-indigo-100 p-6">
                <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-500" />
                  FIFO 소진 로트 상세
                </h4>
                {Object.entries(calcResults).map(([bean, r]) => {
                  if (!r.consumedLots?.length) return null;
                  return (
                    <div key={bean} className="mb-4">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-2">{bean}</p>
                      <div className="flex flex-wrap gap-2">
                        {r.consumedLots.map((lot, li) => (
                          <div key={li} className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px]">
                            <p className="font-bold text-slate-700">{lot.contractNo || 'LOT'}</p>
                            <p className="text-amber-600">{lot.qty.toLocaleString()} kg × ₩{Math.round(lot.unitCostKRW).toLocaleString()}</p>
                            <p className="font-bold text-amber-800">{formatCostKRW(lot.costKRW)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── 탭 4: FIFO 트래킹 보드 ──────────────────────────
  const FIFOBoardTab = () => {
    const [expandedBean, setExpandedBean] = useState(null);

    // 산지별 활성 로트 그룹핑
    const lotsByBean = useMemo(() => {
      const grouped = {};
      GREEN_BEAN_TYPES.forEach(bean => {
        const activeLots = inventoryReceipts
          .filter(r => r.origin === bean && r.status === 'active' && (r.remainingQty || 0) > 0)
          .sort((a, b) => (a.receiptDate || '').localeCompare(b.receiptDate || '') || (a.lotNumber || 0) - (b.lotNumber || 0));

        const depletedLots = inventoryReceipts
          .filter(r => r.origin === bean && (r.status === 'depleted' || (r.remainingQty || 0) === 0))
          .sort((a, b) => (b.receiptDate || '').localeCompare(a.receiptDate || ''));

        const totalQty = activeLots.reduce((s, l) => s + (l.quantity || 0), 0);
        const remainingQty = activeLots.reduce((s, l) => s + (l.remainingQty || 0), 0);
        const totalCostKRW = activeLots.reduce((s, l) => s + (l.remainingQty || 0) * (l.unitCostKRW || 0), 0);

        grouped[bean] = { activeLots, depletedLots, totalQty, remainingQty, totalCostKRW };
      });
      return grouped;
    }, [inventoryReceipts]);

    // 생산 흐름 시각화 데이터
    const flowData = useMemo(() => {
      const currentInv = monthlyInventory.filter(mi => mi.month === selectedMonth && mi.status === 'confirmed');
      return {
        greenBean: currentInv.filter(mi => mi.category === 'greenBean').reduce((s, mi) => s + (mi.closingQty || 0), 0),
        greenSilo: currentInv.filter(mi => mi.category === 'greenSilo').reduce((s, mi) => s + (mi.closingQty || 0), 0),
        roastedSilo: currentInv.filter(mi => mi.category === 'roastedSilo').reduce((s, mi) => s + (mi.closingQty || 0), 0),
        product: currentInv.filter(mi => mi.category === 'product').reduce((s, mi) => s + (mi.closingQty || 0), 0),
      };
    }, [monthlyInventory, selectedMonth]);

    return (
      <div className="space-y-6">
        {/* 생산 흐름 시각화 */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="text-sm font-black text-slate-300 mb-6 uppercase tracking-wider">생산 흐름 (Production Flow)</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {[
              { label: '생두', icon: Coffee, qty: flowData.greenBean, color: 'amber', gradient: 'from-amber-500 to-amber-700' },
              { label: '생두 사일로', icon: Warehouse, qty: flowData.greenSilo, color: 'orange', gradient: 'from-orange-500 to-orange-700' },
              { label: '원두 사일로', icon: Factory, qty: flowData.roastedSilo, color: 'yellow', gradient: 'from-yellow-500 to-yellow-700' },
              { label: '제품', icon: Box, qty: flowData.product, color: 'emerald', gradient: 'from-emerald-500 to-emerald-700' },
            ].map((stage, si) => (
              <React.Fragment key={si}>
                {si > 0 && (
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <div className={`bg-gradient-to-br ${stage.gradient} rounded-2xl p-4 flex-1 min-w-[140px] shadow-lg`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stage.icon className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold opacity-90">{stage.label}</span>
                  </div>
                  <p className="text-2xl font-black">{stage.qty > 0 ? stage.qty.toLocaleString() : '0'}</p>
                  <p className="text-[10px] font-medium opacity-70">KG</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 산지별 FIFO 로트 카드 */}
        {GREEN_BEAN_TYPES.map((bean, bi) => {
          const data = lotsByBean[bean];
          if (!data) return null;
          const isExpanded = expandedBean === bean;

          return (
            <div key={bi} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* 산지 헤더 */}
              <button
                onClick={() => setExpandedBean(isExpanded ? null : bean)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-50/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <h3 className="text-sm font-black text-slate-800">{bean}</h3>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {data.activeLots.length} 로트
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">잔여 수량</p>
                    <p className="text-sm font-black text-slate-800">{data.remainingQty.toLocaleString()} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">잔여 원가</p>
                    <p className="text-sm font-black text-amber-700">{formatCostKRW(data.totalCostKRW)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {/* 로트 카드 그리드 */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                  {data.activeLots.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">활성 로트가 없습니다</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {data.activeLots.map((lot, li) => {
                        const usedPct = lot.quantity > 0 ? ((lot.quantity - (lot.remainingQty || 0)) / lot.quantity) * 100 : 0;
                        return (
                          <div key={li} className="bg-gradient-to-br from-slate-50 to-amber-50/30 rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                            {/* 로트 헤더 */}
                            <div className="flex items-center justify-between mb-3">
                              <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md">LOT #{lot.lotNumber || li + 1}</span>
                              <span className="text-[10px] font-bold text-slate-400">{lot.receiptDate}</span>
                            </div>
                            {/* 계약 정보 */}
                            {lot.contractNo && (
                              <p className="text-[10px] font-mono text-slate-500 mb-2 truncate" title={lot.contractNo}>{lot.contractNo}</p>
                            )}
                            {/* 소진율 바 */}
                            <div className="mb-3">
                              <div className="flex justify-between text-[10px] font-bold mb-1">
                                <span className="text-amber-600">{usedPct.toFixed(0)}% 소진</span>
                                <span className="text-emerald-600">{(lot.remainingQty || 0).toLocaleString()} kg 잔여</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                                  style={{ width: `${usedPct}%` }}
                                />
                              </div>
                            </div>
                            {/* 단가 정보 */}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-slate-400 font-bold">USD/kg</p>
                                <p className="font-black text-slate-700">${(lot.unitCostUSD || 0).toFixed(3)}</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-slate-400 font-bold">KRW/kg</p>
                                <p className="font-black text-amber-700">₩{Math.round(lot.unitCostKRW || 0).toLocaleString()}</p>
                              </div>
                            </div>
                            {/* 총 수량 */}
                            <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                              <span>입고: {(lot.quantity || 0).toLocaleString()} kg</span>
                              <span>환율: {(lot.exchangeRate || 0).toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 소진 완료 로트 (최근 5개) */}
                  {data.depletedLots.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">소진 완료 ({data.depletedLots.length}건)</p>
                      <div className="flex flex-wrap gap-2">
                        {data.depletedLots.slice(0, 5).map((lot, li) => (
                          <div key={li} className="bg-slate-100 rounded-lg px-3 py-2 text-[10px] opacity-60">
                            <span className="font-bold text-slate-500">{lot.contractNo || `LOT#${lot.lotNumber}`}</span>
                            <span className="text-slate-400 ml-2">{(lot.quantity || 0).toLocaleString()} kg</span>
                            <span className="text-slate-400 ml-2">{lot.receiptDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── 탭 5: 설정 ─────────────────────────────────────
  const SettingsTab = () => {
    const [method, setMethod] = useState(costSettings.costMethod || 'FIFO');

    return (
      <div className="space-y-6">
        {/* 원가 산출 방식 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-500" />
            원가 산출 방식
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setMethod('FIFO');
                onUpdateCostSettings?.({ ...costSettings, costMethod: 'FIFO' });
              }}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                method === 'FIFO'
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${method === 'FIFO' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'} flex items-center justify-center`}>
                  {method === 'FIFO' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm font-black text-slate-800">선입선출법 (FIFO)</span>
              </div>
              <p className="text-xs text-slate-500">먼저 입고된 재고가 먼저 출고된다고 가정하여 원가를 계산합니다.</p>
              <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">현재 적용 중</span>
            </button>
            <button
              onClick={() => alert('이동평균법은 추후 지원 예정입니다.')}
              className="p-5 rounded-xl border-2 border-slate-200 text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                <span className="text-sm font-black text-slate-800">이동평균법</span>
              </div>
              <p className="text-xs text-slate-500">입고 시 마다 가중평균단가를 재계산하여 원가를 산출합니다.</p>
              <span className="inline-block mt-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">추후 지원 예정</span>
            </button>
          </div>
        </div>

        {/* 관리 항목 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-500" />
            관리 대상 항목
          </h3>
          <div className="space-y-4">
            {CATEGORIES.map((cat, ci) => (
              <div key={ci} className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">{cat.label}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item, ii) => (
                    <span key={ii} className="bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-lg">
                      {typeof item === 'string' ? item : item.name || item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 환율 기준 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            환율 적용 기준
          </h3>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-bold text-emerald-800">외화 지급 시점 환율</p>
            <p className="text-xs text-emerald-600 mt-1">환전 후 외화로 구매하는 구조에 따라, 실제 외화 지급(송금) 시점의 환율을 적용합니다.</p>
            <p className="text-xs text-slate-500 mt-2">현재 기본 환율: <span className="font-bold">₩{exchangeRate.toLocaleString()}/USD</span></p>
          </div>
        </div>
      </div>
    );
  };

  // ─── 렌더링 ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            원가관리
          </h1>
          <p className="text-sm text-slate-500 mt-1">FIFO 기반 생두 원가 트래킹 시스템</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">기준월</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white appearance-none cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            value={selectedMonthNum}
            onChange={e => setSelectedMonthNum(Number(e.target.value))}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white appearance-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          <button
            onClick={handleApplyMonth}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-amber-200 flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            조회
          </button>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{selectedMonth}</span>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'summary' && <SummaryTab />}
      {activeTab === 'receipt' && <ReceiptTab />}
      {activeTab === 'inventory' && <InventoryTab />}
      {activeTab === 'fifoBoard' && <FIFOBoardTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
};

export default CostManagementPage;
