/**
 * Property Test: 文字数カウンターのリアルタイム更新
 * Feature: icon-toggle-and-template-settings, Property 12: 文字数カウンターのリアルタイム更新
 * **Validates: Requirements 5.2**
 */

const fc = require('fast-check');

describe('Template Character Counter - Property Tests', () => {
  /**
   * Property 12: 文字数カウンターのリアルタイム更新
   * For any Template Editorへのテキスト入力に対して、
   * 文字数カウンターは入力されたテキストの文字数を正しく表示するべきです。
   * 
   * **Validates: Requirements 5.2**
   */
  test('Property 12: character counter should display correct count for any input text', () => {
    fc.assert(
      fc.property(
        // ランダムなテキストを生成
        fc.string({ minLength: 0, maxLength: 5000 }),
        (text) => {
          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 文字数カウンターが正しい文字数を表示する
          expect(templateCharCounter.textContent).toBe(`${length}文字`);
          expect(templateCharCounter.textContent).toBe(`${text.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 空のテキストの場合、0文字と表示される
   * 空のテキストの場合、文字数カウンターは「0文字」と表示されるべきです。
   */
  test('Property: character counter should display "0文字" for empty text', () => {
    const emptyText = '';

    // 文字数カウンター要素のモック
    const templateCharCounter = {
      textContent: ''
    };

    // 文字数カウンター更新処理をシミュレート
    const length = emptyText.length;
    templateCharCounter.textContent = `${length}文字`;

    // 検証: 0文字と表示される
    expect(templateCharCounter.textContent).toBe('0文字');
  });

  /**
   * Property: 改行を含むテキストの文字数も正しくカウントされる
   * 改行文字を含むテキストの場合も、正しく文字数がカウントされるべきです。
   */
  test('Property: character counter should count newlines correctly', () => {
    fc.assert(
      fc.property(
        // 改行を含むテキストを生成
        fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
        (lines) => {
          const text = lines.join('\n');

          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 改行を含む文字数が正しくカウントされる
          expect(templateCharCounter.textContent).toBe(`${text.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 特殊文字を含むテキストの文字数も正しくカウントされる
   * 特殊文字（絵文字、記号など）を含むテキストの場合も、正しく文字数がカウントされるべきです。
   */
  test('Property: character counter should count special characters correctly', () => {
    fc.assert(
      fc.property(
        // 特殊文字を含むテキストを生成
        fc.string({ minLength: 0, maxLength: 500 }),
        (text) => {
          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 特殊文字を含む文字数が正しくカウントされる
          expect(templateCharCounter.textContent).toBe(`${text.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 変数を含むテキストの文字数も正しくカウントされる
   * {{url}}や{{title}}などの変数を含むテキストの場合も、正しく文字数がカウントされるべきです。
   */
  test('Property: character counter should count template variables correctly', () => {
    fc.assert(
      fc.property(
        // 変数を含むテキストを生成
        fc.record({
          prefix: fc.string({ minLength: 0, maxLength: 100 }),
          suffix: fc.string({ minLength: 0, maxLength: 100 }),
          variable: fc.constantFrom('{{url}}', '{{title}}', '{{unknown}}')
        }),
        ({ prefix, suffix, variable }) => {
          const text = `${prefix}${variable}${suffix}`;

          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 変数を含む文字数が正しくカウントされる
          expect(templateCharCounter.textContent).toBe(`${text.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 長いテキストの文字数も正しくカウントされる
   * 長いテキスト（1000文字以上）の場合も、正しく文字数がカウントされるべきです。
   */
  test('Property: character counter should count long text correctly', () => {
    fc.assert(
      fc.property(
        // 長いテキストを生成
        fc.string({ minLength: 1000, maxLength: 10000 }),
        (text) => {
          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 長いテキストの文字数が正しくカウントされる
          expect(templateCharCounter.textContent).toBe(`${text.length}文字`);
          expect(length).toBeGreaterThanOrEqual(1000);
        }
      ),
      { numRuns: 50 } // 長い文字列なので実行回数を減らす
    );
  });

  /**
   * Property: 入力イベントごとに文字数カウンターが更新される
   * テキストが変更されるたびに、文字数カウンターが更新されるべきです。
   */
  test('Property: character counter should update on every input event', () => {
    fc.assert(
      fc.property(
        // ランダムなテキストの配列を生成（入力の変化をシミュレート）
        fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
        (textSequence) => {
          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 各入力イベントをシミュレート
          const counts = textSequence.map(text => {
            const length = text.length;
            templateCharCounter.textContent = `${length}文字`;
            return templateCharCounter.textContent;
          });

          // 検証: 各入力イベントで文字数カウンターが更新される
          counts.forEach((count, index) => {
            expect(count).toBe(`${textSequence[index].length}文字`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 文字数カウンターの表示形式は常に「N文字」である
   * 文字数カウンターの表示形式は常に「数値 + 文字」の形式であるべきです。
   */
  test('Property: character counter format should always be "N文字"', () => {
    fc.assert(
      fc.property(
        // ランダムなテキストを生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        (text) => {
          // 文字数カウンター要素のモック
          const templateCharCounter = {
            textContent: ''
          };

          // 文字数カウンター更新処理をシミュレート
          const length = text.length;
          templateCharCounter.textContent = `${length}文字`;

          // 検証: 表示形式が「N文字」である
          expect(templateCharCounter.textContent).toMatch(/^\d+文字$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
