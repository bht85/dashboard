export const formatKRW = (val) => new Intl.NumberFormat('ko-KR').format(Math.floor(val)) + "원";
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
export const formatEUR = (val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
export const formatJPY = (val) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
export const formatMillionKRW = (val) => {
  const m = Math.floor(val / 1000000);
  return new Intl.NumberFormat('ko-KR').format(m) + "백만";
};

export const formatForeign = (val, currency) => {
  if (currency === 'EUR') return formatEUR(val);
  if (currency === 'JPY') return formatJPY(val);
  return formatUSD(val);
};

export const calculateTotal = (accounts, _masterLists = null) => {
  // --- 마스터 리스트 기반 USD 계좌 번호 추출 (캐싱) ---
  // 통화 종류가 다양해졌으므로 acc객체 자체의 currency 필드를 신뢰하는 방향으로 단순화
  const initial = {
    krw: { balance: 0, withdraw: 0, internal: 0, final: 0 },
    usd: { balance: 0, withdraw: 0, internal: 0, final: 0 },
    eur: { balance: 0, withdraw: 0, internal: 0, final: 0 },
    jpy: { balance: 0, withdraw: 0, internal: 0, final: 0 }
  };

  return accounts.reduce((acc, curr) => {
    const rawCurrency = (curr.currency || (curr.isUSD ? 'USD' : 'KRW')).toLowerCase();
    const key = rawCurrency === 'krw' ? 'krw' : (rawCurrency === 'usd' ? 'usd' : (rawCurrency === 'eur' ? 'eur' : (rawCurrency === 'jpy' ? 'jpy' : 'usd')));
    
    if (!acc[key]) acc[key] = { balance: 0, withdraw: 0, internal: 0, final: 0 };
    
    acc[key].balance += Number(curr.balance || 0);
    acc[key].withdraw += Number(curr.withdraw || 0);
    acc[key].internal += Number(curr.internal || 0);
    acc[key].final += Number(curr.final || 0);
    return acc;
  }, initial);
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
