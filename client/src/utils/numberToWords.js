const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function threeDigitsToWords(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

/** Converts a rupee amount into Indian-numbering-system words, e.g. 8496 -> "Eight Thousand, Four Hundred And Ninety-Six". */
export function numberToIndianWords(amount) {
  const rounded = Math.round(Number(amount) || 0);
  if (rounded === 0) return 'Zero';

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const hundred = rounded % 1000;

  const parts = [];
  if (crore) parts.push(threeDigitsToWords(crore) + ' Crore');
  if (lakh) parts.push(threeDigitsToWords(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigitsToWords(thousand) + ' Thousand');
  if (hundred) {
    if (hundred < 100 && parts.length) {
      parts.push('And ' + threeDigitsToWords(hundred));
    } else {
      parts.push(threeDigitsToWords(hundred));
    }
  }

  return parts.join(', ').replace(/,\s*And/, ' And').replace(/-/g, '-');
}

export function amountInWordsRupees(amount) {
  return `INR ${numberToIndianWords(amount)} Rupees Only`;
}
