// Settings Panel のユニットテスト
// APIキー登録・変更・削除と状態表示のテスト

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

describe('Settings Panel Tests', () => {
    let popupUI;
    let mockSendMessage;

    beforeEach(async () => {
        // DOMを初期化
        document.documentElement.innerHTML = html;
        
        // CSSファイルを読み込み
        const css = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.css'), 'utf8');
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // Chrome runtime API のモック
        mockSendMessage = jest.fn((message, callback) => {
            if (typeof callback === 'function') {
                callback({ success: true });
            }
        });
        global.chrome = {
            ...global.chrome,
            runtime: {
                ...global.chrome.runtime,
                sendMessage: mockSendMessage
            }
        };

        // StateManagerを読み込み
        const stateManagerScript = fs.readFileSync(path.resolve(__dirname, '../shared/state-manager.js'), 'utf8');
        eval(stateManagerScript);

        // sidepanel.jsを読み込み
        const sidepanelScript = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.js'), 'utf8');
        eval(sidepanelScript);

        // DOMContentLoadedイベントを手動で発火
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        popupUI = window.sidePanelUI;

        // 非同期の初期化処理を待機
        await new Promise(resolve => setTimeout(resolve, 100));

        // 初期化時の通信をクリア
        mockSendMessage.mockClear();
    });

    afterEach(() => {
        // DOMをクリーンアップ
        document.documentElement.innerHTML = '';
        delete window.popupUI;
        jest.clearAllMocks();
    });

    describe('初期化テスト', () => {
        test('Settings Panel の DOM要素が正しく取得される', () => {
            expect(popupUI.apiKeyNotRegistered).toBeTruthy();
            expect(popupUI.apiKeyRegistered).toBeTruthy();
            expect(popupUI.apiKeyChange).toBeTruthy();
            expect(popupUI.apiKeyInput).toBeTruthy();
            expect(popupUI.domainInput).toBeTruthy();
            expect(popupUI.registerApiKeyBtn).toBeTruthy();
            expect(popupUI.changeApiKeyBtn).toBeTruthy();
            expect(popupUI.deleteApiKeyBtn).toBeTruthy();
        });

        test('初期状態でAPIキー状態の読み込みが実行される', async () => {
            // beforeEachでクリアされているため、再度initを呼び出して検証
            mockSendMessage.mockClear();
            await popupUI.init();

            // loadApiKeyStatus が呼ばれることを確認
            expect(mockSendMessage).toHaveBeenCalledWith(
                { action: 'getApiKey' },
                expect.any(Function)
            );
        });
    });

    describe('画面表示切り替えテスト', () => {
        test('APIキー未登録画面が正しく表示される', () => {
            popupUI.showApiKeyNotRegisteredView();

            expect(popupUI.apiKeyNotRegistered.classList.contains('hidden')).toBe(false);
            expect(popupUI.apiKeyRegistered.classList.contains('hidden')).toBe(true);
            expect(popupUI.apiKeyChange.classList.contains('hidden')).toBe(true);
            expect(popupUI.apiKeyInput.value).toBe('');
            expect(popupUI.domainInput.value).toBe('');
        });

        test('APIキー登録済み画面が正しく表示される', () => {
            popupUI.showApiKeyRegisteredView();

            expect(popupUI.apiKeyNotRegistered.classList.contains('hidden')).toBe(true);
            expect(popupUI.apiKeyRegistered.classList.contains('hidden')).toBe(false);
            expect(popupUI.apiKeyChange.classList.contains('hidden')).toBe(true);
        });

        test('APIキー変更フォームが正しく表示される', () => {
            popupUI.showApiKeyChangeForm();

            expect(popupUI.apiKeyNotRegistered.classList.contains('hidden')).toBe(true);
            expect(popupUI.apiKeyRegistered.classList.contains('hidden')).toBe(true);
            expect(popupUI.apiKeyChange.classList.contains('hidden')).toBe(false);
            expect(popupUI.newApiKeyInput.value).toBe('');
            expect(popupUI.newDomainInput.value).toBe('');
        });
    });

    describe('APIキー登録テスト', () => {
        test('有効な入力でAPIキー登録が実行される', async () => {
            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                if (message.action === 'saveApiKey') {
                    callback({ success: true, message: 'APIキーが保存されました' });
                }
            });

            // 入力値を設定
            popupUI.apiKeyInput.value = 'test-api-key';
            popupUI.domainInput.value = 'test.backlog.jp';

            // 登録ボタンをクリック
            await popupUI.handleRegisterApiKey();

            // APIキー保存が呼ばれることを確認
            expect(mockSendMessage).toHaveBeenCalledWith(
                { 
                    action: 'saveApiKey', 
                    apiKey: 'test-api-key', 
                    domain: 'test.backlog.jp' 
                },
                expect.any(Function)
            );
        });

        test('APIキーが空の場合エラーメッセージが表示される', async () => {
            // 空の入力値
            popupUI.apiKeyInput.value = '';
            popupUI.domainInput.value = 'test.backlog.jp';

            await popupUI.handleRegisterApiKey();

            const errorElement = popupUI.apiKeyInput.parentNode.querySelector('.field-error');
            expect(errorElement.textContent).toBe('APIキーは必須です');
            expect(errorElement.classList.contains('hidden')).toBe(false);

            expect(mockSendMessage).not.toHaveBeenCalledWith(
                expect.objectContaining({ action: 'saveApiKey' }),
                expect.any(Function)
            );
        });

        test('ドメインが未選択の場合エラーメッセージが表示される', async () => {
            // ドメイン未選択
            popupUI.apiKeyInput.value = 'test-api-key';
            popupUI.domainInput.value = '';

            await popupUI.handleRegisterApiKey();

            const errorElement = popupUI.domainInput.parentNode.querySelector('.field-error');
            expect(errorElement.textContent).toBe('ドメインを入力してください');
            expect(errorElement.classList.contains('hidden')).toBe(false);

            expect(mockSendMessage).not.toHaveBeenCalledWith(
                expect.objectContaining({ action: 'saveApiKey' }),
                expect.any(Function)
            );
        });

        test('Enterキーで登録処理が実行される', () => {
            const handleRegisterSpy = jest.spyOn(popupUI, 'handleRegisterApiKey');

            // Enterキーイベントを発火
            const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
            popupUI.apiKeyInput.dispatchEvent(enterEvent);

            expect(handleRegisterSpy).toHaveBeenCalled();
        });
    });

    describe('APIキー更新テスト', () => {
        test('有効な入力でAPIキー更新が実行される', async () => {
            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                if (message.action === 'saveApiKey') {
                    callback({ success: true, message: 'APIキーが更新されました' });
                }
            });

            // 変更フォームを表示
            popupUI.showApiKeyChangeForm();

            // 入力値を設定
            popupUI.newApiKeyInput.value = 'new-test-api-key';
            popupUI.newDomainInput.value = 'test.backlog.com';

            // 更新ボタンをクリック
            await popupUI.handleUpdateApiKey();

            // APIキー保存が呼ばれることを確認
            expect(mockSendMessage).toHaveBeenCalledWith(
                { 
                    action: 'saveApiKey', 
                    apiKey: 'new-test-api-key', 
                    domain: 'test.backlog.com' 
                },
                expect.any(Function)
            );
        });

        test('新しいAPIキーが空の場合エラーメッセージが表示される', async () => {
            // 変更フォームを表示
            popupUI.showApiKeyChangeForm();

            // 空の入力値
            popupUI.newApiKeyInput.value = '';
            popupUI.newDomainInput.value = 'test.backlog.jp';

            await popupUI.handleUpdateApiKey();

            const errorElement = popupUI.newApiKeyInput.parentNode.querySelector('.field-error');
            expect(errorElement.textContent).toBe('APIキーは必須です');
            expect(errorElement.classList.contains('hidden')).toBe(false);
        });
    });

    describe('APIキー削除テスト', () => {
        test('確認ダイアログでOKを選択した場合削除が実行される', async () => {
            // confirm をモック
            global.confirm = jest.fn(() => true);

            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                if (message.action === 'deleteApiKey') {
                    callback({ success: true, message: 'APIキーが削除されました' });
                }
            });

            await popupUI.handleDeleteApiKey();

            expect(global.confirm).toHaveBeenCalledWith('APIキーを削除しますか？この操作は取り消せません。');
            expect(mockSendMessage).toHaveBeenCalledWith(
                { action: 'deleteApiKey' },
                expect.any(Function)
            );
        });

        test('確認ダイアログでキャンセルを選択した場合削除が実行されない', async () => {
            // confirm をモック（キャンセル）
            global.confirm = jest.fn(() => false);

            await popupUI.handleDeleteApiKey();

            expect(global.confirm).toHaveBeenCalled();
            expect(mockSendMessage).not.toHaveBeenCalledWith(
                expect.objectContaining({ action: 'deleteApiKey' }),
                expect.any(Function)
            );
        });
    });

    describe('状態表示テスト', () => {
        test('APIキー登録済み状態が正しく表示される', async () => {
            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                if (message.action === 'getApiKey') {
                    callback({ 
                        success: true, 
                        domain: 'test.backlog.jp',
                        createdAt: '2024-01-01T00:00:00.000Z'
                    });
                }
            });

            await popupUI.loadApiKeyStatus();

            expect(popupUI.registeredDomain.textContent).toBe('test.backlog.jp');
            expect(popupUI.registeredDate.textContent).toBe('2024/1/1');
            expect(popupUI.apiKeyRegistered.classList.contains('hidden')).toBe(false);
            expect(popupUI.apiKeyNotRegistered.classList.contains('hidden')).toBe(true);
        });

        test('APIキー未登録状態が正しく表示される', async () => {
            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                if (message.action === 'getApiKey') {
                    callback({ success: false, message: 'APIキーが登録されていません' });
                }
            });

            await popupUI.loadApiKeyStatus();

            expect(popupUI.apiKeyNotRegistered.classList.contains('hidden')).toBe(false);
            expect(popupUI.apiKeyRegistered.classList.contains('hidden')).toBe(true);
        });
    });

    describe('ボタンクリックイベントテスト', () => {
        test('変更ボタンクリックで変更フォームが表示される', () => {
            const showChangeFormSpy = jest.spyOn(popupUI, 'showApiKeyChangeForm');

            popupUI.changeApiKeyBtn.click();

            expect(showChangeFormSpy).toHaveBeenCalled();
        });

        test('キャンセルボタンクリックで登録済み画面が表示される', () => {
            const showRegisteredViewSpy = jest.spyOn(popupUI, 'showApiKeyRegisteredView');

            popupUI.cancelChangeBtn.click();

            expect(showRegisteredViewSpy).toHaveBeenCalled();
        });
    });

    describe('Background通信テスト', () => {
        test('sendMessageToBackground が正しく動作する', async () => {
            // モックレスポンスを設定
            mockSendMessage.mockImplementation((message, callback) => {
                callback({ success: true, data: 'test' });
            });

            const result = await popupUI.sendMessageToBackground('testAction', { test: 'data' });

            expect(mockSendMessage).toHaveBeenCalledWith(
                { action: 'testAction', test: 'data' },
                expect.any(Function)
            );
            expect(result).toEqual({ success: true, data: 'test' });
        });

        test('Chrome runtime エラーが正しく処理される', async () => {
            // Chrome runtime エラーをモック
            global.chrome.runtime.lastError = { message: 'Test error' };
            mockSendMessage.mockImplementation((message, callback) => {
                callback(null);
            });

            await expect(popupUI.sendMessageToBackground('testAction')).rejects.toThrow('Test error');

            // エラー状態をクリア
            delete global.chrome.runtime.lastError;
        });
    });
});