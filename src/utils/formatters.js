export const formatKRW = (val) => new Intl.NumberFormat('ko-KR').format(Math.floor(val)) + "원";
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const calculateTotal = (accounts) => {
  return accounts.reduce((acc, curr) => ({
    balance: acc.balance + (curr.isUSD ? 0 : curr.balance),
    withdraw: acc.withdraw + (curr.isUSD ? 0 : curr.withdraw),
    internal: acc.internal + (curr.isUSD ? 0 : curr.internal),
    final: acc.final + (curr.isUSD ? 0 : curr.final),
  }), { balance: 0, withdraw: 0, internal: 0, final: 0 });
};
