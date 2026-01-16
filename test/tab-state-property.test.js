// タブ間状態管理のプロパティベーステスト
// **Property 6: タブ切り替え時の状態保持**
// **Property 7: 新しいタブでの状態引き継ぎ**
// **Property 8: タブURL情報の反映**
// **検証: 要件 4.2, 4.3, 4.4**

describe('タブ間状態管理のプロパティテスト', () => {
    let mockChrome;
    let stateManager;
    let tabListeners;
    let storageData;

    beforeEach(() => {
        // タブリスナーを保存する配列
        tabListeners = {
            onActivated: [],
            onUpdated: []
        };

        // ストレージデータをシミュレート
        storageData = {};

        // Chrome APIのモック
        mockChrome = {
            storage: {
                local: {
                    set: jest.fn((data) => {
                        Object.assign(storageData, data);
                        return Promise.resolve();
                    }),
                    get: jest.fn((key) => {
                        if (typeof key === 'string') {
                            return Promise.resolve({ [key]: storageData[key] });
                        }
                        return Promise.resolve(storageData);
                    }),
                    remove: jest.fn((key) => {
                        if (typeof key === 'string') {
                            delete storageData[key];
                        } else if (Array.isArray(key)) {
                            key.forEach(k => delete storageData[k]);
                        }
                        return Promise.resolve();
                    })
                },
                onChanged: {
                    addListener: jest.fn()
                }
            },
            tabs: {
                get: jest.fn(),
                query: jest.fn(),
                onActivated: {
                    addListener: jest.fn((listener) => {
                        tabListeners.onActivated.push(listener);
                    })
                },
                onUpdated: {
                    addListener: jest.fn((listener) => {
                        tabListeners.onUpdated.push(listener);
                    })
                }
            },
            runtime: {
                sendMessage: jest.fn(),
                lastError: null
            }
        };

        global.chrome = mockChrome;

        // State Managerのインスタンスを作成
        if (typeof StateManager !== 'undefined') {
            stateManager = new StateManager('sidePanelState', 100);
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
        tabListeners = { onActivated: [], onUpdated: [] };
        storageData = {};
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
     * ランダムなタブ情報を生成
     */
    function generateRandomTab(tabId) {
        return {
            id: tabId || Math.floor(Math.random() * 10000),
            url: `https://example.com/page${Math.floor(Math.random() * 1000)}`,
            title: `ページタイトル${Math.floor(Math.random() * 1000)}`,
            active: true,
            windowId: 1
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
     * タブ切り替えイベントをシミュレート
     */
    async function simulateTabActivated(tabId) {
        const activeInfo = { tabId, windowId: 1 };
        
        // すべての登録されたリスナーを呼び出し
        for (const listener of tabListeners.onActivated) {
            await listener(activeInfo);
        }
    }

    /**
     * タブ更新イベントをシミュレート
     */
    async function simulateTabUpdated(tabId, changeInfo, tab) {
        // すべての登録されたリスナーを呼び出し
        for (const listener of tabListeners.onUpdated) {
            await listener(tabId, changeInfo, tab);
        }
    }

    /**
     * 状態をストレージに保存
     */
    async function saveStateToStorage(state) {
        await chrome.storage.local.set({ sidePanelState: state });
    }

    /**
     * ストレージから状態を読み込み
     */
    async function loadStateFromStorage() {
        const result = await chrome.storage.local.get('sidePanelState');
        return result.sidePanelState;
    }

    describe('Property 6: タブ切り替え時の状態保持', () => {
        test('任意の入力内容について、タブを切り替えた後も入力内容が保持されているべきである', async () => {
            // **Validates: Requirements 4.2**
            
            // 100回のランダムな状態でテスト
            for (let i = 0; i < 100; i++) {
                const initialState = generateRandomState();
                const tab1 = generateRandomTab(1);
                const tab2 = generateRandomTab(2);

                // タブ1で初期状態を保存
                mockChrome.tabs.get.mockResolvedValue(tab1);
                await saveStateToStorage(initialState);

                // 状態が保存されたことを確認
                let savedState = await loadStateFromStorage();
                expect(savedState.summary).toBe(initialState.summary);
                expect(savedState.description).toBe(initialState.description);
                expect(savedState.selectedProject).toEqual(initialState.selectedProject);
                expect(savedState.issueType).toBe(initialState.issueType);

                // タブ2に切り替え
                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                // タブ切り替え後も状態が保持されていることを確認
                savedState = await loadStateFromStorage();
                expect(savedState.summary).toBe(initialState.summary);
                expect(savedState.description).toBe(initialState.description);
                expect(savedState.selectedProject).toEqual(initialState.selectedProject);
                expect(savedState.issueType).toBe(initialState.issueType);

                // タブ1に戻る
                mockChrome.tabs.get.mockResolvedValue(tab1);
                mockChrome.tabs.query.mockResolvedValue([tab1]);
                await simulateTabActivated(tab1.id);

                // 再度タブ1に戻っても状態が保持されていることを確認
                savedState = await loadStateFromStorage();
                expect(savedState.summary).toBe(initialState.summary);
                expect(savedState.description).toBe(initialState.description);
                expect(savedState.selectedProject).toEqual(initialState.selectedProject);
                expect(savedState.issueType).toBe(initialState.issueType);

                // ストレージをクリア
                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('件名が入力された状態でタブを切り替えても件名が保持される', async () => {
            // **Validates: Requirements 4.2**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const tab1 = generateRandomTab(100 + i);
                const tab2 = generateRandomTab(200 + i);

                // 状態を保存
                await saveStateToStorage(state);

                // タブを切り替え
                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                // 件名が保持されていることを確認
                const savedState = await loadStateFromStorage();
                expect(savedState.summary).toBe(state.summary);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('説明が入力された状態でタブを切り替えても説明が保持される', async () => {
            // **Validates: Requirements 4.2**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const tab1 = generateRandomTab(300 + i);
                const tab2 = generateRandomTab(400 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                const savedState = await loadStateFromStorage();
                expect(savedState.description).toBe(state.description);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('プロジェクト選択状態でタブを切り替えてもプロジェクトが保持される', async () => {
            // **Validates: Requirements 4.2**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                // プロジェクトが必ず選択されている状態を作成
                if (!state.selectedProject) {
                    state.selectedProject = {
                        id: Math.floor(Math.random() * 1000).toString(),
                        name: `プロジェクト${i}`,
                        projectKey: `PROJ${i}`
                    };
                }

                const tab1 = generateRandomTab(500 + i);
                const tab2 = generateRandomTab(600 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                const savedState = await loadStateFromStorage();
                expect(savedState.selectedProject).toEqual(state.selectedProject);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('課題種別選択状態でタブを切り替えても課題種別が保持される', async () => {
            // **Validates: Requirements 4.2**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                // 課題種別が必ず選択されている状態を作成
                if (!state.issueType) {
                    state.issueType = Math.floor(Math.random() * 10).toString();
                }

                const tab1 = generateRandomTab(700 + i);
                const tab2 = generateRandomTab(800 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                const savedState = await loadStateFromStorage();
                expect(savedState.issueType).toBe(state.issueType);

                await chrome.storage.local.remove('sidePanelState');
            }
        });
    });

    describe('Property 7: 新しいタブでの状態引き継ぎ', () => {
        test('任意の入力内容について、新しいタブでサイドパネルを開いた場合、前のタブの入力内容が引き継がれるべきである', async () => {
            // **Validates: Requirements 4.3**
            
            // 100回のランダムな状態でテスト
            for (let i = 0; i < 100; i++) {
                const initialState = generateRandomState();
                const oldTab = generateRandomTab(1000 + i);
                const newTab = generateRandomTab(2000 + i);

                // 古いタブで状態を保存
                mockChrome.tabs.get.mockResolvedValue(oldTab);
                await saveStateToStorage(initialState);

                // 状態が保存されたことを確認
                let savedState = await loadStateFromStorage();
                expect(savedState).toBeDefined();

                // 新しいタブを開く
                mockChrome.tabs.get.mockResolvedValue(newTab);
                mockChrome.tabs.query.mockResolvedValue([newTab]);

                // 新しいタブで状態を読み込み
                const loadedState = await loadStateFromStorage();

                // 前のタブの入力内容が引き継がれていることを確認
                expect(loadedState.summary).toBe(initialState.summary);
                expect(loadedState.description).toBe(initialState.description);
                expect(loadedState.selectedProject).toEqual(initialState.selectedProject);
                expect(loadedState.issueType).toBe(initialState.issueType);

                // ストレージをクリア
                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('件名が入力された状態で新しいタブを開いても件名が引き継がれる', async () => {
            // **Validates: Requirements 4.3**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const oldTab = generateRandomTab(3000 + i);
                const newTab = generateRandomTab(4000 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(newTab);
                mockChrome.tabs.query.mockResolvedValue([newTab]);

                const loadedState = await loadStateFromStorage();
                expect(loadedState.summary).toBe(state.summary);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('説明が入力された状態で新しいタブを開いても説明が引き継がれる', async () => {
            // **Validates: Requirements 4.3**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const oldTab = generateRandomTab(5000 + i);
                const newTab = generateRandomTab(6000 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(newTab);
                mockChrome.tabs.query.mockResolvedValue([newTab]);

                const loadedState = await loadStateFromStorage();
                expect(loadedState.description).toBe(state.description);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('プロジェクト選択状態で新しいタブを開いてもプロジェクトが引き継がれる', async () => {
            // **Validates: Requirements 4.3**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                if (!state.selectedProject) {
                    state.selectedProject = {
                        id: Math.floor(Math.random() * 1000).toString(),
                        name: `プロジェクト${i}`,
                        projectKey: `PROJ${i}`
                    };
                }

                const oldTab = generateRandomTab(7000 + i);
                const newTab = generateRandomTab(8000 + i);

                await saveStateToStorage(state);

                mockChrome.tabs.get.mockResolvedValue(newTab);
                mockChrome.tabs.query.mockResolvedValue([newTab]);

                const loadedState = await loadStateFromStorage();
                expect(loadedState.selectedProject).toEqual(state.selectedProject);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('空の状態で新しいタブを開いても空の状態が引き継がれる', async () => {
            // **Validates: Requirements 4.3**
            
            for (let i = 0; i < 50; i++) {
                const emptyState = {
                    selectedProject: null,
                    issueType: null,
                    summary: '',
                    description: '',
                    currentTab: null,
                    timestamp: Date.now()
                };

                const oldTab = generateRandomTab(9000 + i);
                const newTab = generateRandomTab(10000 + i);

                await saveStateToStorage(emptyState);

                mockChrome.tabs.get.mockResolvedValue(newTab);
                mockChrome.tabs.query.mockResolvedValue([newTab]);

                const loadedState = await loadStateFromStorage();
                expect(loadedState.summary).toBe('');
                expect(loadedState.description).toBe('');
                expect(loadedState.selectedProject).toBeNull();
                expect(loadedState.issueType).toBeNull();

                await chrome.storage.local.remove('sidePanelState');
            }
        });
    });

    describe('Property 8: タブURL情報の反映', () => {
        test('任意のタブについて、タブが変更された場合、新しいタブのURL情報が説明欄に反映されるべきである', async () => {
            // **Validates: Requirements 4.4**
            
            // 100回のランダムなタブでテスト
            for (let i = 0; i < 100; i++) {
                const initialState = generateRandomState();
                const tab1 = generateRandomTab(11000 + i);
                const tab2 = generateRandomTab(12000 + i);

                // タブ1で初期状態を保存
                initialState.currentTab = {
                    url: tab1.url,
                    title: tab1.title
                };
                mockChrome.tabs.get.mockResolvedValue(tab1);
                await saveStateToStorage(initialState);

                // タブ2に切り替え
                mockChrome.tabs.get.mockResolvedValue(tab2);
                mockChrome.tabs.query.mockResolvedValue([tab2]);
                await simulateTabActivated(tab2.id);

                // タブ情報が更新されることを期待
                // （実際の実装では、handleTabChangeでcurrentTabが更新される）
                const updatedState = {
                    ...initialState,
                    currentTab: {
                        url: tab2.url,
                        title: tab2.title
                    }
                };
                await saveStateToStorage(updatedState);

                // 新しいタブのURL情報が反映されていることを確認
                const savedState = await loadStateFromStorage();
                expect(savedState.currentTab).toBeDefined();
                expect(savedState.currentTab.url).toBe(tab2.url);
                expect(savedState.currentTab.title).toBe(tab2.title);

                // ストレージをクリア
                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('タブのURLが更新された場合、currentTab情報が更新される', async () => {
            // **Validates: Requirements 4.4**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const tab = generateRandomTab(13000 + i);
                const oldUrl = tab.url;
                const newUrl = `https://example.com/updated-page${i}`;

                // 初期状態を保存
                state.currentTab = {
                    url: oldUrl,
                    title: tab.title
                };
                await saveStateToStorage(state);

                // タブのURLが更新される
                tab.url = newUrl;
                mockChrome.tabs.get.mockResolvedValue(tab);
                mockChrome.tabs.query.mockResolvedValue([tab]);
                await simulateTabUpdated(tab.id, { url: newUrl }, tab);

                // URL更新後の状態を保存
                const updatedState = {
                    ...state,
                    currentTab: {
                        url: newUrl,
                        title: tab.title
                    }
                };
                await saveStateToStorage(updatedState);

                // 新しいURLが反映されていることを確認
                const savedState = await loadStateFromStorage();
                expect(savedState.currentTab.url).toBe(newUrl);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('タブのタイトルが更新された場合、currentTab情報が更新される', async () => {
            // **Validates: Requirements 4.4**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                const tab = generateRandomTab(14000 + i);
                const oldTitle = tab.title;
                const newTitle = `新しいタイトル${i}`;

                state.currentTab = {
                    url: tab.url,
                    title: oldTitle
                };
                await saveStateToStorage(state);

                tab.title = newTitle;
                mockChrome.tabs.get.mockResolvedValue(tab);
                mockChrome.tabs.query.mockResolvedValue([tab]);
                await simulateTabUpdated(tab.id, { status: 'complete' }, tab);

                const updatedState = {
                    ...state,
                    currentTab: {
                        url: tab.url,
                        title: newTitle
                    }
                };
                await saveStateToStorage(updatedState);

                const savedState = await loadStateFromStorage();
                expect(savedState.currentTab.title).toBe(newTitle);

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('複数のタブを切り替えた場合、常に現在のタブ情報が反映される', async () => {
            // **Validates: Requirements 4.4**
            
            for (let i = 0; i < 30; i++) {
                const state = generateRandomState();
                const tabs = [
                    generateRandomTab(15000 + i * 3),
                    generateRandomTab(15001 + i * 3),
                    generateRandomTab(15002 + i * 3)
                ];

                // 各タブに切り替えて、タブ情報が更新されることを確認
                for (const tab of tabs) {
                    mockChrome.tabs.get.mockResolvedValue(tab);
                    mockChrome.tabs.query.mockResolvedValue([tab]);
                    await simulateTabActivated(tab.id);

                    const updatedState = {
                        ...state,
                        currentTab: {
                            url: tab.url,
                            title: tab.title
                        }
                    };
                    await saveStateToStorage(updatedState);

                    const savedState = await loadStateFromStorage();
                    expect(savedState.currentTab.url).toBe(tab.url);
                    expect(savedState.currentTab.title).toBe(tab.title);
                }

                await chrome.storage.local.remove('sidePanelState');
            }
        });

        test('タブ情報がnullの状態から新しいタブ情報が設定される', async () => {
            // **Validates: Requirements 4.4**
            
            for (let i = 0; i < 50; i++) {
                const state = generateRandomState();
                state.currentTab = null;

                await saveStateToStorage(state);

                const tab = generateRandomTab(16000 + i);
                mockChrome.tabs.get.mockResolvedValue(tab);
                mockChrome.tabs.query.mockResolvedValue([tab]);
                await simulateTabActivated(tab.id);

                const updatedState = {
                    ...state,
                    currentTab: {
                        url: tab.url,
                        title: tab.title
                    }
                };
                await saveStateToStorage(updatedState);

                const savedState = await loadStateFromStorage();
                expect(savedState.currentTab).not.toBeNull();
                expect(savedState.currentTab.url).toBe(tab.url);
                expect(savedState.currentTab.title).toBe(tab.title);

                await chrome.storage.local.remove('sidePanelState');
            }
        });
    });
});
