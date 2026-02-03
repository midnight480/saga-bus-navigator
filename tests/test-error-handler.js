#!/usr/bin/env node
/**
 * エラーハンドリングモジュールの簡易テスト
 * Node.jsで直接実行可能
 */

const {
  Logger,
  ErrorHandler,
  RetryHandler,
  GTFSError,
  ErrorCategory
} = require('../scripts/error-handler');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    console.error(`  期待値: ${expected}`);
    console.error(`  実際の値: ${actual}`);
    testsFailed++;
  }
}

console.log('\n=== エラーハンドリングモジュールのテスト ===\n');

// Loggerのテスト
console.log('--- Loggerのテスト ---');
const logger = new Logger('test-context');
assert(logger.context === 'test-context', 'Loggerのコンテキストが設定される');

// GTFSErrorのテスト
console.log('\n--- GTFSErrorのテスト ---');
const error = new GTFSError('テストエラー', ErrorCategory.DATA_CONVERSION, { detail: 'test' });
assert(error.message === 'テストエラー', 'エラーメッセージが設定される');
assert(error.category === ErrorCategory.DATA_CONVERSION, 'エラーカテゴリが設定される');
assert(error.details.detail === 'test', 'エラー詳細が設定される');
assert(error.timestamp !== undefined, 'タイムスタンプが設定される');

const errorJson = error.toJSON();
assert(errorJson.name === 'GTFSError', 'JSON変換でnameが含まれる');
assert(errorJson.message === 'テストエラー', 'JSON変換でmessageが含まれる');
assert(errorJson.category === ErrorCategory.DATA_CONVERSION, 'JSON変換でcategoryが含まれる');

// ErrorHandlerのテスト
console.log('\n--- ErrorHandlerのテスト ---');
const errorHandler = new ErrorHandler(logger);

const originalError = new Error('元のエラー');
const wrappedError = errorHandler.wrapError(
  originalError,
  ErrorCategory.KV_OPERATION,
  'テストコンテキスト'
);
assert(wrappedError instanceof GTFSError, 'エラーがGTFSErrorにラップされる');
assert(wrappedError.message.includes('テストコンテキスト'), 'ラップされたエラーにコンテキストが含まれる');
assert(wrappedError.category === ErrorCategory.KV_OPERATION, 'ラップされたエラーのカテゴリが正しい');

// GTFSErrorはそのまま返される
const gtfsError = new GTFSError('テスト', ErrorCategory.NETWORK);
const result = errorHandler.wrapError(gtfsError, ErrorCategory.DATA_CONVERSION, 'コンテキスト');
assert(result === gtfsError, 'GTFSErrorはそのまま返される');

// RetryHandlerのテスト
console.log('\n--- RetryHandlerのテスト ---');
const retryHandler = new RetryHandler(logger);

// 成功する関数のテスト
(async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    return 'success';
  };

  const result = await retryHandler.retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelay: 10
  });

  assertEquals(result, 'success', '成功する関数は正しい結果を返す');
  assertEquals(callCount, 1, '成功する関数は1回だけ呼ばれる');

  // リトライ可能なエラーのテスト
  callCount = 0;
  const retryFn = async () => {
    callCount++;
    if (callCount < 3) {
      throw new Error('429 Too Many Requests');
    }
    return 'success';
  };

  const retryResult = await retryHandler.retryWithBackoff(retryFn, {
    maxAttempts: 5,
    initialDelay: 10
  });

  assertEquals(retryResult, 'success', 'リトライ可能なエラーは最終的に成功する');
  assertEquals(callCount, 3, 'リトライ可能なエラーは3回呼ばれる');

  // リトライ不可能なエラーのテスト
  const noRetryFn = async () => {
    throw new Error('Invalid data');
  };

  try {
    await retryHandler.retryWithBackoff(noRetryFn, {
      maxAttempts: 3,
      initialDelay: 10
    });
    assert(false, 'リトライ不可能なエラーは例外を投げる（失敗）');
  } catch (e) {
    assert(e.message === 'Invalid data', 'リトライ不可能なエラーは即座に投げられる');
  }

  // 最大試行回数のテスト
  const maxRetryFn = async () => {
    throw new Error('429 Too Many Requests');
  };

  try {
    await retryHandler.retryWithBackoff(maxRetryFn, {
      maxAttempts: 2,
      initialDelay: 10
    });
    assert(false, '最大試行回数に達したらエラーを投げる（失敗）');
  } catch (e) {
    assert(e instanceof GTFSError, '最大試行回数に達したらGTFSErrorを投げる');
    assert(e.message.includes('最大リトライ回数'), 'エラーメッセージに最大リトライ回数が含まれる');
  }

  // テスト結果のサマリー
  console.log('\n=== テスト結果 ===');
  console.log(`成功: ${testsPassed}件`);
  console.log(`失敗: ${testsFailed}件`);
  console.log(`合計: ${testsPassed + testsFailed}件\n`);

  if (testsFailed > 0) {
    console.error('✗ テストが失敗しました');
    process.exit(1);
  } else {
    console.log('✓ 全てのテストが成功しました');
    process.exit(0);
  }
})();
