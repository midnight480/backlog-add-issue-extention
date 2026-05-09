// Jest テストセットアップファイル
// Chrome拡張機能のAPIをモック化

// Chrome API のモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      clear: jest.fn().mockResolvedValue({})
    }
  },
  runtime: {
    getURL: jest.fn(path => path),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    }
  },
  i18n: {
    getUILanguage: jest.fn().mockReturnValue('ja'),
    getMessage: jest.fn(key => key)
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

// i18n マネージャーの簡易モック
global.i18n = {
  init: jest.fn().mockResolvedValue('ja'),
  applyToPage: jest.fn(),
  getMessage: jest.fn(key => key),
  getLocale: jest.fn().mockReturnValue('ja'),
  getRawSetting: jest.fn().mockResolvedValue('auto')
};

// fetch のモック
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({})
});

// コンソールログを抑制（必要に応じて）
// console.log = jest.fn();