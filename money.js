// The shop's existing integer prices count ten-pence increments.
const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function gbp(units) {
  return pounds.format(units / 10);
}
