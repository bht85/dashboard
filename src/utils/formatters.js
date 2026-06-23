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

  // ⚠️ 중요: 숫자 필드(잔액, 입출금액 등)는 검색 대상에서 제외해야 합니다.
  // 예) 잔액 199,048,252원 → '48252' 마커와 오탐지 발생 가능
  // 계좌 식별용 문자열 필드만 추출하여 검색합니다.
  const identifierFields = [
    accountData.no,
    accountData.account,
    accountData.nickname,
    accountData.type,
    accountData.bank,
    accountData.group,
    accountData.note,
    accountData.label,
  ].filter(Boolean).map(v => String(v));

  const joinedRaw = identifierFields.join('|');
  const joinedNormalized = joinedRaw.replace(/[\s-]/g, '');

  // 퇴직연금신탁 계좌만 제외 (계좌번호 전체 패턴 사용 → 잔액 숫자와 충돌 없음)
  // ⚠️ 주의: 102-910168-08252 (특정금전신탁)은 정상 업로드 대상 계좌이므로 제외하지 않음
  const markers = [
    '퇴직연금신탁',
    '10291017771452', // 퇴직연금신탁 계좌 (컴포즈)
  ];

  return markers.some(m => joinedRaw.includes(m) || joinedNormalized.includes(m));
};
