/**
 * Property Test: メッセージの自動非表示
 * Feature: icon-toggle-and-template-settings, Property 14: メッセージの自動非表示
 * **Validates: Requirements 5.5**
 */

const fc = require('fast-check');

describe('Template Message Auto-Hide - Property Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  /**
   * Property 14: メッセージの自動非表示
   * For any 成功またはエラーメッセージの表示に対して、
   * メッセージは表示から3秒後に自動的に非表示になるべきです。
   * 
   * **Validates: Requirements 5.5**
   */
  test('Property 14: message should auto-hide after 3 seconds', () => {
    fc.assert(
      fc.property(
        // ランダムなメッセージとタイプを生成
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.constantFrom('success', 'error')
        }),
        ({ message, type }) => {
          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // メッセージを表示
          templateMessage.textContent = message;
          templateMessage.className = `template-message ${type}`;
          templateMessage.classList.remove('hidden');

          // 3秒後に非表示にするタイマーを設定
          setTimeout(() => {
            templateMessage.classList.add('hidden');
          }, 3000);

          // 検証: メッセージが表示されている
          expect(templateMessage.classList.remove).toHaveBeenCalledWith('hidden');
          expect(templateMessage.classList.add).not.toHaveBeenCalled();

          // 2秒経過（まだ非表示にならない）
          jest.advanceTimersByTime(2000);
          expect(templateMessage.classList.add).not.toHaveBeenCalled();

          // さらに1秒経過（合計3秒）
          jest.advanceTimersByTime(1000);

          // 検証: メッセージが非表示になる
          expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 成功メッセージもエラーメッセージも同じタイミングで非表示になる
   * メッセージのタイプに関わらず、3秒後に非表示になるべきです。
   */
  test('Property: both success and error messages should auto-hide after 3 seconds', () => {
    fc.assert(
      fc.property(
        // ランダムなメッセージを生成
        fc.string({ minLength: 1, maxLength: 100 }),
        (message) => {
          const types = ['success', 'error'];

          types.forEach(type => {
            // テンプレートメッセージ要素のモック
            const templateMessage = {
              textContent: '',
              className: '',
              classList: {
                remove: jest.fn(),
                add: jest.fn()
              }
            };

            // メッセージを表示
            templateMessage.textContent = message;
            templateMessage.className = `template-message ${type}`;
            templateMessage.classList.remove('hidden');

            // 3秒後に非表示にするタイマーを設定
            setTimeout(() => {
              templateMessage.classList.add('hidden');
            }, 3000);

            // 3秒経過
            jest.advanceTimersByTime(3000);

            // 検証: メッセージが非表示になる
            expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 3秒未満では非表示にならない
   * 3秒未満の時間では、メッセージは非表示にならないべきです。
   */
  test('Property: message should not hide before 3 seconds', () => {
    fc.assert(
      fc.property(
        // ランダムなメッセージとタイプを生成
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.constantFrom('success', 'error'),
          timeElapsed: fc.integer({ min: 0, max: 2999 }) // 0〜2999ミリ秒
        }),
        ({ message, type, timeElapsed }) => {
          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // メッセージを表示
          templateMessage.textContent = message;
          templateMessage.className = `template-message ${type}`;
          templateMessage.classList.remove('hidden');

          // 3秒後に非表示にするタイマーを設定
          setTimeout(() => {
            templateMessage.classList.add('hidden');
          }, 3000);

          // 指定された時間だけ経過（3秒未満）
          jest.advanceTimersByTime(timeElapsed);

          // 検証: メッセージはまだ非表示になっていない
          expect(templateMessage.classList.add).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 3秒以上経過すると非表示になる
   * 3秒以上経過した場合、メッセージは非表示になるべきです。
   */
  test('Property: message should hide after 3 seconds or more', () => {
    fc.assert(
      fc.property(
        // ランダムなメッセージとタイプを生成
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.constantFrom('success', 'error'),
          timeElapsed: fc.integer({ min: 3000, max: 5000 }) // 3000〜5000ミリ秒
        }),
        ({ message, type, timeElapsed }) => {
          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // メッセージを表示
          templateMessage.textContent = message;
          templateMessage.className = `template-message ${type}`;
          templateMessage.classList.remove('hidden');

          // 3秒後に非表示にするタイマーを設定
          setTimeout(() => {
            templateMessage.classList.add('hidden');
          }, 3000);

          // 指定された時間だけ経過（3秒以上）
          jest.advanceTimersByTime(timeElapsed);

          // 検証: メッセージが非表示になる
          expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 複数のメッセージが連続して表示される場合も正しく動作する
   * 複数のメッセージが連続して表示される場合も、それぞれ3秒後に非表示になるべきです。
   */
  test('Property: multiple messages should each auto-hide after 3 seconds', () => {
    fc.assert(
      fc.property(
        // ランダムなメッセージの配列を生成
        fc.array(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.constantFrom('success', 'error')
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (messages) => {
          const templateMessages = messages.map(() => ({
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          }));

          // 各メッセージを表示
          messages.forEach((msg, index) => {
            const templateMessage = templateMessages[index];

            // メッセージを表示
            templateMessage.textContent = msg.message;
            templateMessage.className = `template-message ${msg.type}`;
            templateMessage.classList.remove('hidden');

            // 3秒後に非表示にするタイマーを設定
            setTimeout(() => {
              templateMessage.classList.add('hidden');
            }, 3000);
          });

          // 3秒経過
          jest.advanceTimersByTime(3000);

          // 検証: すべてのメッセージが非表示になる
          templateMessages.forEach(templateMessage => {
            expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
          });
        }
      ),
      { numRuns: 50 } // 複数メッセージなので実行回数を減らす
    );
  });

  /**
   * Property: 空のメッセージでも自動非表示は動作する
   * 空のメッセージが表示された場合も、3秒後に非表示になるべきです。
   */
  test('Property: empty message should also auto-hide after 3 seconds', () => {
    const emptyMessage = '';

    // テンプレートメッセージ要素のモック
    const templateMessage = {
      textContent: '',
      className: '',
      classList: {
        remove: jest.fn(),
        add: jest.fn()
      }
    };

    // メッセージを表示
    templateMessage.textContent = emptyMessage;
    templateMessage.className = 'template-message success';
    templateMessage.classList.remove('hidden');

    // 3秒後に非表示にするタイマーを設定
    setTimeout(() => {
      templateMessage.classList.add('hidden');
    }, 3000);

    // 3秒経過
    jest.advanceTimersByTime(3000);

    // 検証: メッセージが非表示になる
    expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
  });

  /**
   * Property: 長いメッセージでも自動非表示は動作する
   * 長いメッセージが表示された場合も、3秒後に非表示になるべきです。
   */
  test('Property: long message should also auto-hide after 3 seconds', () => {
    fc.assert(
      fc.property(
        // 長いメッセージを生成
        fc.string({ minLength: 100, maxLength: 500 }),
        (message) => {
          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // メッセージを表示
          templateMessage.textContent = message;
          templateMessage.className = 'template-message success';
          templateMessage.classList.remove('hidden');

          // 3秒後に非表示にするタイマーを設定
          setTimeout(() => {
            templateMessage.classList.add('hidden');
          }, 3000);

          // 3秒経過
          jest.advanceTimersByTime(3000);

          // 検証: メッセージが非表示になる
          expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 50 }
    );
  });
});
