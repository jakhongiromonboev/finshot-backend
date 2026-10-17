import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { DatabaseService } from '../dist/components/database/database.service.js';
import { TransfersRepository } from '../dist/components/transfers/transfers.repository.js';
import { TransfersService } from '../dist/components/transfers/transfers.service.js';
import { CreateTransferDto } from '../dist/libs/dto/transfers/create-transfer.dto.js';
import { CreateTransferValidationPipe } from '../dist/libs/pipes/create-transfer-validation.pipe.js';

const request = {
  customerId: 'C001',
  sendCurrency: 'KRW',
  sendAmount: '500000',
  receiveCurrency: 'PHP',
  recipientName: 'Juan Dela Cruz',
};

function validatedDto(body = request) {
  return new CreateTransferValidationPipe().transform(body, {
    type: 'body', metatype: CreateTransferDto,
  });
}

async function createContext(t) {
  const originalPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ':memory:';
  let app;

  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  } finally {
    if (originalPath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalPath;
    }
  }

  t.after(() => app.close());
  const database = app.get(DatabaseService);

  return {
    service: app.get(TransfersService),
    repository: app.get(TransfersRepository),
    count: () => database.prepare('SELECT COUNT(*) AS count FROM transfers').get().count,
  };
}

function expectHttpError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.getStatus(), status);
    const response = error.getResponse();
    assert.deepEqual(Object.keys(response).sort(), ['error', 'message']);
    assert.equal(response.error, code);
    assert.equal(typeof response.message, 'string');
    assert.ok(response.message.length > 0);
    return true;
  });
}

test('create stores exact money, REQUESTED status, an ID and UTC creation time', async (t) => {
  const { service, repository, count } = await createContext(t);
  const transfer = service.create(validatedDto(), 'create-1');

  assert.deepEqual(transfer, {
    ...request,
    transferId: transfer.transferId,
    idempotencyKey: 'create-1',
    fee: '5000',
    totalDebit: '505000',
    receiveAmount: '20600.00',
    status: 'REQUESTED',
    createdAt: transfer.createdAt,
  });
  assert.equal(typeof transfer.transferId, 'string');
  assert.ok(transfer.transferId.length > 0);
  assert.equal(new Date(transfer.createdAt).toISOString(), transfer.createdAt);
  assert.deepEqual({ ...repository.findById(transfer.transferId) }, transfer);
  assert.equal(count(), 1);
});

test('replays the same request without inserting or resetting its status', async (t) => {
  const { service, repository, count } = await createContext(t);
  const original = service.create(validatedDto(), 'repeat-1');
  const repeated = service.create(validatedDto({ ...request, sendAmount: '000500000' }), 'repeat-1');

  assert.deepEqual({ ...repeated }, original);
  assert.equal(count(), 1);

  repository.cancelIfRequested(original.transferId);
  const afterCancellation = service.create(validatedDto(), 'repeat-1');
  assert.deepEqual({ ...afterCancellation }, { ...original, status: 'CANCELLED' });
  assert.equal(count(), 1);
});

test('rejects a reused key with a different request and preserves the original row', async (t) => {
  const { service, repository, count } = await createContext(t);
  const original = service.create(validatedDto(), 'conflict-1');

  for (const changedField of [
    { sendAmount: '600000' },
    { recipientName: 'Maria Santos' },
    { customerId: 'C002' },
    { customerId: 'C999' },
  ]) {
    expectHttpError(
      () => service.create(validatedDto({ ...request, ...changedField }), 'conflict-1'),
      409, 'CONFLICT',
    );
  }

  assert.deepEqual({ ...repository.findById(original.transferId) }, original);
  assert.equal(count(), 1);
});

test('different keys allow separate transfers for the same customer', async (t) => {
  const { service, count } = await createContext(t);
  const first = service.create(validatedDto(), 'first-key');
  const second = service.create(validatedDto(), 'second-key');

  assert.notEqual(first.transferId, second.transferId);
  assert.equal(count(), 2);
});

test('missing or invalid keys and nonexistent customers produce 400 without writes', async (t) => {
  const { service, count } = await createContext(t);

  for (const key of [undefined, '', ' \t\n', null, 123, ['key']]) {
    expectHttpError(() => service.create(validatedDto(), key), 400, 'VALIDATION_ERROR');
  }

  expectHttpError(
    () => service.create(validatedDto({ ...request, customerId: 'C999' }), 'unknown-customer'),
    400, 'VALIDATION_ERROR',
  );
  assert.equal(count(), 0);
});

for (const differentRequest of [false, true]) {
  test(`handles an insert conflict after the first lookup (different request: ${differentRequest})`, async (t) => {
    const { service, repository, count } = await createContext(t);
    const realInsert = repository.insert.bind(repository);
    let winner;

    // Simulate another writer winning between the lookup and insert, using real SQLite.
    t.mock.method(repository, 'insert', (attempt) => {
      winner = {
        ...attempt,
        transferId: 'other-writer-transfer',
        createdAt: '2026-10-17T00:00:00.000Z',
        recipientName: differentRequest ? 'Maria Santos' : attempt.recipientName,
      };
      assert.equal(realInsert(winner), true);
      return realInsert(attempt);
    });

    if (differentRequest) {
      expectHttpError(() => service.create(validatedDto(), 'race-key'), 409, 'CONFLICT');
    } else {
      const result = service.create(validatedDto(), 'race-key');
      assert.deepEqual({ ...result }, { ...winner, status: 'REQUESTED' });
    }

    assert.deepEqual(
      { ...repository.findByIdempotencyKey('race-key') },
      { ...winner, status: 'REQUESTED' },
    );
    assert.equal(count(), 1);
  });
}

test('does not disguise unexpected database errors as idempotency conflicts', async (t) => {
  const { service, repository, count } = await createContext(t);
  const failure = new Error('Database write failed');
  t.mock.method(repository, 'insert', () => { throw failure; });

  assert.throws(() => service.create(validatedDto(), 'failure-key'), (error) => error === failure);
  assert.equal(count(), 0);
});
