import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTransferMoney } from '../dist/libs/utils/transfer-money.util.js';

test('calculates exact amounts, minimum fee and HALF_UP rounding', () => {
  // Expected values are fixed decimal calculations, independent of the BigInt formula.
  const cases = [
    { sendAmount: '500000', fee: '5000', totalDebit: '505000', receiveAmount: '20600.00' },
    { sendAmount: '10000', fee: '3000', totalDebit: '13000', receiveAmount: '412.00' },
    { sendAmount: '10004', fee: '3000', totalDebit: '13004', receiveAmount: '412.16' },
    { sendAmount: '10021', fee: '3000', totalDebit: '13021', receiveAmount: '412.87' },
    { sendAmount: '300049', fee: '3000', totalDebit: '303049', receiveAmount: '12362.02' },
    { sendAmount: '300050', fee: '3001', totalDebit: '303051', receiveAmount: '12362.06' },
    { sendAmount: '300051', fee: '3001', totalDebit: '303052', receiveAmount: '12362.10' },
    { sendAmount: '00010000', fee: '3000', totalDebit: '13000', receiveAmount: '412.00' },
    {
      sendAmount: '9007199254740993',
      fee: '90071992547410',
      totalDebit: '9097271247288403',
      receiveAmount: '371096609295328.91',
    },
  ];

  for (const { sendAmount, ...expected } of cases) {
    assert.deepEqual(calculateTransferMoney(sendAmount), expected, `sendAmount=${sendAmount}`);
  }
});

test('rejects invalid formats and amounts below the minimum', () => {
  const invalidFormats = [
    '', ' ', '10000 ', '10000\n', '-10000', '+10000', '10000.0', '1e4',
    '0x2710', 'abc', 10000, null, undefined,
  ];

  for (const amount of invalidFormats) {
    assert.throws(() => calculateTransferMoney(amount), TypeError, `amount=${String(amount)}`);
  }

  for (const amount of ['0', '9999']) {
    assert.throws(() => calculateTransferMoney(amount), RangeError, `amount=${amount}`);
  }
});
