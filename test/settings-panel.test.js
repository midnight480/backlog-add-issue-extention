// Settings Panel のユニットテスト
// スペース管理とテンプレート設定のテスト

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
        test('Settings Panel のテンプレート関連DOM要素が正しく取得される', () => {
            expect(popupUI.templateEditor).toBeTruthy();
            expect(popupUI.templateIssueTypeSelect).toBeTruthy();
            expect(popupUI.templateSpaceSelect).toBeTruthy();
            expect(popupUI.templateProjectSelect).toBeTruthy();
            expect(popupUI.saveTemplateBtn).toBeTruthy();
            expect(popupUI.resetTemplateBtn).toBeTruthy();
        });

        test('Settings Panel のスペース管理DOM要素が正しく取得される', () => {
            expect(popupUI.spaceList).toBeTruthy();
            expect(popupUI.addSpaceBtn).toBeTruthy();
            expect(popupUI.spaceAddForm).toBeTruthy();
        });
    });

    describe('テンプレートスペース・プロジェクト選択テスト', () => {
        test('テンプレート用プロジェクトセレクトが初期状態でdisabledである', () => {
            expect(popupUI.templateProjectSelect.disabled).toBe(true);
        });

        test('テンプレート用課題種別セレクトが初期状態でdisabledである', () => {
            expect(popupUI.templateIssueTypeSelect.disabled).toBe(true);
        });

        test('スペース一覧がテンプレート用スペースセレクトに反映される', () => {
            popupUI.spaces = [
                { id: 'space1', name: 'テストスペース1', domain: 'test1.backlog.jp' },
                { id: 'space2', name: 'テストスペース2', domain: 'test2.backlog.jp' }
            ];
            popupUI.populateTemplateSpaceSelect();

            // デフォルトオプション + 2スペース = 3オプション
            expect(popupUI.templateSpaceSelect.options.length).toBe(3);
            expect(popupUI.templateSpaceSelect.options[1].value).toBe('space1');
            expect(popupUI.templateSpaceSelect.options[2].value).toBe('space2');
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
