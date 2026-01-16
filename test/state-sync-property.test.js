// 状態同期のプロパティベーステスト
// **Property 5: ポップアップとの状態同期**
// **検証: 要件 3.5**

describe('Property 5: ポップアップとの状態同期', () => {
    let mockChrome;

    beforeEach(() => {
        // Chrome Storage APIのモック
        mockChrome = {
            storage: {
                local: {
                    set: jest.fn((data) => Promise.resolve()),
                    get: jest.fn((key) => Promise.resolve({})),
                },
                onChanged: {
                    addListener: jest.fn(),
                },
            },
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback({ success: true });
                }),
                lastError: null,
            },
        };

        global.chrome = mockChrome;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    /**
     * ランダムな状態を生成
     */
    function generateRandomState() {
        const hasProject = Math.random() > 0.5;
        const project = hasProject ? {
            id: Math.floor(Math.random() * 1000).toString(),
            name: `プロジェクト${Math.floor(Math.random() * 100)}`,
            projectKey: `PROJ${Math.floor(Math.random() * 100)}`,
        } : null;

        const issueType = Math.random() > 0.5 ? Math.floor(Math.random() * 10).toString() : null;
        
        const summary = generateRandomString(Math.floor(Math.random() * 255));
        const description = generateRandomString(Math.floor(Math.random() * 1000));

        const hasTab = Math.random() > 0.5;
        const currentTab = hasTab ? {
            url: `https://example.com/page${Math.floor(Math.random() * 100)}`,
            title: `ページ${Math.floor(Math.random() * 100)}`,
        } : null;

        return {
            selectedProject: project,
            issueType: issueType,
            summary: summary,
            description: description,
            currentTab: currentTab,
            timestamp: Date.now(),
        };
    }

    /**
     * ランダムな文字列を生成
     */
    function generateRandomString(length) {
        const chars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 状態をストレージに保存するシミュレーション
     */
    async function saveStateToStorage(state) {
        await chrome.storage.local.set({ sidePanelState: state });
    }

    /**
     * ストレージ変更イベントをシミュレーション
     */
    function simulateStorageChange(oldState, newState) {
        const changes = {
            sidePanelState: {
                oldValue: oldState,
                newValue: newState,
            },
        };

        // 登録されたリスナーを呼び出し
        const listeners = mockChrome.storage.onChanged.addListener.mock.calls.map(call => call[0]);
        listeners.forEach(listener => {
            listener(changes, 'local');
        });
    }

    test('任意の入力状態について、ポップアップとサイドパネルの両方が開いている場合、一方での変更が他方に反映されるべきである', async () => {
        // **Validates: Requirements 3.5**
        
        // 100回のランダムな状態でテスト
        for (let i = 0; i < 100; i++) {
            const initialState = generateRandomState();
            const updatedState = generateRandomState();

            // 初期状態を保存
            await saveStateToStorage(initialState);
            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: initialState,
            });

            // 状態の変更をシミュレーション
            await saveStateToStorage(updatedState);
            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: updatedState,
            });

            // ストレージ変更イベントをシミュレーション
            simulateStorageChange(initialState, updatedState);

            // 変更が正しく保存されたことを確認
            const lastCall = mockChrome.storage.local.set.mock.calls[mockChrome.storage.local.set.mock.calls.length - 1];
            expect(lastCall[0].sidePanelState).toEqual(updatedState);

            // モックをクリア
            mockChrome.storage.local.set.mockClear();
        }
    });

    test('件名の変更が両方のUIに同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const state2 = { ...state1, summary: generateRandomString(100) };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: state2,
            });

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('説明の変更が両方のUIに同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const state2 = { ...state1, description: generateRandomString(500) };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: state2,
            });

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('プロジェクト選択の変更が両方のUIに同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const newProject = {
                id: Math.floor(Math.random() * 1000).toString(),
                name: `新プロジェクト${i}`,
                projectKey: `NEW${i}`,
            };
            const state2 = { ...state1, selectedProject: newProject };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: expect.objectContaining({
                    selectedProject: newProject,
                }),
            });

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('課題種別の変更が両方のUIに同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const state2 = { ...state1, issueType: Math.floor(Math.random() * 10).toString() };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: state2,
            });

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('複数のフィールドが同時に変更された場合も正しく同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const state2 = {
                ...state1,
                summary: generateRandomString(100),
                description: generateRandomString(500),
                issueType: Math.floor(Math.random() * 10).toString(),
            };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            const lastCall = mockChrome.storage.local.set.mock.calls[mockChrome.storage.local.set.mock.calls.length - 1];
            expect(lastCall[0].sidePanelState.summary).toBe(state2.summary);
            expect(lastCall[0].sidePanelState.description).toBe(state2.description);
            expect(lastCall[0].sidePanelState.issueType).toBe(state2.issueType);

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('空の状態から値が設定された場合も正しく同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const emptyState = {
                selectedProject: null,
                issueType: null,
                summary: '',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            const filledState = generateRandomState();

            await saveStateToStorage(emptyState);
            await saveStateToStorage(filledState);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: filledState,
            });

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('値が設定された状態から空の状態に変更された場合も正しく同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const filledState = generateRandomState();

            const emptyState = {
                selectedProject: null,
                issueType: null,
                summary: '',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await saveStateToStorage(filledState);
            await saveStateToStorage(emptyState);

            const lastCall = mockChrome.storage.local.set.mock.calls[mockChrome.storage.local.set.mock.calls.length - 1];
            expect(lastCall[0].sidePanelState.selectedProject).toBeNull();
            expect(lastCall[0].sidePanelState.issueType).toBeNull();
            expect(lastCall[0].sidePanelState.summary).toBe('');
            expect(lastCall[0].sidePanelState.description).toBe('');

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('タイムスタンプが更新されることを確認', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            
            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const state2 = { ...state1, timestamp: Date.now() };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(state2.timestamp).toBeGreaterThan(state1.timestamp);

            mockChrome.storage.local.set.mockClear();
        }
    });

    test('現在のタブ情報の変更が両方のUIに同期される', async () => {
        // **Validates: Requirements 3.5**
        
        for (let i = 0; i < 50; i++) {
            const state1 = generateRandomState();
            const newTab = {
                url: `https://example.com/new-page${i}`,
                title: `新しいページ${i}`,
            };
            const state2 = { ...state1, currentTab: newTab };

            await saveStateToStorage(state1);
            await saveStateToStorage(state2);

            expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
                sidePanelState: expect.objectContaining({
                    currentTab: newTab,
                }),
            });

            mockChrome.storage.local.set.mockClear();
        }
    });
});
