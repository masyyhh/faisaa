export const DEFAULT_USD_TO_MVR_RATE = 15.42;

export function toMVR(
  amount: number | string | null | undefined,
  currency: string = 'MVR',
  usdToMvrRate: number | string = DEFAULT_USD_TO_MVR_RATE
): number {
  const num = Number(amount || 0);
  const rate =
    usdToMvrRate !== undefined && usdToMvrRate !== null
      ? Number(usdToMvrRate)
      : DEFAULT_USD_TO_MVR_RATE;
  if (currency === 'USD') {
    return Number((num * rate).toFixed(2));
  }
  return Number(num.toFixed(2));
}

export function toUSD(
  amount: number | string | null | undefined,
  currency: string = 'MVR',
  usdToMvrRate: number | string = DEFAULT_USD_TO_MVR_RATE
): number {
  const num = Number(amount || 0);
  const rate =
    usdToMvrRate !== undefined && usdToMvrRate !== null
      ? Number(usdToMvrRate)
      : DEFAULT_USD_TO_MVR_RATE;
  if (currency === 'MVR') {
    return rate > 0 ? Number((num / rate).toFixed(2)) : 0;
  }
  return Number(num.toFixed(2));
}
