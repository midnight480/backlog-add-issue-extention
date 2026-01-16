/**
 * 入力バリデーション機能のプロパティベーステスト
 * Feature: backlog-issue-creator, Property 9: 必須フィールド検証の網羅性
 * 検証: 要件 6.3
 */

const fc = require('fast-check');

// テスト用のPopupUIクラスのモック
class MockPopupUI {
    constructor() {
        this.messageArea = { textContent: '', className: '', classList: { remove: jest.fn(), add: jest.fn() } };
        this.errors = [];
    }

    showMessage(message, type) {
        this.messageArea.textContent = message;
        this.messageArea.className = `message-area ${type}`;
    }

    showFieldError(field, message) {
        this.errors.push({ field: field.id || 'unknown', message });
        field.style = field.style || {};
        field.style.borderColor = '#dc3545';
    }

    hideFieldError(field) {
        field.style = field.style || {};
        field.style.borderColor = '';
    }

    focusFirstErrorField(context, errorField) {
        // モック実装
    }

    showValidationSummary(errors) {
        this.showMessage(`以下の項目を確認してください: ${errors.join('、')}`, 'error');
    }

    // バリデーション機能の実装
    validateApiKeyField(field) {
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'APIキーは必須です');
            return false;
        }

        if (value.length < 10) {
            this.showFieldError(field, 'APIキーが短すぎます');
            return false;
        }

        if (value.length > 200) {
            this.showFieldError(field, 'APIキーが長すぎます');
            return false;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            this.showFieldError(field, 'APIキーに無効な文字が含まれています');
            return false;
        }

        this.hideFieldError(field);
        return true;
    }

    validateDomainField(field) {
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'ドメインを入力してください');
            return false;
        }

        // Backlogドメインの形式をチェック（より柔軟な形式に対応）
        const backlogDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.(jp|com)$/;
        if (!backlogDomainPattern.test(value)) {
            this.showFieldError(field, '有効なBacklogドメインを入力してください（例: mycompany.backlog.jp）');
            return false;
        }

        // ドメイン名の長さチェック
        if (value.length > 100) {
            this.showFieldError(field, 'ドメイン名が長すぎます');
            return false;
        }

        this.hideFieldError(field);
        return true;
    }

    validateSummary(value) {
        const trimmedValue = value.trim();
        
        if (trimmedValue === '') {
            return false;
        }
        
        if (value.length > 255) {
            return false;
        }
        
        return true;
    }

    validateProjectSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery === '') {
            return true;
        }

        if (trimmedQuery.length > 100) {
            return false;
        }

        if (!/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/.test(trimmedQuery)) {
            return false;
        }

        return true;
    }

    validateAllInputs(context) {
        let isValid = true;
        const errors = [];

        if (context === 'apiKey') {
            const mockApiKeyField = { value: this.testApiKey || '', id: 'apiKey' };
            const mockDomainField = { value: this.testDomain || '', id: 'domain' };

            if (!this.validateApiKeyField(mockApiKeyField)) {
                isValid = false;
                errors.push('APIキー');
            }

            if (!this.validateDomainField(mockDomainField)) {
                isValid = false;
                errors.push('ドメイン');
            }

        } else if (context === 'issue') {
            if (!this.validateSummary(this.testSummary || '')) {
                isValid = false;
                errors.push('件名');
            }

            if (!this.testSelectedProject) {
                isValid = false;
                errors.push('プロジェクト');
            }
        }

        if (!isValid && errors.length > 0) {
            this.focusFirstErrorField(context, errors[0]);
            this.showValidationSummary(errors);
        }

        return isValid;
    }
}

describe('入力バリデーション機能のプロパティテスト', () => {
    let mockUI;

    beforeEach(() => {
        mockUI = new MockPopupUI();
    });

    /**
     * プロパティ9: 必須フィールド検証の網羅性
     * 任意の必須フィールドが未入力の状態で操作を実行した場合、適切な入力エラーメッセージが表示される
     */
    test('プロパティ9: 必須フィールド検証の網羅性 - APIキー', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    apiKey: fc.option(fc.string({ minLength: 0, maxLength: 300 }), { nil: '' }),
                    domain: fc.option(fc.string({ minLength: 0, maxLength: 150 }), { nil: '' })
                }),
                async (input) => {
                    // テストデータを設定
                    mockUI.testApiKey = input.apiKey;
                    mockUI.testDomain = input.domain;
                    mockUI.errors = [];

                    // バリデーション実行
                    const result = mockUI.validateAllInputs('apiKey');

                    // 必須フィールドが空の場合はバリデーションが失敗することを確認
                    const hasEmptyApiKey = !input.apiKey || input.apiKey.trim() === '';
                    const hasEmptyDomain = !input.domain || input.domain.trim() === '';
                    const hasInvalidApiKey = input.apiKey && (
                        input.apiKey.length < 10 || 
                        input.apiKey.length > 200 || 
                        !/^[a-zA-Z0-9_-]+$/.test(input.apiKey)
                    );
                    const hasInvalidDomain = input.domain && input.domain.trim() && (
                        input.domain.length > 100 ||
                        !/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.(jp|com)$/.test(input.domain.trim())
                    );

                    const shouldFail = hasEmptyApiKey || hasEmptyDomain || hasInvalidApiKey || hasInvalidDomain;

                    if (shouldFail) {
                        // バリデーションが失敗し、適切なエラーメッセージが表示されることを確認
                        expect(result).toBe(false);
                        expect(mockUI.errors.length).toBeGreaterThan(0);
                        
                        // エラーメッセージが適切に設定されていることを確認
                        if (hasEmptyApiKey || hasInvalidApiKey) {
                            expect(mockUI.errors.some(error => error.field === 'apiKey')).toBe(true);
                        }
                        if (hasEmptyDomain || hasInvalidDomain) {
                            expect(mockUI.errors.some(error => error.field === 'domain')).toBe(true);
                        }
                    } else {
                        // 有効な入力の場合はバリデーションが成功することを確認
                        expect(result).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('プロパティ9: 必須フィールド検証の網羅性 - 課題作成', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    summary: fc.option(fc.string({ minLength: 0, maxLength: 300 }), { nil: '' }),
                    hasProject: fc.boolean()
                }),
                async (input) => {
                    // テストデータを設定
                    mockUI.testSummary = input.summary;
                    mockUI.testSelectedProject = input.hasProject ? { id: '1', name: 'Test Project' } : null;
                    mockUI.errors = [];

                    // バリデーション実行
                    const result = mockUI.validateAllInputs('issue');

                    // 必須フィールドが空の場合はバリデーションが失敗することを確認
                    const hasEmptySummary = !input.summary || input.summary.trim() === '';
                    const hasInvalidSummary = input.summary && input.summary.length > 255;
                    const hasNoProject = !input.hasProject;

                    const shouldFail = hasEmptySummary || hasInvalidSummary || hasNoProject;

                    if (shouldFail) {
                        // バリデーションが失敗し、適切なエラーメッセージが表示されることを確認
                        expect(result).toBe(false);
                        
                        // バリデーションサマリーが表示されることを確認
                        expect(mockUI.messageArea.textContent).toContain('以下の項目を確認してください');
                        expect(mockUI.messageArea.className).toContain('error');
                    } else {
                        // 有効な入力の場合はバリデーションが成功することを確認
                        expect(result).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('プロパティ9: APIキーフィールドの個別バリデーション', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 0, maxLength: 300 }),
                async (apiKeyValue) => {
                    const mockField = { value: apiKeyValue, id: 'apiKey', style: {} };
                    mockUI.errors = [];

                    const result = mockUI.validateApiKeyField(mockField);

                    // バリデーション条件
                    const isEmpty = apiKeyValue.trim() === '';
                    const isTooShort = apiKeyValue.length > 0 && apiKeyValue.length < 10;
                    const isTooLong = apiKeyValue.length > 200;
                    const hasInvalidChars = apiKeyValue.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(apiKeyValue);

                    const shouldFail = isEmpty || isTooShort || isTooLong || hasInvalidChars;

                    if (shouldFail) {
                        expect(result).toBe(false);
                        expect(mockUI.errors.length).toBeGreaterThan(0);
                        expect(mockField.style.borderColor).toBe('#dc3545');
                    } else {
                        expect(result).toBe(true);
                        expect(mockField.style.borderColor).toBe('');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('プロパティ9: 件名フィールドのバリデーション', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 0, maxLength: 300 }),
                async (summaryValue) => {
                    const result = mockUI.validateSummary(summaryValue);

                    // バリデーション条件
                    const isEmpty = summaryValue.trim() === '';
                    const isTooLong = summaryValue.length > 255;

                    const shouldFail = isEmpty || isTooLong;

                    if (shouldFail) {
                        expect(result).toBe(false);
                    } else {
                        expect(result).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('プロパティ9: プロジェクト検索フィールドのバリデーション', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 0, maxLength: 150 }),
                async (searchQuery) => {
                    const result = mockUI.validateProjectSearch(searchQuery);

                    // バリデーション条件
                    const isEmpty = searchQuery.trim() === '';
                    const isTooLong = searchQuery.trim().length > 100;
                    const hasInvalidChars = searchQuery.trim().length > 0 && 
                        !/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/.test(searchQuery.trim());

                    // 空の検索は有効
                    if (isEmpty) {
                        expect(result).toBe(true);
                    } else if (isTooLong || hasInvalidChars) {
                        expect(result).toBe(false);
                    } else {
                        expect(result).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});