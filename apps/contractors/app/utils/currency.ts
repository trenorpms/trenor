export const getCurrencyConfig = () => {
  if (typeof window === 'undefined') return { code: 'EUR', symbol: '€' };
  const saved = localStorage.getItem('currency') || 'EUR';
  let symbol = '€';
  if (saved === 'HUF') symbol = 'Ft';
  else if (saved === 'USD') symbol = '$';
  return { code: saved, symbol };
};

export const formatMoney = (amount: number | string) => {
  const { code, symbol } = getCurrencyConfig();
  const val = Number(amount) || 0;
  if (code === 'HUF') return `${val.toLocaleString()} Ft`;
  return `${symbol}${val.toLocaleString()}`;
};
