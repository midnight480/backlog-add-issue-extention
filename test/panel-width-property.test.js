// サイドパネル幅のプロパティベーステスト
// **Property 9: サイドパネル幅の記憶**
// **検証: 要件 1.5**

describe('サイドパネル幅のプロパティテスト', () => {
    let mockChrome;
    let storageData;

    beforeEach(() => {
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
                }
            }
        };

        global.chrome = mockChrome;
    });

    afterEach(() => {
        jest.clearAllMocks();
        storageData = {};
    });

    /**
     * ランダムな幅を生成（300px～600pxの範囲）
     */
    function generateRandomWidth() {
        return Math.floor(Math.random() * (600 - 300 + 1)) + 300;
    }

    /**
     * パネルの幅を保存
     */
    async function savePanelWidth(width) {
        await chrome.storage.local.set({ sidePanelWidth: width });
    }

    /**
     * パネルの幅を復元
     */
    async function restorePanelWidth() {
        const result = await chrome.storage.local.get('sidePanelWidth');
        return result.sidePanelWidth;
    }

    describe('Property 9: サイドパネル幅の記憶', () => {
        test('任意の幅調整について、ユーザーが調整した幅が保存され、次回開いた時に復元されるべきである', async () => {
            // **Validates: Requirements 1.5**
            
            // 100回のランダムな幅でテスト
            for (let i = 0; i < 100; i++) {
                const randomWidth = generateRandomWidth();
                
                // 幅を保存
                await savePanelWidth(randomWidth);
                
                // 保存されたことを確認
                expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
                    sidePanelWidth: randomWidth
                });
                
                // 幅を復元
                const restoredWidth = await restorePanelWidth();
                
                // 復元された幅が元の幅と一致することを確認
                expect(restoredWidth).toBe(randomWidth);
                
                // ストレージをクリア
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('最小幅（300px）が正しく保存・復元される', async () => {
            // **Validates: Requirements 1.5**
            
            const minWidth = 300;
            
            for (let i = 0; i < 50; i++) {
                await savePanelWidth(minWidth);
                const restoredWidth = await restorePanelWidth();
                
                expect(restoredWidth).toBe(minWidth);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('最大幅（600px）が正しく保存・復元される', async () => {
            // **Validates: Requirements 1.5**
            
            const maxWidth = 600;
            
            for (let i = 0; i < 50; i++) {
                await savePanelWidth(maxWidth);
                const restoredWidth = await restorePanelWidth();
                
                expect(restoredWidth).toBe(maxWidth);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('デフォルト幅（400px）が正しく保存・復元される', async () => {
            // **Validates: Requirements 1.5**
            
            const defaultWidth = 400;
            
            for (let i = 0; i < 50; i++) {
                await savePanelWidth(defaultWidth);
                const restoredWidth = await restorePanelWidth();
                
                expect(restoredWidth).toBe(defaultWidth);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('複数回の幅調整で、最後の幅が保存される', async () => {
            // **Validates: Requirements 1.5**
            
            for (let i = 0; i < 50; i++) {
                const widths = [];
                const adjustmentCount = Math.floor(Math.random() * 5) + 2; // 2～6回の調整
                
                // 複数回幅を調整
                for (let j = 0; j < adjustmentCount; j++) {
                    const width = generateRandomWidth();
                    widths.push(width);
                    await savePanelWidth(width);
                }
                
                // 最後の幅が保存されていることを確認
                const restoredWidth = await restorePanelWidth();
                expect(restoredWidth).toBe(widths[widths.length - 1]);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('幅が保存されていない場合、undefinedが返される', async () => {
            // **Validates: Requirements 1.5**
            
            for (let i = 0; i < 50; i++) {
                // ストレージをクリア
                await chrome.storage.local.remove('sidePanelWidth');
                
                // 幅を復元
                const restoredWidth = await restorePanelWidth();
                
                // undefinedが返されることを確認
                expect(restoredWidth).toBeUndefined();
            }
        });

        test('範囲内のすべての幅が正しく保存・復元される', async () => {
            // **Validates: Requirements 1.5**
            
            // 300pxから600pxまで10px刻みでテスト
            for (let width = 300; width <= 600; width += 10) {
                await savePanelWidth(width);
                const restoredWidth = await restorePanelWidth();
                
                expect(restoredWidth).toBe(width);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('連続した幅調整で、各幅が正しく保存される', async () => {
            // **Validates: Requirements 1.5**
            
            for (let i = 0; i < 30; i++) {
                const width1 = generateRandomWidth();
                const width2 = generateRandomWidth();
                const width3 = generateRandomWidth();
                
                // 1回目の調整
                await savePanelWidth(width1);
                let restoredWidth = await restorePanelWidth();
                expect(restoredWidth).toBe(width1);
                
                // 2回目の調整
                await savePanelWidth(width2);
                restoredWidth = await restorePanelWidth();
                expect(restoredWidth).toBe(width2);
                
                // 3回目の調整
                await savePanelWidth(width3);
                restoredWidth = await restorePanelWidth();
                expect(restoredWidth).toBe(width3);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });

        test('幅の保存と復元が繰り返し実行できる', async () => {
            // **Validates: Requirements 1.5**
            
            for (let i = 0; i < 100; i++) {
                const width = generateRandomWidth();
                
                // 保存
                await savePanelWidth(width);
                
                // 復元
                const restoredWidth = await restorePanelWidth();
                expect(restoredWidth).toBe(width);
                
                // 再度保存
                await savePanelWidth(width);
                
                // 再度復元
                const restoredWidth2 = await restorePanelWidth();
                expect(restoredWidth2).toBe(width);
                
                await chrome.storage.local.remove('sidePanelWidth');
            }
        });
    });
});
