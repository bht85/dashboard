import re

with open('/Users/bigheadtiger/Desktop/g/자금일보/src/pages/ForeignSchedulePage.jsx', 'r') as f:
    content = f.read()

# Replace the filtering logic
old_logic = """        const availableSuppliersInPicker = Array.from(new Set(displayContracts.map(c => c.supplier).filter(Boolean))).sort();
        const filteredContractsForPicker = displayContracts.filter(c => {
          if (selectedContractSupplierFilter === 'ALL') return true;
          return c.supplier === selectedContractSupplierFilter;
        });"""

new_logic = """        const availableSuppliersInPicker = Array.from(new Set(displayContracts.map(c => c.supplier).filter(Boolean))).sort();
        const availablePeriodsInPicker = Array.from(new Set(displayContracts.map(c => {
          const y = String(c.paymentYear || '').replace(/[^0-9]/g, '');
          const m = String(c.paymentMonth || '').replace(/[^0-9]/g, '').padStart(2, '0');
          return y && m ? `${y}년 ${m}월` : '';
        }).filter(Boolean))).sort();
        
        const filteredContractsForPicker = displayContracts.filter(c => {
          let passSupplier = true;
          let passPeriod = true;
          if (selectedContractSupplierFilter !== 'ALL') passSupplier = (c.supplier === selectedContractSupplierFilter);
          if (selectedContractPeriodFilter !== 'ALL') {
             const y = String(c.paymentYear || '').replace(/[^0-9]/g, '');
             const m = String(c.paymentMonth || '').replace(/[^0-9]/g, '').padStart(2, '0');
             const pStr = `${y}년 ${m}월`;
             passPeriod = (pStr === selectedContractPeriodFilter);
          }
          return passSupplier && passPeriod;
        });"""

content = content.replace(old_logic, new_logic)

# Replace the UI
old_ui = """                   {/* 공급업체 필터 UI */}
                   <div className="mb-8 flex flex-col gap-3 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                         <Search className="w-4 h-4 text-indigo-600" />
                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">공급업체 필터 (Supplier Filter)</span>
                      </div>"""

new_ui = """                   {/* 필터 UI */}
                   <div className="mb-8 flex flex-col gap-6 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                      {/* 지급일 필터 */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                           <Calendar className="w-4 h-4 text-indigo-600" />
                           <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">지급일 필터 (Payment Period)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <button 
                              onClick={() => setSelectedContractPeriodFilter('ALL')}
                              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-200 ${
                                 selectedContractPeriodFilter === 'ALL'
                                 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                 : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                           >
                              전체
                           </button>
                           {availablePeriodsInPicker.map(p => {
                              return (
                                 <button 
                                    key={p}
                                    onClick={() => setSelectedContractPeriodFilter(p)}
                                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-200 ${
                                       selectedContractPeriodFilter === p
                                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                       : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                                 >
                                    {p}
                                 </button>
                              );
                           })}
                        </div>
                      </div>
                      
                      {/* 공급업체 필터 */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                           <Search className="w-4 h-4 text-indigo-600" />
                           <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">공급업체 필터 (Supplier Filter)</span>
                        </div>"""

content = content.replace(old_ui, new_ui)

with open('/Users/bigheadtiger/Desktop/g/자금일보/src/pages/ForeignSchedulePage.jsx', 'w') as f:
    f.write(content)
