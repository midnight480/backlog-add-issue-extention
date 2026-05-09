// i18n（国際化）マネージャー
// ユーザーの言語設定に基づいてUIテキストを切り替える

class I18nManager {
    constructor() {
        this.currentLocale = 'ja';
        this.messages = {};
        this.supportedLocales = ['ja', 'en'];
    }

    /**
     * 初期化: 言語設定を読み込み、メッセージを取得
     */
    async init() {
        // ストレージから言語設定を取得
        const locale = await this.getStoredLocale();
        this.currentLocale = locale;

        // メッセージファイルを読み込み
        await this.loadMessages(this.currentLocale);

        return this.currentLocale;
    }

    /**
     * ストレージから保存された言語設定を取得
     * 未設定の場合はブラウザの言語に基づいてデフォルトを決定
     * @returns {Promise<string>} ロケールコード
     */
    async getStoredLocale() {
        try {
            const result = await chrome.storage.local.get('displayLanguage');
            if (result.displayLanguage && result.displayLanguage !== 'auto') {
                return result.displayLanguage;
            }
        } catch (error) {
            console.warn('言語設定の読み込みに失敗:', error);
        }

        // 'auto' または未設定の場合、ブラウザの言語を判定
        return this.detectBrowserLocale();
    }

    /**
     * ブラウザの言語設定を検出
     * 日本語の場合は 'ja'、それ以外は 'en' を返す
     * @returns {string} ロケールコード
     */
    detectBrowserLocale() {
        const browserLang = chrome.i18n.getUILanguage() || navigator.language || 'en';
        // 日本語の場合のみ 'ja' を返す
        if (browserLang.startsWith('ja')) {
            return 'ja';
        }
        return 'en';
    }

    /**
     * メッセージファイルを読み込み
     * @param {string} locale - ロケールコード
     */
    async loadMessages(locale) {
        try {
            const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
            const response = await fetch(url);
            if (response.ok) {
                this.messages = await response.json();
            } else {
                console.error(`メッセージファイルの読み込みに失敗: ${locale}`);
                // フォールバック: 英語を読み込み
                if (locale !== 'en') {
                    const fallbackUrl = chrome.runtime.getURL('_locales/en/messages.json');
                    const fallbackResponse = await fetch(fallbackUrl);
                    if (fallbackResponse.ok) {
                        this.messages = await fallbackResponse.json();
                    }
                }
            }
        } catch (error) {
            console.error('メッセージファイルの読み込みエラー:', error);
        }
    }

    /**
     * メッセージキーに対応するテキストを取得
     * @param {string} key - メッセージキー
     * @param {Array<string>} substitutions - プレースホルダーの置換値
     * @returns {string} ローカライズされたテキスト
     */
    getMessage(key, substitutions = []) {
        const entry = this.messages[key];
        if (!entry) {
            console.warn(`i18n: キー "${key}" が見つかりません`);
            return key;
        }

        let message = entry.message;

        // プレースホルダーの置換
        if (substitutions.length > 0 && entry.placeholders) {
            Object.keys(entry.placeholders).forEach((name) => {
                const placeholder = entry.placeholders[name];
                const contentMatch = placeholder.content.match(/^\$(\d+)$/);
                if (contentMatch) {
                    const index = parseInt(contentMatch[1], 10) - 1;
                    if (index < substitutions.length) {
                        const regex = new RegExp(`\\$${name.toUpperCase()}\\$`, 'g');
                        message = message.replace(regex, substitutions[index]);
                    }
                }
            });
        }

        return message;
    }

    /**
     * 言語設定を保存
     * @param {string} locale - ロケールコード ('auto', 'ja', 'en')
     */
    async saveLocale(locale) {
        try {
            await chrome.storage.local.set({ displayLanguage: locale });
        } catch (error) {
            console.error('言語設定の保存に失敗:', error);
        }
    }

    /**
     * 現在の言語を取得
     * @returns {string} 現在のロケールコード
     */
    getLocale() {
        return this.currentLocale;
    }

    /**
     * ストレージに保存されている生の設定値を取得（'auto' を含む）
     * @returns {Promise<string>} 保存されている設定値
     */
    async getRawSetting() {
        try {
            const result = await chrome.storage.local.get('displayLanguage');
            return result.displayLanguage || 'auto';
        } catch (error) {
            return 'auto';
        }
    }

    /**
     * HTMLの data-i18n 属性を使ってページ全体を翻訳
     */
    applyToPage() {
        // data-i18n 属性を持つ要素のテキストを置換
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const text = this.getMessage(key);
            if (text !== key) {
                el.textContent = text;
            }
        });

        // data-i18n-placeholder 属性を持つ要素のplaceholderを置換
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = this.getMessage(key);
            if (text !== key) {
                el.placeholder = text;
            }
        });

        // data-i18n-title 属性を持つ要素のtitleを置換
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            const text = this.getMessage(key);
            if (text !== key) {
                el.title = text;
            }
        });

        // data-i18n-html 属性を持つ要素のinnerHTMLを置換
        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            const text = this.getMessage(key);
            if (text !== key) {
                el.innerHTML = text;
            }
        });
    }
}

// グローバルインスタンス
const i18n = new I18nManager();
