import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CreateTransferDto } from '../dist/libs/dto/transfers/create-transfer.dto.js';
import { CreateTransferValidationPipe } from '../dist/libs/pipes/create-transfer-validation.pipe.js';

const pipe = new CreateTransferValidationPipe();
const metadata = { type: 'body', metatype: CreateTransferDto };
const validRequest = {
  customerId: 'C001',
  sendCurrency: 'KRW',
  sendAmount: '500000',
  receiveCurrency: 'PHP',
  recipientName: 'Juan Dela Cruz',
};

test('returns a DTO, normalizes the amount and excludes server-owned fields', () => {
  const request = {
    ...validRequest,
    sendAmount: '00010000',
    status: 'COMPLETED',
    fee: '0',
    transferId: 'client-selected-id',
  };
  const dto = pipe.transform(request, metadata);

  assert.ok(dto instanceof CreateTransferDto);
  assert.deepEqual({ ...dto }, { ...validRequest, sendAmount: '10000' });
  assert.equal(request.sendAmount, '00010000');
});

test('accepts exact large amounts, nonblank names and names up to 100 characters', () => {
  for (const sendAmount of ['10000', '9007199254740993']) {
    const dto = pipe.transform({ ...validRequest, sendAmount }, metadata);
    assert.equal(dto.sendAmount, sendAmount);
  }

  for (const recipientName of ['a'.repeat(100), '😀'.repeat(100), ' Juan ']) {
    const dto = pipe.transform({ ...validRequest, recipientName }, metadata);
    assert.equal(dto.recipientName, recipientName);
  }

  // Existence in the database will be checked by the service, not this pipe.
  assert.equal(pipe.transform({ ...validRequest, customerId: 'C999' }, metadata).customerId, 'C999');
});

test('rejects invalid bodies and fields with the required 400 error format', () => {
  const invalidBodies = [undefined, null, [], 'text', 10000, true];

  for (const field of Object.keys(validRequest)) {
    const missingField = { ...validRequest };
    delete missingField[field];
    invalidBodies.push(missingField);
  }

  const invalidFields = {
    customerId: ['', ' \t\n', null, 1],
    sendCurrency: ['USD', 'krw', null, 1],
    receiveCurrency: ['KRW', 'php', null, 1],
    sendAmount: ['', '10000 ', '10000\n', '-10000', '+10000', '10000.0', '1e4', '0x2710', 'abc', '0', '9999', '0000', 10000, null],
    recipientName: ['', ' \t\n', '\0', '\0Juan', 'Juan\0', 'a'.repeat(101), '😀'.repeat(101), null, 1],
  };

  for (const [field, invalidValues] of Object.entries(invalidFields)) {
    for (const value of invalidValues) {
      invalidBodies.push({ ...validRequest, [field]: value });
    }
  }

  for (const body of invalidBodies) {
    assert.throws(() => pipe.transform(body, metadata), (error) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.getStatus(), 400);
      const response = error.getResponse();
      assert.deepEqual(Object.keys(response).sort(), ['error', 'message']);
      assert.equal(response.error, 'VALIDATION_ERROR');
      assert.equal(typeof response.message, 'string');
      assert.ok(response.message.length > 0);
      return true;
    }, `body=${JSON.stringify(body)}`);
  }

  assert.throws(
    () => pipe.transform({ ...validRequest, sendAmount: '5000' }, metadata),
    (error) => {
      assert.deepEqual(error.getResponse(), {
        error: 'VALIDATION_ERROR',
        message: 'sendAmount must be at least 10000',
      });
      return true;
    },
  );
});

test('leaves other parameter types and DTOs unchanged', () => {
  class OtherDto {}
  const value = { example: true };

  assert.equal(pipe.transform('T001', { type: 'param', metatype: String }), 'T001');
  assert.equal(pipe.transform(value, { type: 'query', metatype: CreateTransferDto }), value);
  assert.equal(pipe.transform(value, { type: 'body', metatype: OtherDto }), value);
  assert.equal(pipe.transform(value, { type: 'body' }), value);
});
