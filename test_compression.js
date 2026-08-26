const curr = {
    paymentYear: "2026",
    paymentMonth: "01",
    invoiceWeight: 19200,
    actualUSD: 40000,
    actualKRW: 55000000,
    index: 200,
    count: 1
};
const contracts = [curr, curr, curr];

const aggregated = contracts.reduce((acc, curr) => {
    const mStr = `${curr.paymentYear}-${String(curr.paymentMonth).padStart(2, '0')}`;
    if (!acc[mStr]) acc[mStr] = { weight: 0, usd: 0, krw: 0, indexSum: 0, count: 0 };
    
    if (curr.invoiceWeight === '' || String(curr.invoiceWeight).trim() === '') return acc;
    const w = parseFloat(curr.invoiceWeight || curr.weight || 0);
    
    let usdAmount = parseFloat(curr.actualUSD);
    let krwAmount = parseFloat(curr.actualKRW);
    if (isNaN(usdAmount) || usdAmount === 0) {
        const unitPrice = curr.isFixedPrice ? (parseFloat(curr.fixedPrice) || 0) : ((parseFloat(curr.index) || 0) + (parseFloat(curr.differential) || 0)) * 22.046 / 1000;
        usdAmount = w * unitPrice;
    }
    if (isNaN(krwAmount) || krwAmount === 0) {
        krwAmount = usdAmount * parseFloat(curr.planExchangeRate || 1450);
    }
    acc[mStr].weight += w;
    acc[mStr].usd += usdAmount;
    acc[mStr].krw += krwAmount;
    
    const idxVal = parseFloat(curr.index);
    if (!isNaN(idxVal) && idxVal > 0) {
      acc[mStr].indexSum += idxVal;
      acc[mStr].count += 1;
    }
    return acc;
}, {});

console.log(JSON.stringify(aggregated, null, 2));
