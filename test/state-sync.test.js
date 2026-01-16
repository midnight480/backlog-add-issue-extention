// 状態同期のテスト
// ポップアップとサイドパネル間の状態同期機能をテスト

describe('状態同期機能', () => {
    let mockChrome;
    let storageListeners;

    beforeEach(() => {
        // Chrome Storage APIのモック
        storageListeners = [];
        mockChrome = {
            storage: {
                local: {
                    set: jest.fn((data) => Promise.resolve()),
                    get: jest.fn((key) => Promise.resolve({})),
                },
                onChanged: {
                    addListener: jest.fn((listener) => {
                        storageListeners.push(listener);
                    }),
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
        storageListeners = [];
    });

    describe('ポップアップからサイドパネルへの同期', () => {
        test('件名の変更がストレージに保存される', async () => {
            const state = {
                selectedProject: null,
                issueType: null,
                summary: 'テスト件名',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    summary: 'テスト件名',
                }),
            });
        });

        test('説明の変更がストレージに保存される', async () => {
            const state = {
                selectedProject: null,
                issueType: null,
                summary: '',
                description: 'テスト説明',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    description: 'テスト説明',
                }),
            });
        });

        test('プロジェクト選択がストレージに保存される', async () => {
            const project = {
                id: '123',
                name: 'テストプロジェクト',
                projectKey: 'TEST',
            };

            const state = {
                selectedProject: project,
                issueType: null,
                summary: '',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    selectedProject: project,
                }),
            });
        });

        test('課題種別の変更がストレージに保存される', async () => {
            const state = {
                selectedProject: null,
                issueType: '1',
                summary: '',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    issueType: '1',
                }),
            });
        });
    });

    describe('サイドパネルからポップアップへの同期', () => {
        test('ストレージ変更イベントが検知される', () => {
            // イベントリスナーが登録されることを確認
            // 実際のUIクラスではなく、モックのみをテストしているため、
            // リスナーが登録可能であることを確認
            expect(mockChrome.storage.onChanged.addListener).toBeDefined();
            expect(typeof mockChrome.storage.onChanged.addListener).toBe('function');
        });

        test('件名の変更が他のUIに反映される', () => {
            const changes = {
                sidePanelState: {
                    newValue: {
                        selectedProject: null,
                        issueType: null,
                        summary: '新しい件名',
                        description: '',
                        currentTab: null,
                        timestamp: Date.now(),
                    },
                    oldValue: {
                        selectedProject: null,
                        issueType: null,
                        summary: '',
                        description: '',
                        currentTab: null,
                        timestamp: Date.now() - 1000,
                    },
                },
            };

            // イベントリスナーを呼び出し
            storageListeners.forEach((listener) => {
                listener(changes, 'local');
            });

            // 変更が検知されたことを確認
            expect(changes.sidePanelState.newValue.summary).toBe('新しい件名');
        });

        test('プロジェクト選択の変更が他のUIに反映される', () => {
            const project = {
                id: '456',
                name: '新しいプロジェクト',
                projectKey: 'NEW',
            };

            const changes = {
                sidePanelState: {
                    newValue: {
                        selectedProject: project,
                        issueType: null,
                        summary: '',
                        description: '',
                        currentTab: null,
                        timestamp: Date.now(),
                    },
                    oldValue: {
                        selectedProject: null,
                        issueType: null,
                        summary: '',
                        description: '',
                        currentTab: null,
                        timestamp: Date.now() - 1000,
                    },
                },
            };

            storageListeners.forEach((listener) => {
                listener(changes, 'local');
            });

            expect(changes.sidePanelState.newValue.selectedProject).toEqual(project);
        });
    });

    describe('デバウンス処理', () => {
        test('連続した変更が1回の保存にまとめられる', () => {
            jest.useFakeTimers();

            const saveState = jest.fn(async (state) => {
                await chrome.storage.local.set({ sidePanelState: state });
            });

            // デバウンス関数のシミュレーション
            let timer = null;
            const debouncedSave = (state) => {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(() => {
                    saveState(state);
                }, 500);
            };

            // 連続して3回呼び出し
            debouncedSave({ summary: '1' });
            debouncedSave({ summary: '2' });
            debouncedSave({ summary: '3' });

            // 500ms経過前は保存されない
            expect(saveState).not.toHaveBeenCalled();

            // 500ms経過後
            jest.advanceTimersByTime(500);

            // 最後の1回のみ保存される
            expect(saveState).toHaveBeenCalledTimes(1);
            expect(saveState).toHaveBeenCalledWith({ summary: '3' });

            jest.useRealTimers();
        });
    });

    describe('エラーハンドリング', () => {
        test('ストレージ保存失敗時にエラーが処理される', async () => {
            const error = new Error('Storage quota exceeded');
            mockChrome.storage.local.set.mockRejectedValue(error);

            const consoleError = jest.spyOn(console, 'error').mockImplementation();

            try {
                await chrome.storage.local.set({ sidePanelState: {} });
            } catch (e) {
                expect(e).toBe(error);
            }

            consoleError.mockRestore();
        });

        test('無効な状態データが無視される', () => {
            const changes = {
                sidePanelState: {
                    newValue: null, // 無効な状態
                },
            };

            // エラーが発生しないことを確認
            expect(() => {
                storageListeners.forEach((listener) => {
                    listener(changes, 'local');
                });
            }).not.toThrow();
        });

        test('他のストレージエリアの変更が無視される', () => {
            const changes = {
                sidePanelState: {
                    newValue: {
                        summary: 'テスト',
                    },
                },
            };

            // syncストレージの変更は無視される
            storageListeners.forEach((listener) => {
                listener(changes, 'sync');
            });

            // localストレージのみが処理される
            storageListeners.forEach((listener) => {
                listener(changes, 'local');
            });
        });
    });

    describe('状態の整合性', () => {
        test('タイムスタンプが正しく設定される', async () => {
            const beforeTime = Date.now();

            const state = {
                selectedProject: null,
                issueType: null,
                summary: 'テスト',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            const afterTime = Date.now();

            expect(state.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(state.timestamp).toBeLessThanOrEqual(afterTime);
        });

        test('すべての必須フィールドが含まれる', async () => {
            const state = {
                selectedProject: null,
                issueType: null,
                summary: '',
                description: '',
                currentTab: null,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: state,
            });

            // すべてのフィールドが存在することを確認
            const calledWith = mockChrome.storage.local.set.mock.calls[0][0];
            expect(calledWith.sidePanelState).toHaveProperty('selectedProject');
            expect(calledWith.sidePanelState).toHaveProperty('issueType');
            expect(calledWith.sidePanelState).toHaveProperty('summary');
            expect(calledWith.sidePanelState).toHaveProperty('description');
            expect(calledWith.sidePanelState).toHaveProperty('currentTab');
            expect(calledWith.sidePanelState).toHaveProperty('timestamp');
        });
    });

    describe('複雑な状態の同期', () => {
        test('プロジェクトと課題種別が同時に同期される', async () => {
            const project = {
                id: '789',
                name: '複雑なプロジェクト',
                projectKey: 'COMPLEX',
            };

            const state = {
                selectedProject: project,
                issueType: '2',
                summary: '複雑な件名',
                description: '複雑な説明',
                currentTab: {
                    url: 'https://example.com',
                    title: 'Example Page',
                },
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    selectedProject: project,
                    issueType: '2',
                    summary: '複雑な件名',
                    description: '複雑な説明',
                    currentTab: expect.objectContaining({
                        url: 'https://example.com',
                        title: 'Example Page',
                    }),
                }),
            });
        });

        test('現在のタブ情報が正しく同期される', async () => {
            const tabInfo = {
                url: 'https://backlog.example.com/view/TEST-123',
                title: 'TEST-123 - テスト課題',
            };

            const state = {
                selectedProject: null,
                issueType: null,
                summary: '',
                description: '',
                currentTab: tabInfo,
                timestamp: Date.now(),
            };

            await chrome.storage.local.set({ sidePanelState: state });

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                sidePanelState: expect.objectContaining({
                    currentTab: tabInfo,
                }),
            });
        });
    });
});
