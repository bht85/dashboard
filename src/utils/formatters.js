export const formatKRW = (val) => new Intl.NumberFormat('ko-KR').format(Math.floor(val)) + "원";
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const calculateTotal = (accounts, masterLists = null) => {
  // --- 마스터 리스트 기반 USD 계좌 번호 추출 (캐싱) ---
  const usdAccountSet = (masterLists) ? new Set([
     ...masterLists.compose.filter(a => a.isUSD).map(a => String(a.no).replace(/[^0-9]/g, '')),
     ...masterLists.smart.filter(a => a.isUSD).map(a => String(a.no).replace(/[^0-9]/g, ''))
  ]) : null;

  const isUSDAccount = (acc) => {
    if (usdAccountSet) {
      const cleanNo = String(acc.no || acc.account || '').replace(/[^0-9]/g, '');
      if (cleanNo && usdAccountSet.has(cleanNo)) return true;
    }
    return acc.isUSD || acc.currency === 'USD';
  };

  return accounts.reduce((acc, curr) => {
    const isUSD = isUSDAccount(curr);
    const key = isUSD ? 'usd' : 'krw';
    acc[key].balance += Number(curr.balance || 0);
    acc[key].withdraw += Number(curr.withdraw || 0);
    acc[key].internal += Number(curr.internal || 0);
    acc[key].final += Number(curr.final || 0);
    return acc;
  }, { 
    krw: { balance: 0, withdraw: 0, internal: 0, final: 0 },
    usd: { balance: 0, withdraw: 0, internal: 0, final: 0 }
  });
};

export const isExcludedAccount = (accountData) => {
  if (!accountData) return false;
  
  // Convert object to a single string for pattern matching
  // This captures keys like 'no', 'account', 'nickname', 'note', 'bank', etc.
  const rawData = JSON.stringify(accountData);
  const normalized = rawData.replace(/[\s-]/g, ''); // Remove spaces and dashes
  
  // Specific pension account markers
  const markers = [
    '퇴직연금신탁',
    '71452',
    '48252',
    '10291017771452'
  ];
  
  return markers.some(m => rawData.includes(m) || normalized.includes(m));
};
