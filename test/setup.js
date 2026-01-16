// Jest テストセットアップファイル
// Chrome拡張機能のAPIをモック化

// Chrome Storage API のモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    }
  }
};

// コンソールログを抑制（必要に応じて）
// console.log = jest.fn();