/**
 * Currency Utility for Safe Agorot/Cents Math
 * Avoids floating-point errors by storing numbers as integers (agorot).
 * 1 ₪ = 100 agorot.
 */

export const formatCurrency = (agorot: number): string => {
  const shekels = agorot / 100;
  const formatted = shekels.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ₪`;
};

export const shekelsToAgorot = (shekels: number | string): number => {
  if (typeof shekels === 'string') {
    const parsed = parseFloat(shekels.replace(/,/g, ''));
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(shekels * 100);
};

export const agorotToShekels = (agorot: number): number => {
  return agorot / 100;
};
