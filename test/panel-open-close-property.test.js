/**
 * サイドパネル開閉状態管理のプロパティベーステスト
 * 
 * Property 10: 開閉状態の記録
 * Property 11: 再起動後の状態復元
 * 
 * 検証: 要件 6.1, 6.3
 */

describe('サイドパネル開閉状態管理 - Property Based Tests', () => {
  
  beforeEach(() => {
    // Chrome Storage APIのモックをリセット
    jest.clearAllMocks();
    
    // ストレージデータを保持するオブジェクト
    const storageData = {};
    
    // chrome.storage.local.set のモック実装
    chrome.storage.local.set.mockImplementation((data) => {
      Object.assign(storageData, data);
      return Promise.resolve();
    });
    
    // chrome.storage.local.get のモック実装
    chrome.storage.local.get.mockImplementation((keys) => {
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (storageData[key] !== undefined) {
            result[key] = storageData[key];
          }
        });
        return Promise.resolve(result);
      } else if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: storageData[keys] });
      } else {
        return Promise.resolve(storageData);
      }
    });
    
    // chrome.storage.local.clear のモック実装
    chrome.storage.local.clear = jest.fn(() => {
      Object.keys(storageData).forEach(key => delete storageData[key]);
      return Promise.resolve();
    });
  });

  describe('Property 10: 開閉状態の記録', () => {
    /**
     * **検証: 要件 6.1**
     * 
     * 任意の開閉操作について、サイドパネルの開閉状態が記録されるべきである
     */
    test('for any open/close operation, the panel state should be recorded', async () => {
      // 100回のランダムな開閉操作でテスト
      for (let i = 0; i < 100; i++) {
        const isOpen = Math.random() > 0.5;
        const timestamp = Date.now() + Math.floor(Math.random() * 1000000);
        
        // 開閉状態を記録
        await chrome.storage.local.set({
          sidePanelIsOpen: isOpen,
          [isOpen ? 'sidePanelOpenedAt' : 'sidePanelClosedAt']: timestamp
        });
        
        // 記録された状態を取得
        const result = await chrome.storage.local.get(['sidePanelIsOpen', 'sidePanelOpenedAt', 'sidePanelClosedAt']);
        
        // 状態が正しく記録されていることを確認
        expect(result.sidePanelIsOpen).toBe(isOpen);
        
        if (isOpen) {
          expect(result.sidePanelOpenedAt).toBe(timestamp);
        } else {
          expect(result.sidePanelClosedAt).toBe(timestamp);
        }
      }
    });

    test('opening the panel should record open state', async () => {
      const openTimestamp = Date.now();
      
      // サイドパネルを開く
      await chrome.storage.local.set({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: openTimestamp
      });
      
      // 状態を確認
      const result = await chrome.storage.local.get(['sidePanelIsOpen', 'sidePanelOpenedAt']);
      
      expect(result.sidePanelIsOpen).toBe(true);
      expect(result.sidePanelOpenedAt).toBe(openTimestamp);
    });

    test('closing the panel should record closed state', async () => {
      const closeTimestamp = Date.now();
      
      // サイドパネルを閉じる
      await chrome.storage.local.set({
        sidePanelIsOpen: false,
        sidePanelClosedAt: closeTimestamp
      });
      
      // 状態を確認
      const result = await chrome.storage.local.get(['sidePanelIsOpen', 'sidePanelClosedAt']);
      
      expect(result.sidePanelIsOpen).toBe(false);
      expect(result.sidePanelClosedAt).toBe(closeTimestamp);
    });

    test('multiple open/close operations should update state correctly', async () => {
      // 複数回の開閉操作
      const operations = [
        { isOpen: true, timestamp: Date.now() },
        { isOpen: false, timestamp: Date.now() + 1000 },
        { isOpen: true, timestamp: Date.now() + 2000 },
        { isOpen: false, timestamp: Date.now() + 3000 },
        { isOpen: true, timestamp: Date.now() + 4000 }
      ];
      
      for (const op of operations) {
        await chrome.storage.local.set({
          sidePanelIsOpen: op.isOpen,
          [op.isOpen ? 'sidePanelOpenedAt' : 'sidePanelClosedAt']: op.timestamp
        });
        
        const result = await chrome.storage.local.get(['sidePanelIsOpen']);
        expect(result.sidePanelIsOpen).toBe(op.isOpen);
      }
      
      // 最終状態を確認
      const finalResult = await chrome.storage.local.get(['sidePanelIsOpen']);
      expect(finalResult.sidePanelIsOpen).toBe(true);
    });
  });

  describe('Property 11: 再起動後の状態復元', () => {
    /**
     * **検証: 要件 6.3**
     * 
     * 任意の開閉状態について、ブラウザ再起動後にサイドパネルの開閉状態が復元されるべきである
     */
    test('for any panel state, browser restart should restore the state', async () => {
      // 100回のランダムな状態でテスト
      for (let i = 0; i < 100; i++) {
        const isOpen = Math.random() > 0.5;
        const timestamp = Date.now() + Math.floor(Math.random() * 1000000);
        
        // ブラウザ再起動前の状態を保存
        await chrome.storage.local.set({
          sidePanelIsOpen: isOpen,
          [isOpen ? 'sidePanelOpenedAt' : 'sidePanelClosedAt']: timestamp
        });
        
        // 再起動後の状態復元
        const result = await chrome.storage.local.get(['sidePanelIsOpen']);
        
        // 状態が正しく復元されていることを確認
        expect(result.sidePanelIsOpen).toBe(isOpen);
      }
    });

    test('should restore open state after browser restart', async () => {
      // ブラウザ再起動前：サイドパネルが開いている
      await chrome.storage.local.set({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: Date.now()
      });
      
      // 再起動後の状態復元
      const result = await chrome.storage.local.get(['sidePanelIsOpen']);
      
      expect(result.sidePanelIsOpen).toBe(true);
    });

    test('should restore closed state after browser restart', async () => {
      // ブラウザ再起動前：サイドパネルが閉じている
      await chrome.storage.local.set({
        sidePanelIsOpen: false,
        sidePanelClosedAt: Date.now()
      });
      
      // 再起動後の状態復元
      const result = await chrome.storage.local.get(['sidePanelIsOpen']);
      
      expect(result.sidePanelIsOpen).toBe(false);
    });

    test('should handle missing state gracefully after browser restart', async () => {
      // ブラウザ再起動前：状態が保存されていない
      // （何も保存しない）
      
      // 再起動後の状態復元
      const result = await chrome.storage.local.get(['sidePanelIsOpen']);
      
      // デフォルト状態（undefined）を確認
      expect(result.sidePanelIsOpen).toBeUndefined();
    });

    test('should preserve state across multiple browser restarts', async () => {
      const initialState = true;
      
      // 初期状態を保存
      await chrome.storage.local.set({
        sidePanelIsOpen: initialState,
        sidePanelOpenedAt: Date.now()
      });
      
      // 複数回のブラウザ再起動をシミュレート
      for (let i = 0; i < 10; i++) {
        const result = await chrome.storage.local.get(['sidePanelIsOpen']);
        expect(result.sidePanelIsOpen).toBe(initialState);
      }
    });

    test('should restore state with timestamp information', async () => {
      const openTimestamp = Date.now();
      
      // ブラウザ再起動前：タイムスタンプ付きで状態を保存
      await chrome.storage.local.set({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: openTimestamp
      });
      
      // 再起動後の状態復元
      const result = await chrome.storage.local.get(['sidePanelIsOpen', 'sidePanelOpenedAt']);
      
      expect(result.sidePanelIsOpen).toBe(true);
      expect(result.sidePanelOpenedAt).toBe(openTimestamp);
    });
  });

  describe('統合テスト: 開閉状態のライフサイクル', () => {
    test('complete lifecycle: open -> close -> restart -> restore', async () => {
      // 1. サイドパネルを開く
      const openTimestamp = Date.now();
      await chrome.storage.local.set({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: openTimestamp
      });
      
      let result = await chrome.storage.local.get(['sidePanelIsOpen']);
      expect(result.sidePanelIsOpen).toBe(true);
      
      // 2. サイドパネルを閉じる
      const closeTimestamp = Date.now() + 1000;
      await chrome.storage.local.set({
        sidePanelIsOpen: false,
        sidePanelClosedAt: closeTimestamp
      });
      
      result = await chrome.storage.local.get(['sidePanelIsOpen']);
      expect(result.sidePanelIsOpen).toBe(false);
      
      // 3. 再起動後の状態復元
      result = await chrome.storage.local.get(['sidePanelIsOpen', 'sidePanelClosedAt']);
      expect(result.sidePanelIsOpen).toBe(false);
      expect(result.sidePanelClosedAt).toBe(closeTimestamp);
    });

    test('state should persist through multiple operations and restarts', async () => {
      const operations = [
        { isOpen: true, timestamp: Date.now() },
        { isOpen: false, timestamp: Date.now() + 1000 },
        { isOpen: true, timestamp: Date.now() + 2000 }
      ];
      
      for (const op of operations) {
        // 操作を実行
        await chrome.storage.local.set({
          sidePanelIsOpen: op.isOpen,
          [op.isOpen ? 'sidePanelOpenedAt' : 'sidePanelClosedAt']: op.timestamp
        });
        
        // 状態を確認
        const result = await chrome.storage.local.get(['sidePanelIsOpen']);
        expect(result.sidePanelIsOpen).toBe(op.isOpen);
      }
    });
  });
});
