export const formatKRW = (val) => new Intl.NumberFormat('ko-KR').format(Math.floor(val)) + "원";
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const calculateTotal = (accounts, exchangeRate = 1) => {
  return accounts.reduce((acc, curr) => {
    const rate = curr.isUSD ? exchangeRate : 1;
    return {
      balance: acc.balance + (curr.balance * rate),
      withdraw: acc.withdraw + (curr.withdraw * rate),
      internal: acc.internal + (curr.internal * rate),
      final: acc.final + (curr.final * rate),
    };
  }, { balance: 0, withdraw: 0, internal: 0, final: 0 });
};
