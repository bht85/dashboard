export const formatKRW = (val) => new Intl.NumberFormat('ko-KR').format(Math.floor(val)) + "원";
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const calculateTotal = (accounts) => {
  return accounts.reduce((acc, curr) => {
    const key = curr.isUSD ? 'usd' : 'krw';
    acc[key].balance += curr.balance || 0;
    acc[key].withdraw += curr.withdraw || 0;
    acc[key].internal += curr.internal || 0;
    acc[key].final += curr.final || 0;
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
