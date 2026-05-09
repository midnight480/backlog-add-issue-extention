// Side Panel UI JavaScript
// サイドパネルの動作を管理
// popup.jsのコードを再利用し、状態管理機能を追加

class SidePanelUI {
    constructor() {
        this.currentPanel = 'settings';
        this.stateManager = null;
        this.init();
    }

    async init() {
        // State Managerの初期化
        this.stateManager = new StateManager('sidePanelState', 500);

        // DOM要素の取得
        this.settingsTab = document.getElementById('settingsTab');
        this.addIssueTab = document.getElementById('addIssueTab');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.addIssuePanel = document.getElementById('addIssuePanel');
        this.messageArea = document.getElementById('messageArea');

        // Settings Panel の要素
        this.apiKeyNotRegistered = document.getElementById('apiKeyNotRegistered');
        this.apiKeyRegistered = document.getElementById('apiKeyRegistered');
        this.apiKeyChange = document.getElementById('apiKeyChange');
        
        // 入力フィールド
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.domainInput = document.getElementById('domainInput');
        this.newApiKeyInput = document.getElementById('newApiKeyInput');
        this.newDomainInput = document.getElementById('newDomainInput');
        
        // ボタン
        this.registerApiKeyBtn = document.getElementById('registerApiKeyBtn');
        this.changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
        this.deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
        this.updateApiKeyBtn = document.getElementById('updateApiKeyBtn');
        this.cancelChangeBtn = document.getElementById('cancelChangeBtn');
        
        // 状態表示要素
        this.registeredDomain = document.getElementById('registeredDomain');
        this.registeredDate = document.getElementById('registeredDate');

        // テンプレートエディタの要素
        this.templateEditor = document.getElementById('templateEditor');
        this.templateCharCounter = document.getElementById('templateCharCounter');
        this.saveTemplateBtn = document.getElementById('saveTemplateBtn');
        this.resetTemplateBtn = document.getElementById('resetTemplateBtn');
        this.templateMessage = document.getElementById('templateMessage');

        // Add Issue Panel の要素
        this.apiKeyRequired = document.getElementById('apiKeyRequired');
        this.goToSettingsBtn = document.getElementById('goToSettingsBtn');
        this.projectSelectionSection = document.getElementById('projectSelectionSection');
        this.projectSearchInput = document.getElementById('projectSearchInput');
        this.projectDropdown = document.getElementById('projectDropdown');
        this.projectList = document.getElementById('projectList');
        this.projectLoading = document.getElementById('projectLoading');
        this.projectError = document.getElementById('projectError');
        this.noProjectsFound = document.getElementById('noProjectsFound');
        this.selectedProject = document.getElementById('selectedProject');
        this.selectedProjectName = document.getElementById('selectedProjectName');
        this.clearProjectBtn = document.getElementById('clearProjectBtn');
        this.issueFormSection = document.getElementById('issueFormSection');

        // お気に入りプロジェクト関連の要素（Settings）
        this.loadFavoriteProjectsBtn = document.getElementById('loadFavoriteProjectsBtn');
        this.favoriteProjectsLoading = document.getElementById('favoriteProjectsLoading');
        this.favoriteProjectsError = document.getElementById('favoriteProjectsError');
        this.favoriteProjectsList = document.getElementById('favoriteProjectsList');
        this.saveFavoriteProjectsBtn = document.getElementById('saveFavoriteProjectsBtn');
        this.saveFavoriteProjectsGroup = document.getElementById('saveFavoriteProjectsGroup');
        this.favoriteProjectsMessage = document.getElementById('favoriteProjectsMessage');

        // お気に入りプロジェクト関連の要素（Add Issue）
        this.favoriteProjectSelect = document.getElementById('favoriteProjectSelect');
        this.noFavoriteProjectsMessage = document.getElementById('noFavoriteProjectsMessage');
        this.goToSettingsForFavoritesBtn = document.getElementById('goToSettingsForFavoritesBtn');

        this.issueTypeSelect = document.getElementById('issueTypeSelect');
        this.issueTypeError = document.getElementById('issueTypeError');
        this.issueSummary = document.getElementById('issueSummary');
        this.summaryCounter = document.getElementById('summaryCounter');
        this.summaryError = document.getElementById('summaryError');
        this.issueDescription = document.getElementById('issueDescription');
        this.createIssueBtn = document.getElementById('createIssueBtn');
        this.issueCreationStatus = document.getElementById('issueCreationStatus');

        // プロジェクト関連の状態
        this.allProjects = [];
        this.filteredProjects = [];
        this.selectedProjectData = null;
        this.projectIssueTypes = [];
        this.projectsLoaded = false; // 要件7.1: プロジェクト一覧の遅延読み込みフラグ

        // お気に入りプロジェクト関連の状態
        this.favoriteProjectsData = []; // Settings用: 全プロジェクト一覧
        this.favoriteProjectIds = new Set(); // 選択済みプロジェクトIDのセット

        // 課題フォーム関連の状態
        this.currentPageInfo = null;

        // 幅調整の監視用
        this.resizeObserver = null;

        // イベントリスナーの参照を保持（クリーンアップ用）
        this.eventListeners = [];

        // イベントリスナーの設定
        this.setupEventListeners();

        // リアルタイム入力バリデーションのセットアップ
        this.setupRealtimeValidation();

        // 自動保存のセットアップ
        this.setupAutoSave();

        // 幅の監視と保存のセットアップ
        this.setupWidthObserver();

        // サイドパネルが閉じられた時の処理をセットアップ
        this.setupUnloadHandler();

        // 保存された幅を復元
        await this.restorePanelWidth();

        // 保存された状態を読み込み
        await this.loadState();

        // 初期状態の読み込み
        await this.loadApiKeyStatus();

        // テンプレートエディタの初期化
        await this.initializeTemplateEditor();

        // Chrome Storage APIのイベントリスナーを設定（ポップアップとの同期用）
        this.setupStorageListener();

        // タブ切り替えのイベントリスナーを設定
        this.setupTabListener();

        // サイドパネルが開かれたことを記録
        await this.recordPanelOpened();

        // クローズメッセージのリスナーを設定
        this.setupCloseMessageListener();

        // お気に入りプロジェクトをストレージから読み込む（最後に実行）
        await this.loadFavoriteProjectsFromStorage();

        console.log('Backlog Issue Creator Side Panel initialized');
    }

    /**
     * Chrome Storage APIのイベントリスナーを設定
     * ポップアップでの変更をサイドパネルに反映する
     */
    setupStorageListener() {
        // Chrome Storage APIが利用可能かチェック
        if (!chrome || !chrome.storage || !chrome.storage.onChanged) {
            console.warn('Chrome Storage API is not available');
            return;
        }

        // イベントリスナーの参照を保持
        this.storageChangeListener = (changes, areaName) => {
            // ローカルストレージの変更のみを監視
            if (areaName !== 'local') {
                return;
            }

            // サイドパネルの状態変更を検知
            if (changes.sidePanelState) {
                const newState = changes.sidePanelState.newValue;
                
                // 状態が存在する場合のみ同期
                if (newState) {
                    this.syncStateFromStorage(newState);
                }
            }
        };

        chrome.storage.onChanged.addListener(this.storageChangeListener);
    }

    /**
     * タブ切り替えのイベントリスナーを設定
     * タブが変更された場合、新しいタブのURL情報を説明欄に反映する
     */
    setupTabListener() {
        // Chrome Tabs APIが利用可能かチェック
        if (!chrome || !chrome.tabs) {
            console.warn('Chrome Tabs API is not available');
            return;
        }

        // イベントリスナーの参照を保持
        this.tabActivatedListener = async (activeInfo) => {
            console.log('タブが切り替わりました:', activeInfo.tabId);
            await this.handleTabChange(activeInfo.tabId);
        };

        this.tabUpdatedListener = async (tabId, changeInfo, tab) => {
            // URLが変更された場合のみ処理
            if (changeInfo.url || changeInfo.status === 'complete') {
                // 現在アクティブなタブかチェック
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0 && tabs[0].id === tabId) {
                    console.log('アクティブタブのURLが更新されました:', changeInfo.url || tab.url);
                    await this.handleTabChange(tabId);
                }
            }
        };

        // タブがアクティブになった時
        chrome.tabs.onActivated.addListener(this.tabActivatedListener);

        // タブのURLが更新された時
        chrome.tabs.onUpdated.addListener(this.tabUpdatedListener);
    }

    /**
     * タブ変更時の処理
     * @param {number} tabId - 変更されたタブのID
     */
    async handleTabChange(tabId) {
        try {
            // 新しいタブの情報を取得
            const tab = await chrome.tabs.get(tabId);
            
            // タブ情報を更新
            const previousTabInfo = this.currentPageInfo;
            this.currentPageInfo = {
                url: tab.url,
                title: tab.title
            };

            // プロジェクトが選択されている場合のみ説明欄を更新
            if (this.selectedProjectData && this.issueDescription) {
                // 説明欄が空、またはデフォルトのテンプレートの場合のみ更新
                const currentDescription = this.issueDescription.value.trim();
                const shouldUpdate = this.shouldUpdateDescription(currentDescription, previousTabInfo);
                
                if (shouldUpdate) {
                    this.updateIssueDescription();
                    console.log('タブ変更により説明欄を更新しました');
                }
            }

            // 状態を保存（タブ情報を含む）
            await this.saveState();

        } catch (error) {
            console.error('タブ変更処理エラー:', error);
        }
    }

    /**
     * 説明欄を更新すべきかどうかを判定
     * @param {string} currentDescription - 現在の説明欄の内容
     * @param {Object} previousTabInfo - 前のタブ情報
     * @returns {boolean} 更新すべきかどうか
     */
    shouldUpdateDescription(currentDescription, previousTabInfo) {
        // 説明欄が空の場合は更新
        if (!currentDescription) {
            return true;
        }

        // 前のタブ情報がない場合は更新しない（初回読み込み時）
        if (!previousTabInfo) {
            return false;
        }

        // 前のタブのURLが含まれている場合は更新（テンプレートの可能性が高い）
        if (previousTabInfo.url && currentDescription.includes(previousTabInfo.url)) {
            return true;
        }

        // それ以外の場合は更新しない（ユーザーが編集している可能性がある）
        return false;
    }

    /**
     * ストレージから状態を同期
     * @param {Object} state - 同期する状態
     */
    async syncStateFromStorage(state) {
        // プロジェクトの同期
        if (state.selectedProject && JSON.stringify(state.selectedProject) !== JSON.stringify(this.selectedProjectData)) {
            this.selectedProjectData = state.selectedProject;
            this.selectedProjectName.textContent = `${state.selectedProject.name} (${state.selectedProject.projectKey})`;
            this.selectedProject.classList.remove('hidden');
            this.issueFormSection.classList.remove('hidden');
            
            // プロジェクトの課題種別を読み込み
            await this.loadProjectIssueTypes(state.selectedProject.id);
        }

        // 課題種別の同期
        if (state.issueType && this.issueTypeSelect && this.issueTypeSelect.value !== state.issueType) {
            this.issueTypeSelect.value = state.issueType;
        }

        // 件名の同期
        if (state.summary !== undefined && this.issueSummary && this.issueSummary.value !== state.summary) {
            this.issueSummary.value = state.summary;
            this.handleSummaryInput(state.summary);
        }

        // 説明の同期
        if (state.description !== undefined && this.issueDescription && this.issueDescription.value !== state.description) {
            this.issueDescription.value = state.description;
        }

        // 現在のタブ情報の同期
        if (state.currentTab) {
            this.currentPageInfo = state.currentTab;
        }

        console.log('サイドパネルの状態をポップアップと同期しました');
    }

    /**
     * 自動保存のセットアップ
     */
    setupAutoSave() {
        // 件名の自動保存
        if (this.issueSummary) {
            this.issueSummary.addEventListener('input', () => {
                this.saveState();
            });
        }

        // 説明の自動保存
        if (this.issueDescription) {
            this.issueDescription.addEventListener('input', () => {
                this.saveState();
            });
        }

        // 課題種別の自動保存
        if (this.issueTypeSelect) {
            this.issueTypeSelect.addEventListener('change', () => {
                this.saveState();
            });
        }
    }

    /**
     * サイドパネルが閉じられた時の処理をセットアップ
     * 要件6.2: ユーザがサイドパネルを閉じる時、入力内容を保持する
     * 要件7.2: サイドパネルが閉じられる時、不要なリソースを解放する
     */
    setupUnloadHandler() {
        // ページがアンロードされる前に状態を保存
        this.beforeUnloadListener = async () => {
            console.log('サイドパネルが閉じられます');
            
            // 入力内容を保存
            await this.saveState();
            
            // サイドパネルの開閉状態を記録
            try {
                await chrome.storage.local.set({ 
                    sidePanelIsOpen: false,
                    sidePanelClosedAt: Date.now()
                });
                console.log('サイドパネルの閉じた状態を記録しました');
            } catch (error) {
                console.error('サイドパネル状態記録エラー:', error);
            }

            // リソースのクリーンアップ
            this.cleanup();
        };

        window.addEventListener('beforeunload', this.beforeUnloadListener);

        // visibilitychangeイベントでも状態を保存
        this.visibilityChangeListener = async () => {
            if (document.hidden) {
                console.log('サイドパネルが非表示になりました');
                await this.saveState();
            }
        };

        document.addEventListener('visibilitychange', this.visibilityChangeListener);
    }

    /**
     * リソースのクリーンアップ
     * 要件7.2: サイドパネルが閉じられる時、不要なリソースを解放する
     * 要件7.5: メモリ使用量を最小限に抑える
     */
    cleanup() {
        console.log('リソースをクリーンアップしています...');

        // StateManagerのクリーンアップ
        if (this.stateManager) {
            this.stateManager.cleanup();
        }

        // ResizeObserverの停止
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
            console.log('ResizeObserverを停止しました');
        }

        // Chrome Storage APIのイベントリスナーを削除
        if (this.storageChangeListener && chrome && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.removeListener(this.storageChangeListener);
            this.storageChangeListener = null;
            console.log('Storage change listenerを削除しました');
        }

        // Chrome Tabs APIのイベントリスナーを削除
        if (this.tabActivatedListener && chrome && chrome.tabs) {
            chrome.tabs.onActivated.removeListener(this.tabActivatedListener);
            this.tabActivatedListener = null;
            console.log('Tab activated listenerを削除しました');
        }

        if (this.tabUpdatedListener && chrome && chrome.tabs) {
            chrome.tabs.onUpdated.removeListener(this.tabUpdatedListener);
            this.tabUpdatedListener = null;
            console.log('Tab updated listenerを削除しました');
        }

        // Chrome Runtime APIのイベントリスナーを削除
        if (this.closeMessageListener && chrome && chrome.runtime) {
            chrome.runtime.onMessage.removeListener(this.closeMessageListener);
            this.closeMessageListener = null;
            console.log('Close message listenerを削除しました');
        }

        // プロジェクトデータのクリア（メモリ解放）
        this.allProjects = [];
        this.filteredProjects = [];
        this.projectIssueTypes = [];
        this.projectsLoaded = false;
        console.log('プロジェクトデータをクリアしました');

        console.log('クリーンアップが完了しました');
    }

    /**
     * サイドパネルが開かれたことを記録
     * 要件6.1: サイドパネルの開閉状態を記録する
     */
    async recordPanelOpened() {
        try {
            await chrome.storage.local.set({ 
                sidePanelIsOpen: true,
                sidePanelOpenedAt: Date.now()
            });
            console.log('サイドパネルが開かれた状態を記録しました');
        } catch (error) {
            console.error('サイドパネル状態記録エラー:', error);
        }
    }

    /**
     * クローズメッセージのリスナーを設定
     * 要件1.2, 1.3: closeSidePanelメッセージを受信した時にwindow.close()を呼び出し、状態を更新
     */
    setupCloseMessageListener() {
        // Chrome Runtime APIが利用可能かチェック
        if (!chrome || !chrome.runtime) {
            console.warn('Chrome Runtime API is not available');
            return;
        }

        // メッセージリスナーの参照を保持
        this.closeMessageListener = async (message, sender, sendResponse) => {
            // closeSidePanelアクションを受信した場合
            if (message.action === 'closeSidePanel') {
                console.log('クローズメッセージを受信しました');
                
                try {
                    // サイドパネルの状態を更新
                    await chrome.storage.local.set({ 
                        sidePanelIsOpen: false,
                        sidePanelClosedAt: Date.now()
                    });
                    console.log('サイドパネルの閉じた状態を記録しました');
                    
                    // サイドパネルを閉じる
                    window.close();
                } catch (error) {
                    console.error('サイドパネルクローズ処理エラー:', error);
                }
            }
        };

        chrome.runtime.onMessage.addListener(this.closeMessageListener);
        console.log('クローズメッセージリスナーを設定しました');
    }

    /**
     * 幅の監視と保存のセットアップ
     */
    setupWidthObserver() {
        // ResizeObserverが利用可能な場合のみセットアップ
        if (typeof ResizeObserver === 'undefined') {
            console.warn('ResizeObserverが利用できません。幅の監視をスキップします。');
            return;
        }
        // ResizeObserverを使用してbodyの幅変更を監視
        this.resizeObserver = new ResizeObserver(this.debounceWidthSave.bind(this));
        this.resizeObserver.observe(document.body);
        
        console.log('幅の監視を開始しました');
    }

    /**
     * 幅の保存をデバウンス処理
     */
    debounceWidthSave = (() => {
        let timeoutId = null;
        return (entries) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                for (const entry of entries) {
                    const width = entry.contentRect.width;
                    // 幅が有効な範囲内の場合のみ保存
                    if (width >= 300 && width <= 600) {
                        this.savePanelWidth(width);
                    }
                }
            }, 500); // 500msのデバウンス
        };
    })();

    /**
     * パネルの幅を保存
     * @param {number} width - 保存する幅
     */
    async savePanelWidth(width) {
        try {
            await chrome.storage.local.set({ sidePanelWidth: width });
            console.log('パネル幅を保存しました:', width);
        } catch (error) {
            console.error('パネル幅の保存エラー:', error);
        }
    }

    /**
     * パネルの幅を復元
     */
    async restorePanelWidth() {
        try {
            const result = await chrome.storage.local.get('sidePanelWidth');
            
            if (result.sidePanelWidth) {
                const width = result.sidePanelWidth;
                
                // 幅が有効な範囲内かチェック
                if (width >= 300 && width <= 600) {
                    document.body.style.width = `${width}px`;
                    console.log('パネル幅を復元しました:', width);
                } else {
                    console.warn('保存された幅が範囲外です:', width);
                }
            } else {
                console.log('保存された幅がありません。デフォルト幅を使用します');
            }
        } catch (error) {
            console.error('パネル幅の復元エラー:', error);
        }
    }

    /**
     * 状態を保存
     */
    async saveState() {
        const state = {
            selectedProject: this.selectedProjectData,
            issueType: this.issueTypeSelect ? this.issueTypeSelect.value : null,
            summary: this.issueSummary ? this.issueSummary.value : '',
            description: this.issueDescription ? this.issueDescription.value : '',
            currentTab: this.currentPageInfo
        };

        await this.stateManager.saveState(state);
    }

    /**
     * 状態を読み込み
     */
    async loadState() {
        const state = await this.stateManager.loadState();

        // プロジェクトの復元（favoriteProjectSelectへの反映はrenderFavoriteProjectsInAddIssueで行う）
        if (state.selectedProject) {
            this.selectedProjectData = state.selectedProject;
            this.issueFormSection.classList.remove('hidden');
            
            // プロジェクトの課題種別を読み込み
            await this.loadProjectIssueTypes(state.selectedProject.id);
        }
        // 課題種別の復元
        if (state.issueType && this.issueTypeSelect) {
            this.issueTypeSelect.value = state.issueType;
        }

        // 件名の復元
        if (state.summary && this.issueSummary) {
            this.issueSummary.value = state.summary;
            this.handleSummaryInput(state.summary);
        }

        // 説明の復元
        if (state.description && this.issueDescription) {
            this.issueDescription.value = state.description;
        }

        // 現在のタブ情報の復元
        if (state.currentTab) {
            this.currentPageInfo = state.currentTab;
        }
    }

    setupEventListeners() {
        // タブ切り替えイベント
        this.settingsTab.addEventListener('click', () => {
            this.showPanel('settings');
        });

        this.addIssueTab.addEventListener('click', () => {
            this.showPanel('addIssue');
        });

        // Settings Panel のイベント
        this.registerApiKeyBtn.addEventListener('click', () => {
            this.handleRegisterApiKey();
        });

        this.changeApiKeyBtn.addEventListener('click', () => {
            this.showApiKeyChangeForm();
        });

        this.deleteApiKeyBtn.addEventListener('click', () => {
            this.handleDeleteApiKey();
        });

        this.updateApiKeyBtn.addEventListener('click', () => {
            this.handleUpdateApiKey();
        });

        this.cancelChangeBtn.addEventListener('click', () => {
            this.showApiKeyRegisteredView();
        });

        // テンプレートエディタのイベント
        this.templateEditor.addEventListener('input', (e) => {
            this.updateCharacterCounter(e.target.value);
        });

        this.saveTemplateBtn.addEventListener('click', () => {
            this.saveTemplateFromUI();
        });

        this.resetTemplateBtn.addEventListener('click', () => {
            this.resetTemplateToDefault();
        });

        // Enterキーでの送信
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleRegisterApiKey();
            }
        });

        this.newApiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUpdateApiKey();
            }
        });

        // Add Issue Panel のイベント
        this.goToSettingsBtn.addEventListener('click', () => {
            this.showPanel('settings');
        });

        // プロジェクト検索のイベント（後方互換性のため残す）
        if (this.projectSearchInput) {
            this.projectSearchInput.addEventListener('input', (e) => {
                this.handleProjectSearch(e.target.value);
            });

            this.projectSearchInput.addEventListener('focus', async () => {
                // 要件7.1: プロジェクト一覧の遅延読み込み
                // フォーカス時に初めてプロジェクト一覧を読み込む
                if (!this.projectsLoaded) {
                    await this.loadProjects();
                } else {
                    this.showProjectDropdown();
                }
            });

            this.projectSearchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (this.projectDropdown && !this.projectDropdown.contains(document.activeElement)) {
                        this.hideProjectDropdown();
                    }
                }, 150);
            });
        }

        // プロジェクト選択解除（後方互換性のため残す）
        if (this.clearProjectBtn) {
            this.clearProjectBtn.addEventListener('click', () => {
                this.clearSelectedProject();
            });
        }

        // お気に入りプロジェクト関連のイベント（Settings）
        if (this.loadFavoriteProjectsBtn) {
            this.loadFavoriteProjectsBtn.addEventListener('click', async () => {
                await this.loadAllProjectsForFavorites();
            });
        }

        if (this.saveFavoriteProjectsBtn) {
            this.saveFavoriteProjectsBtn.addEventListener('click', async () => {
                await this.saveFavoriteProjects();
            });
        }

        // お気に入りプロジェクト選択（Add Issue）
        if (this.favoriteProjectSelect) {
            this.favoriteProjectSelect.addEventListener('change', async (e) => {
                const selectedId = parseInt(e.target.value, 10);
                if (selectedId) {
                    const project = this.getFavoriteProjectById(selectedId);
                    if (project) {
                        await this.selectProject(project);
                    }
                } else {
                    // 未選択に戻した場合
                    this.selectedProjectData = null;
                    this.issueFormSection.classList.add('hidden');
                    this.clearIssueTypes();
                    await this.saveState();
                }
            });
        }

        // Settings誘導ボタン（お気に入り未設定時）
        if (this.goToSettingsForFavoritesBtn) {
            this.goToSettingsForFavoritesBtn.addEventListener('click', () => {
                this.showPanel('settings');
            });
        }

        this.issueTypeSelect.addEventListener('change', (e) => {
            this.handleIssueTypeChange(e.target.value);
        });

        // 課題入力フォームのイベント
        this.issueSummary.addEventListener('input', (e) => {
            this.handleSummaryInput(e.target.value);
            this.autoResizeSummaryField(e.target);
        });

        this.issueSummary.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.createIssueBtn.disabled) {
                e.preventDefault();
                this.handleCreateIssue();
            }
        });

        this.createIssueBtn.addEventListener('click', () => {
            this.handleCreateIssue();
        });

        // ドキュメント全体のクリックイベント
        document.addEventListener('click', (e) => {
            if (this.projectSelectionSection && !this.projectSelectionSection.contains(e.target)) {
                this.hideProjectDropdown();
            }
        });
    }

    /**
     * パネルを切り替える
     * @param {string} panelName - 'settings' または 'addIssue'
     */
    showPanel(panelName) {
        this.settingsTab.classList.remove('active');
        this.addIssueTab.classList.remove('active');
        this.settingsPanel.classList.remove('active');
        this.addIssuePanel.classList.remove('active');

        if (panelName === 'settings') {
            this.settingsTab.classList.add('active');
            this.settingsPanel.classList.add('active');
            this.currentPanel = 'settings';
            this.loadApiKeyStatus();
        } else if (panelName === 'addIssue') {
            this.addIssueTab.classList.add('active');
            this.addIssuePanel.classList.add('active');
            this.currentPanel = 'addIssue';
            this.initializeAddIssuePanel();
        }

        this.hideMessage();
    }

    /**
     * メッセージを表示する
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 'success' または 'error'
     */
    showMessage(message, type = 'success') {
        this.messageArea.textContent = message;
        this.messageArea.className = `message-area ${type}`;
        this.messageArea.classList.remove('hidden');
    }

    /**
     * メッセージを非表示にする
     */
    hideMessage() {
        this.messageArea.classList.add('hidden');
    }

    /**
     * Background Service Workerにメッセージを送信
     * @param {string} action - アクション名
     * @param {Object} data - 送信データ
     * @returns {Promise<Object>} レスポンス
     */
    async sendMessageToBackground(action, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action, ...data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * APIキーの状態を読み込む
     */
    async loadApiKeyStatus() {
        try {
            const response = await this.sendMessageToBackground('getApiKey');
            
            if (response.success) {
                this.showApiKeyRegisteredView();
                this.registeredDomain.textContent = response.domain;
                
                const createdDate = new Date(response.createdAt);
                this.registeredDate.textContent = createdDate.toLocaleDateString('ja-JP');
            } else {
                this.showApiKeyNotRegisteredView();
            }
        } catch (error) {
            console.error('APIキー状態の読み込みエラー:', error);
            this.showMessage('APIキー状態の読み込みに失敗しました', 'error');
            this.showApiKeyNotRegisteredView();
        }
    }

    /**
     * APIキー未登録画面を表示
     */
    showApiKeyNotRegisteredView() {
        this.apiKeyNotRegistered.classList.remove('hidden');
        this.apiKeyRegistered.classList.add('hidden');
        this.apiKeyChange.classList.add('hidden');
        
        this.apiKeyInput.value = '';
        this.domainInput.value = '';
    }

    /**
     * APIキー登録済み画面を表示
     */
    showApiKeyRegisteredView() {
        this.apiKeyNotRegistered.classList.add('hidden');
        this.apiKeyRegistered.classList.remove('hidden');
        this.apiKeyChange.classList.add('hidden');
    }

    /**
     * APIキー変更フォームを表示
     */
    showApiKeyChangeForm() {
        this.apiKeyNotRegistered.classList.add('hidden');
        this.apiKeyRegistered.classList.add('hidden');
        this.apiKeyChange.classList.remove('hidden');
        
        this.newApiKeyInput.value = '';
        this.newDomainInput.value = '';
        this.newApiKeyInput.focus();
    }

    /**
     * APIキー登録処理
     */
    async handleRegisterApiKey() {
        if (!this.validateAllInputs('apiKey')) {
            return;
        }

        const apiKey = this.apiKeyInput.value.trim();
        const domain = this.domainInput.value.trim();

        try {
            this.registerApiKeyBtn.disabled = true;
            this.registerApiKeyBtn.textContent = '登録中...';

            const response = await this.sendMessageToBackground('saveApiKey', { apiKey, domain });

            if (response.success) {
                this.showMessage('APIキーが正常に登録されました', 'success');
                this.loadApiKeyStatus();
            } else {
                this.showMessage(`APIキーの登録に失敗しました: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('APIキー登録エラー:', error);
            this.showMessage('APIキーの登録に失敗しました', 'error');
        } finally {
            this.registerApiKeyBtn.disabled = false;
            this.registerApiKeyBtn.textContent = 'APIキーを登録';
        }
    }

    /**
     * APIキー更新処理
     */
    async handleUpdateApiKey() {
        if (!this.validateAllInputs('apiKey')) {
            return;
        }

        const apiKey = this.newApiKeyInput.value.trim();
        const domain = this.newDomainInput.value;

        try {
            this.updateApiKeyBtn.disabled = true;
            this.updateApiKeyBtn.textContent = '更新中...';

            const response = await this.sendMessageToBackground('saveApiKey', { apiKey, domain });

            if (response.success) {
                this.showMessage('APIキーが正常に更新されました', 'success');
                this.loadApiKeyStatus();
            } else {
                this.showMessage(`APIキーの更新に失敗しました: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('APIキー更新エラー:', error);
            this.showMessage('APIキーの更新に失敗しました', 'error');
        } finally {
            this.updateApiKeyBtn.disabled = false;
            this.updateApiKeyBtn.textContent = '更新';
        }
    }

    /**
     * APIキー削除処理
     */
    async handleDeleteApiKey() {
        if (!confirm('APIキーを削除しますか？この操作は取り消せません。')) {
            return;
        }

        try {
            this.deleteApiKeyBtn.disabled = true;
            this.deleteApiKeyBtn.textContent = '削除中...';

            const response = await this.sendMessageToBackground('deleteApiKey');

            if (response.success) {
                this.showMessage('APIキーが正常に削除されました', 'success');
                this.loadApiKeyStatus();
            } else {
                this.showMessage(`APIキーの削除に失敗しました: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('APIキー削除エラー:', error);
            this.showMessage('APIキーの削除に失敗しました', 'error');
        } finally {
            this.deleteApiKeyBtn.disabled = false;
            this.deleteApiKeyBtn.textContent = '削除';
        }
    }

    /**
     * Add Issue Panel の初期化
     * 要件7.1: サイドパネルが開かれる時、必要なリソースのみを読み込む
     */
    async initializeAddIssuePanel() {
        try {
            const apiKeyResult = await this.sendMessageToBackground('getApiKey');
            
            if (!apiKeyResult.success) {
                this.showApiKeyRequiredView();
                return;
            }

            this.showProjectSelectionView();

            // お気に入りプロジェクトをプルダウンに描画
            await this.renderFavoriteProjectsInAddIssue();
            
        } catch (error) {
            console.error('Add Issue Panel初期化エラー:', error);
            this.showMessage('初期化中にエラーが発生しました', 'error');
        }
    }

    /**
     * APIキー必須画面を表示
     */
    showApiKeyRequiredView() {
        this.apiKeyRequired.classList.remove('hidden');
        this.projectSelectionSection.classList.add('hidden');
        this.issueFormSection.classList.add('hidden');
    }

    /**
     * プロジェクト選択画面を表示
     */
    showProjectSelectionView() {
        this.apiKeyRequired.classList.add('hidden');
        this.projectSelectionSection.classList.remove('hidden');
        if (this.selectedProjectData) {
            this.issueFormSection.classList.remove('hidden');
        } else {
            this.issueFormSection.classList.add('hidden');
        }
    }

    /**
     * お気に入りプロジェクトをストレージから読み込む
     * @returns {Promise<void>}
     */
    async loadFavoriteProjectsFromStorage() {
        try {
            const response = await this.sendMessageToBackground('getFavoriteProjects');
            if (response && response.success) {
                this.favoriteProjectIds = new Set(response.projects.map(p => p.id));
                console.log('お気に入りプロジェクトを読み込みました:', response.projects.length + '件');
            }
        } catch (error) {
            console.error('お気に入りプロジェクト読み込みエラー:', error);
        }
    }

    /**
     * Settingsパネル用: 全プロジェクトを読み込んでチェックボックス一覧を表示
     * @returns {Promise<void>}
     */
    async loadAllProjectsForFavorites() {
        try {
            // ローディング表示
            this.favoriteProjectsLoading.classList.remove('hidden');
            this.favoriteProjectsError.classList.add('hidden');
            this.favoriteProjectsList.classList.add('hidden');
            this.saveFavoriteProjectsGroup.style.display = 'none';

            const response = await this.sendMessageToBackground('getProjects');

            if (response.success) {
                this.favoriteProjectsData = response.projects;
                this.favoriteProjectsLoading.classList.add('hidden');
                this.renderFavoriteProjectsList();
                this.favoriteProjectsList.classList.remove('hidden');
                this.saveFavoriteProjectsGroup.style.display = '';
                console.log('Settings用プロジェクト一覧を読み込みました:', response.projects.length + '件');
            } else {
                this.favoriteProjectsLoading.classList.add('hidden');
                this.favoriteProjectsError.classList.remove('hidden');
                this.showMessage(`プロジェクトの読み込みに失敗しました: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Settings用プロジェクト読み込みエラー:', error);
            this.favoriteProjectsLoading.classList.add('hidden');
            this.favoriteProjectsError.classList.remove('hidden');
            this.showMessage('プロジェクトの読み込みに失敗しました', 'error');
        }
    }

    /**
     * お気に入りプロジェクトのチェックボックスリストを描画
     */
    renderFavoriteProjectsList() {
        this.favoriteProjectsList.innerHTML = '';

        if (this.favoriteProjectsData.length === 0) {
            this.favoriteProjectsList.innerHTML = '<p style="padding:8px;color:#6c757d;font-size:13px;">プロジェクトが見つかりません</p>';
            return;
        }

        this.favoriteProjectsData.forEach(project => {
            const item = document.createElement('div');
            item.className = 'favorite-project-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `fav-proj-${project.id}`;
            checkbox.value = project.id;
            checkbox.checked = this.favoriteProjectIds.has(project.id);
            checkbox.setAttribute('data-testid', `favorite-project-checkbox-${project.id}`);

            const label = document.createElement('label');
            label.htmlFor = `fav-proj-${project.id}`;
            label.innerHTML = `
                <span class="project-name">${this.escapeHtml(project.name)}</span>
                <span class="project-key">${this.escapeHtml(project.projectKey)}</span>
            `;

            item.appendChild(checkbox);
            item.appendChild(label);
            this.favoriteProjectsList.appendChild(item);
        });
    }

    /**
     * お気に入りプロジェクトを保存する
     * @returns {Promise<void>}
     */
    async saveFavoriteProjects() {
        try {
            this.saveFavoriteProjectsBtn.disabled = true;
            this.saveFavoriteProjectsBtn.textContent = '保存中...';

            // チェックされたプロジェクトを収集
            const checkboxes = this.favoriteProjectsList.querySelectorAll('input[type="checkbox"]:checked');
            const selectedProjects = [];

            checkboxes.forEach(checkbox => {
                const projectId = parseInt(checkbox.value, 10);
                const project = this.favoriteProjectsData.find(p => p.id === projectId);
                if (project) {
                    selectedProjects.push({
                        id: project.id,
                        projectKey: project.projectKey,
                        name: project.name
                    });
                }
            });

            const response = await this.sendMessageToBackground('saveFavoriteProjects', {
                projects: selectedProjects
            });

            if (response.success) {
                // 選択済みIDセットを更新
                this.favoriteProjectIds = new Set(selectedProjects.map(p => p.id));
                this.showFavoriteProjectsMessage('お気に入りプロジェクトを保存しました', 'success');
                console.log('お気に入りプロジェクトを保存しました:', selectedProjects.length + '件');
            } else {
                this.showFavoriteProjectsMessage('保存に失敗しました。再度お試しください。', 'error');
            }
        } catch (error) {
            console.error('お気に入りプロジェクト保存エラー:', error);
            this.showFavoriteProjectsMessage('保存中にエラーが発生しました', 'error');
        } finally {
            this.saveFavoriteProjectsBtn.disabled = false;
            this.saveFavoriteProjectsBtn.textContent = '保存';
        }
    }

    /**
     * お気に入りプロジェクトのメッセージを表示（3秒後に自動非表示）
     * @param {string} message - メッセージ
     * @param {string} type - 'success' または 'error'
     */
    showFavoriteProjectsMessage(message, type) {
        this.favoriteProjectsMessage.textContent = message;
        this.favoriteProjectsMessage.className = `favorite-projects-message ${type}`;
        this.favoriteProjectsMessage.classList.remove('hidden');

        setTimeout(() => {
            this.favoriteProjectsMessage.classList.add('hidden');
        }, 3000);
    }

    /**
     * Add Issueパネル用: お気に入りプロジェクトをプルダウンに描画
     * @returns {Promise<void>}
     */
    async renderFavoriteProjectsInAddIssue() {
        try {
            const response = await this.sendMessageToBackground('getFavoriteProjects');

            if (!response.success || response.projects.length === 0) {
                // お気に入り未設定: メッセージを表示
                this.noFavoriteProjectsMessage.classList.remove('hidden');
                this.favoriteProjectSelect.classList.add('hidden');
                this.issueFormSection.classList.add('hidden');
                return;
            }

            // プルダウンを構築
            this.favoriteProjectSelect.innerHTML = '<option value="">プロジェクトを選択してください</option>';
            response.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = `${this.escapeHtml(project.name)} (${this.escapeHtml(project.projectKey)})`;
                this.favoriteProjectSelect.appendChild(option);
            });

            this.noFavoriteProjectsMessage.classList.add('hidden');
            this.favoriteProjectSelect.classList.remove('hidden');

            // 保存済みの選択プロジェクトを復元
            if (this.selectedProjectData) {
                this.favoriteProjectSelect.value = this.selectedProjectData.id;
                this.issueFormSection.classList.remove('hidden');
            }

            console.log('お気に入りプロジェクトをプルダウンに描画しました:', response.projects.length + '件');
        } catch (error) {
            console.error('お気に入りプロジェクト描画エラー:', error);
            this.noFavoriteProjectsMessage.classList.remove('hidden');
            this.favoriteProjectSelect.classList.add('hidden');
        }
    }

    /**
     * IDでお気に入りプロジェクトを検索する
     * @param {number} id - プロジェクトID
     * @returns {Object|null} プロジェクトオブジェクト
     */
    getFavoriteProjectById(id) {
        // favoriteProjectsDataがある場合はそこから検索
        if (this.favoriteProjectsData.length > 0) {
            return this.favoriteProjectsData.find(p => p.id === id) || null;
        }
        // なければallProjectsから検索
        return this.allProjects.find(p => p.id === id) || null;
    }

    /**
     * プロジェクト一覧を読み込む
     * 要件7.1: サイドパネルが開かれる時、必要なリソースのみを読み込む
     */
    async loadProjects() {
        // 既に読み込まれている場合はスキップ
        if (this.projectsLoaded) {
            console.log('プロジェクト一覧は既に読み込まれています');
            this.renderProjectList();
            return;
        }

        try {
            this.showProjectLoading();
            
            const response = await this.sendMessageToBackground('getProjects');
            
            if (response.success) {
                this.allProjects = response.projects;
                this.filteredProjects = [...this.allProjects];
                this.projectsLoaded = true; // 読み込み完了フラグを設定
                this.renderProjectList();
                console.log('プロジェクト一覧を読み込みました:', this.allProjects.length + '件');
            } else {
                this.showProjectError();
                this.showMessage(`プロジェクトの読み込みに失敗しました: ${response.message}`, 'error');
            }
            
        } catch (error) {
            console.error('プロジェクト読み込みエラー:', error);
            this.showProjectError();
            this.showMessage('プロジェクトの読み込みに失敗しました', 'error');
        }
    }

    /**
     * プロジェクト読み込み中表示
     */
    showProjectLoading() {
        this.projectLoading.classList.remove('hidden');
        this.projectError.classList.add('hidden');
        this.noProjectsFound.classList.add('hidden');
        this.projectList.innerHTML = '';
    }

    /**
     * プロジェクトエラー表示
     */
    showProjectError() {
        this.projectLoading.classList.add('hidden');
        this.projectError.classList.remove('hidden');
        this.noProjectsFound.classList.add('hidden');
        this.projectList.innerHTML = '';
    }

    /**
     * プロジェクト一覧を描画
     */
    renderProjectList() {
        this.projectLoading.classList.add('hidden');
        this.projectError.classList.add('hidden');
        
        if (this.filteredProjects.length === 0) {
            this.noProjectsFound.classList.remove('hidden');
            this.projectList.innerHTML = '';
            return;
        }

        this.noProjectsFound.classList.add('hidden');
        this.projectList.innerHTML = '';
        
        this.filteredProjects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.dataset.projectId = project.id;
            
            projectItem.innerHTML = `
                <div class="project-name">${this.escapeHtml(project.name)}</div>
                <div class="project-key">${this.escapeHtml(project.projectKey)}</div>
            `;
            
            projectItem.addEventListener('click', () => {
                this.selectProject(project);
            });
            
            this.projectList.appendChild(projectItem);
        });
    }

    /**
     * プロジェクト検索処理
     * @param {string} query - 検索クエリ
     */
    handleProjectSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (searchTerm === '') {
            this.filteredProjects = [...this.allProjects];
        } else {
            this.filteredProjects = this.allProjects.filter(project => 
                project.name.toLowerCase().includes(searchTerm) ||
                project.projectKey.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderProjectList();
        this.showProjectDropdown();
    }

    /**
     * プロジェクトを選択
     * @param {Object} project - 選択されたプロジェクト
     */
    async selectProject(project) {
        this.selectedProjectData = project;
        this.selectedProjectName.textContent = `${project.name} (${project.projectKey})`;
        this.selectedProject.classList.remove('hidden');
        if (this.projectSearchInput) {
            this.projectSearchInput.value = '';
        }
        this.hideProjectDropdown();
        
        this.issueFormSection.classList.remove('hidden');
        
        if (this.issueSummary) {
            this.issueSummary.style.height = '36px';
            this.issueSummary.style.overflowY = 'hidden';
        }
        
        await this.loadProjectIssueTypes(project.id);
        await this.loadCurrentPageInfo();
        
        // 説明欄が空の場合のみテンプレートを適用
        if (!this.issueDescription.value.trim()) {
            await this.updateIssueDescription();
        }
        
        // 状態を保存
        await this.saveState();
        
        console.log('プロジェクトを選択しました:', project.name);
    }

    /**
     * プロジェクト選択を解除
     */
    async clearSelectedProject() {
        this.selectedProjectData = null;
        this.selectedProject.classList.add('hidden');
        this.issueFormSection.classList.add('hidden');
        this.projectSearchInput.focus();
        
        this.clearIssueTypes();
        
        // 説明欄もクリア
        if (this.issueDescription) {
            this.issueDescription.value = '';
        }
        
        // 状態を保存
        await this.saveState();
        
        console.log('プロジェクト選択を解除しました');
    }

    /**
     * プロジェクトドロップダウンを表示
     */
    showProjectDropdown() {
        if (this.allProjects.length > 0) {
            this.projectDropdown.classList.remove('hidden');
        }
    }

    /**
     * プロジェクトドロップダウンを非表示
     */
    hideProjectDropdown() {
        if (this.projectDropdown) {
            this.projectDropdown.classList.add('hidden');
        }
    }

    /**
     * HTMLエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * プロジェクトの課題種別を読み込む
     * @param {string} projectId - プロジェクトID
     */
    async loadProjectIssueTypes(projectId) {
        try {
            this.showIssueTypeLoading();
            
            const response = await this.sendMessageToBackground('getIssueTypes', { projectId });
            
            if (response.success) {
                this.projectIssueTypes = response.issueTypes;
                this.renderIssueTypes();
                console.log('課題種別を読み込みました:', this.projectIssueTypes.length + '件');
            } else {
                this.showIssueTypeError();
                this.showMessage(`課題種別の読み込みに失敗しました: ${response.message}`, 'error');
            }
            
        } catch (error) {
            console.error('課題種別読み込みエラー:', error);
            this.showIssueTypeError();
            this.showMessage('課題種別の読み込みに失敗しました', 'error');
        }
    }

    /**
     * 課題種別読み込み中表示
     */
    showIssueTypeLoading() {
        this.issueTypeSelect.innerHTML = '<option value="">課題種別を読み込み中...</option>';
        this.issueTypeSelect.disabled = true;
    }

    /**
     * 課題種別エラー表示
     */
    showIssueTypeError() {
        this.issueTypeSelect.innerHTML = '<option value="">課題種別の読み込みに失敗しました</option>';
        this.issueTypeSelect.disabled = true;
    }

    /**
     * 課題種別一覧を描画
     */
    renderIssueTypes() {
        this.issueTypeSelect.innerHTML = '<option value="">課題種別を選択してください</option>';
        
        if (this.projectIssueTypes.length === 0) {
            this.issueTypeSelect.innerHTML = '<option value="">利用可能な課題種別がありません</option>';
            this.issueTypeSelect.disabled = true;
            return;
        }

        this.projectIssueTypes.forEach(issueType => {
            const option = document.createElement('option');
            option.value = issueType.id;
            option.textContent = issueType.name;
            option.style.color = issueType.color || '#000000';
            this.issueTypeSelect.appendChild(option);
        });
        
        this.issueTypeSelect.disabled = false;
        
        if (this.projectIssueTypes.length > 0) {
            this.issueTypeSelect.value = this.projectIssueTypes[0].id;
            this.handleIssueTypeChange(this.projectIssueTypes[0].id);
        }
    }

    /**
     * 課題種別をクリア
     */
    clearIssueTypes() {
        this.projectIssueTypes = [];
        this.issueTypeSelect.innerHTML = '<option value="">課題種別を選択してください</option>';
        this.issueTypeSelect.disabled = true;
        this.hideIssueTypeError();
    }

    /**
     * 課題種別変更処理
     * @param {string} issueTypeId - 選択された課題種別ID
     */
    handleIssueTypeChange(issueTypeId) {
        if (issueTypeId) {
            const selectedIssueType = this.projectIssueTypes.find(type => type.id.toString() === issueTypeId);
            if (selectedIssueType) {
                console.log('課題種別を選択しました:', selectedIssueType.name);
            }
            this.hideIssueTypeError();
        }
        
        this.updateCreateButtonState();
    }

    /**
     * 課題種別エラーを非表示
     */
    hideIssueTypeError() {
        this.issueTypeError.classList.add('hidden');
        this.issueTypeSelect.style.borderColor = '';
    }

    /**
     * 現在のページ情報を取得
     */
    async loadCurrentPageInfo() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const tab = tabs[0];
                this.currentPageInfo = {
                    url: tab.url,
                    title: tab.title
                };
                
                // 状態を保存
                await this.saveState();
            }
        } catch (error) {
            console.error('ページ情報取得エラー:', error);
            this.currentPageInfo = {
                url: '',
                title: ''
            };
        }
    }

    /**
     * 説明欄を更新
     * 要件2.6: 課題作成時に保存されたテンプレートを使用
     * 要件2.8: テンプレート変数を実際の値に置換
     */
    async updateIssueDescription() {
        try {
            if (!this.currentPageInfo || !this.currentPageInfo.url) {
                console.warn('ページ情報が取得できていません');
                return;
            }
            
            // Service Workerからテンプレートを読み込む
            const templateResponse = await this.sendMessageToBackground('loadTemplate');
            
            if (!templateResponse.success) {
                console.error('テンプレートの読み込みに失敗しました');
                // フォールバック: デフォルトのテンプレートを使用
                const defaultTemplate = `参照元:\n{{title}}\n{{url}}`;
                const replacedText = this.replaceVariablesLocally(defaultTemplate);
                this.issueDescription.value = replacedText;
                return;
            }
            
            const template = templateResponse.template;
            
            // テンプレート変数を置換
            const variables = {
                url: this.currentPageInfo.url,
                title: this.currentPageInfo.title
            };
            
            const replaceResponse = await this.sendMessageToBackground('replaceVariables', {
                template: template,
                variables: variables
            });
            
            if (replaceResponse.success) {
                this.issueDescription.value = replaceResponse.text;
                console.log('テンプレートを適用しました');
            } else {
                // フォールバック: ローカルで置換
                const replacedText = this.replaceVariablesLocally(template);
                this.issueDescription.value = replacedText;
            }
        } catch (error) {
            console.error('説明欄更新エラー:', error);
            // エラー時はシンプルなテンプレートを使用
            const simpleTemplate = `参照元:\n${this.currentPageInfo.title}\n${this.currentPageInfo.url}`;
            this.issueDescription.value = simpleTemplate;
        }
    }

    /**
     * ローカルで変数を置換（フォールバック用）
     * @param {string} template - テンプレート文字列
     * @returns {string} 置換後の文字列
     */
    replaceVariablesLocally(template) {
        let result = template;
        
        if (this.currentPageInfo) {
            if (this.currentPageInfo.url) {
                result = result.replace(/\{\{url\}\}/g, this.currentPageInfo.url);
            }
            if (this.currentPageInfo.title) {
                result = result.replace(/\{\{title\}\}/g, this.currentPageInfo.title);
            }
        }
        
        return result;
    }

    /**
     * 件名入力処理
     * @param {string} value - 入力値
     */
    handleSummaryInput(value) {
        const length = value.length;
        const maxLength = 255;
        
        this.summaryCounter.textContent = `${length}/${maxLength}`;
        
        this.summaryCounter.classList.remove('warning', 'danger');
        if (length > maxLength * 0.9) {
            this.summaryCounter.classList.add('danger');
        } else if (length > maxLength * 0.8) {
            this.summaryCounter.classList.add('warning');
        }
        
        this.validateSummary(value);
        this.updateCreateButtonState();
    }

    /**
     * 件名入力フィールドの自動高さ調整
     * @param {HTMLTextAreaElement} textarea - 件名入力フィールド
     */
    autoResizeSummaryField(textarea) {
        textarea.style.height = 'auto';
        
        const minHeight = 36;
        const maxHeight = 108;
        const scrollHeight = textarea.scrollHeight;
        
        if (scrollHeight <= minHeight) {
            textarea.style.height = `${minHeight}px`;
            textarea.style.overflowY = 'hidden';
        } else if (scrollHeight >= maxHeight) {
            textarea.style.height = `${maxHeight}px`;
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.height = `${scrollHeight}px`;
            textarea.style.overflowY = 'hidden';
        }
    }

    /**
     * 件名のバリデーション
     * @param {string} value - 件名
     * @returns {boolean} バリデーション結果
     */
    validateSummary(value) {
        const trimmedValue = value.trim();
        
        if (trimmedValue === '') {
            this.showSummaryError('件名は必須です');
            return false;
        }
        
        if (value.length > 255) {
            this.showSummaryError('件名は255文字以内で入力してください');
            return false;
        }
        
        this.hideSummaryError();
        return true;
    }

    /**
     * 件名エラーを表示
     * @param {string} message - エラーメッセージ
     */
    showSummaryError(message) {
        this.summaryError.textContent = message;
        this.summaryError.classList.remove('hidden');
        this.issueSummary.style.borderColor = '#dc3545';
    }

    /**
     * 件名エラーを非表示
     */
    hideSummaryError() {
        this.summaryError.classList.add('hidden');
        this.issueSummary.style.borderColor = '';
    }

    /**
     * 作成ボタンの状態を更新
     */
    updateCreateButtonState() {
        const summaryValid = this.validateSummary(this.issueSummary.value);
        const projectSelected = this.selectedProjectData !== null;
        const issueTypeSelected = this.issueTypeSelect.value !== '';
        
        this.createIssueBtn.disabled = !(summaryValid && projectSelected && issueTypeSelected);
    }

    /**
     * 課題作成処理
     */
    async handleCreateIssue() {
        if (this.createIssueBtn.disabled) {
            return;
        }

        if (!this.validateAllInputs('issue')) {
            return;
        }

        const summary = this.issueSummary.value.trim();
        const description = this.issueDescription.value.trim();
        const issueTypeId = this.issueTypeSelect.value;

        try {
            this.createIssueBtn.disabled = true;
            this.createIssueBtn.textContent = '作成中...';
            this.showCreationStatus('課題を作成しています...', 'loading');

            const response = await this.sendMessageToBackground('createIssue', {
                projectId: this.selectedProjectData.id,
                summary: summary,
                description: description,
                issueTypeId: issueTypeId
            });

            if (response.success) {
                const successMessage = `課題「${response.issue.issueKey}」が${this.selectedProjectData.name}プロジェクトに正常に作成されました`;
                this.showMessage(successMessage, 'success');
                this.showCreationStatus(`課題が作成されました: ${response.issue.issueKey}`, 'success');
                
                // 状態をクリア
                await this.stateManager.clearState();
                
                this.resetIssueForm();
            } else {
                this.showMessage(`課題の作成に失敗しました: ${response.message}`, 'error');
                this.showCreationStatus(`課題の作成に失敗しました: ${response.message}`, 'error');
            }

        } catch (error) {
            console.error('課題作成エラー:', error);
            this.showMessage('課題の作成中にエラーが発生しました', 'error');
            this.showCreationStatus('課題の作成中にエラーが発生しました', 'error');
        } finally {
            this.createIssueBtn.disabled = false;
            this.createIssueBtn.textContent = '課題を作成';
        }
    }

    /**
     * 作成ステータスを表示
     * @param {string} message - ステータスメッセージ
     * @param {string} type - 'loading', 'success', 'error'
     */
    showCreationStatus(message, type) {
        const statusMessage = this.issueCreationStatus.querySelector('.status-message');
        statusMessage.textContent = message;
        
        this.issueCreationStatus.className = `creation-status ${type}`;
        this.issueCreationStatus.classList.remove('hidden');
    }

    /**
     * 作成ステータスを非表示
     */
    hideCreationStatus() {
        this.issueCreationStatus.classList.add('hidden');
    }

    /**
     * 課題フォームをリセット
     */
    resetIssueForm() {
        this.issueSummary.value = '';
        this.issueTypeSelect.value = '';
        this.handleSummaryInput('');
        
        this.issueSummary.style.height = '36px';
        this.issueSummary.style.overflowY = 'hidden';
        
        this.updateIssueDescription();
        this.hideCreationStatus();
        this.hideSummaryError();
        this.hideIssueTypeError();
    }

    /**
     * 全体的な入力バリデーション
     * @param {string} context - バリデーションのコンテキスト ('apiKey', 'issue')
     * @returns {boolean} バリデーション結果
     */
    validateAllInputs(context) {
        let isValid = true;

        if (context === 'apiKey') {
            const apiKeyField = this.currentPanel === 'settings' && this.apiKeyChange.classList.contains('hidden') 
                ? this.apiKeyInput 
                : this.newApiKeyInput;
            const domainField = this.currentPanel === 'settings' && this.apiKeyChange.classList.contains('hidden') 
                ? this.domainInput 
                : this.newDomainInput;

            if (!this.validateApiKeyField(apiKeyField)) {
                isValid = false;
            }

            if (!this.validateDomainField(domainField)) {
                isValid = false;
            }

        } else if (context === 'issue') {
            if (!this.validateSummary(this.issueSummary.value)) {
                isValid = false;
            }

            if (!this.selectedProjectData) {
                isValid = false;
            }

            if (!this.issueTypeSelect.value) {
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * APIキーフィールドのバリデーション
     * @param {HTMLElement} field - APIキー入力フィールド
     * @returns {boolean} バリデーション結果
     */
    validateApiKeyField(field) {
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'APIキーは必須です');
            return false;
        }

        if (value.length < 10) {
            this.showFieldError(field, 'APIキーが短すぎます');
            return false;
        }

        if (value.length > 200) {
            this.showFieldError(field, 'APIキーが長すぎます');
            return false;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            this.showFieldError(field, 'APIキーに無効な文字が含まれています');
            return false;
        }

        this.hideFieldError(field);
        return true;
    }

    /**
     * ドメインフィールドのバリデーション
     * @param {HTMLElement} field - ドメイン入力フィールド
     * @returns {boolean} バリデーション結果
     */
    validateDomainField(field) {
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'ドメインを入力してください');
            return false;
        }

        const backlogDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.(jp|com)$/;
        if (!backlogDomainPattern.test(value)) {
            this.showFieldError(field, '有効なBacklogドメインを入力してください（例: mycompany.backlog.jp）');
            return false;
        }

        if (value.length > 100) {
            this.showFieldError(field, 'ドメイン名が長すぎます');
            return false;
        }

        this.hideFieldError(field);
        return true;
    }

    /**
     * フィールドエラーを表示
     * @param {HTMLElement} field - エラーが発生したフィールド
     * @param {string} message - エラーメッセージ
     */
    showFieldError(field, message) {
        field.style.borderColor = '#dc3545';
        field.style.backgroundColor = '#fff5f5';
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.color = '#dc3545';
            errorElement.style.fontSize = '12px';
            errorElement.style.marginTop = '4px';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    /**
     * フィールドエラーを非表示
     * @param {HTMLElement} field - エラーを非表示にするフィールド
     */
    hideFieldError(field) {
        field.style.borderColor = '';
        field.style.backgroundColor = '';
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    /**
     * リアルタイム入力チェックのセットアップ
     */
    setupRealtimeValidation() {
        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('input', (e) => {
                this.validateApiKeyField(e.target);
            });
            
            this.apiKeyInput.addEventListener('blur', (e) => {
                this.validateApiKeyField(e.target);
            });
        }

        if (this.newApiKeyInput) {
            this.newApiKeyInput.addEventListener('input', (e) => {
                this.validateApiKeyField(e.target);
            });
            
            this.newApiKeyInput.addEventListener('blur', (e) => {
                this.validateApiKeyField(e.target);
            });
        }

        if (this.domainInput) {
            this.domainInput.addEventListener('input', (e) => {
                this.validateDomainField(e.target);
            });
            
            this.domainInput.addEventListener('blur', (e) => {
                this.validateDomainField(e.target);
            });
        }

        if (this.newDomainInput) {
            this.newDomainInput.addEventListener('input', (e) => {
                this.validateDomainField(e.target);
            });
            
            this.newDomainInput.addEventListener('blur', (e) => {
                this.validateDomainField(e.target);
            });
        }
    }

    /**
     * テンプレートエディタを初期化
     * 要件2.1: Settings画面を開いた時、Template Editorに現在のテンプレートを表示
     * @returns {Promise<void>}
     */
    async initializeTemplateEditor() {
        try {
            console.log('テンプレートエディタを初期化します');
            
            // テンプレートを読み込んでUIに表示
            await this.loadTemplateToUI();
            
            console.log('テンプレートエディタの初期化が完了しました');
        } catch (error) {
            console.error('テンプレートエディタ初期化エラー:', error);
            this.showTemplateMessage('テンプレートの読み込みに失敗しました', 'error');
        }
    }

    /**
     * テンプレートを読み込んでUIに表示
     * 要件2.1: Settings画面を開いた時、Template Editorに現在のテンプレートを表示
     * @returns {Promise<void>}
     */
    async loadTemplateToUI() {
        try {
            console.log('テンプレートを読み込みます');
            
            // Service Workerからテンプレートを読み込む
            const response = await this.sendMessageToBackground('loadTemplate');
            
            if (response.success) {
                this.templateEditor.value = response.template;
                this.updateCharacterCounter(response.template);
                console.log('テンプレートをUIに表示しました');
            } else {
                throw new Error(response.error || 'テンプレートの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('テンプレート読み込みエラー:', error);
            // エラー時はデフォルトテンプレートを表示
            const defaultTemplate = `参照元:\n{{title}}\n{{url}}`;
            this.templateEditor.value = defaultTemplate;
            this.updateCharacterCounter(defaultTemplate);
            this.showTemplateMessage('テンプレートの読み込みに失敗しました。デフォルトテンプレートを使用します。', 'error');
        }
    }

    /**
     * テンプレートを保存
     * 要件2.3: 保存ボタンをクリックした時、テンプレートをStorage APIに永続化
     * 要件2.4: テンプレート保存成功時に成功メッセージを表示
     * 要件2.5: 保存失敗時にエラーメッセージを表示し、入力内容を保持
     * 要件5.3: 保存操作開始時にボタンを無効化
     * 要件5.4: 保存操作完了時にボタンを再度有効化
     * 要件5.5: メッセージは表示から3秒後に自動的に非表示
     * @returns {Promise<void>}
     */
    async saveTemplateFromUI() {
        try {
            console.log('テンプレートを保存します');
            
            const template = this.templateEditor.value;
            
            // 保存ボタンを無効化し、ローディング状態を表示
            this.saveTemplateBtn.disabled = true;
            this.saveTemplateBtn.textContent = '保存中...';
            
            // Service Workerに保存メッセージを送信
            const response = await this.sendMessageToBackground('saveTemplate', { template: template });
            
            if (response.success) {
                // 成功メッセージを表示し、3秒後に自動非表示
                this.showTemplateMessage('テンプレートを保存しました', 'success');
                console.log('テンプレートを保存しました');
            } else {
                // エラーメッセージを表示し、入力内容を保持
                throw new Error(response.error || 'テンプレートの保存に失敗しました');
            }
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            // エラーメッセージを表示し、入力内容を保持
            this.showTemplateMessage('テンプレートの保存に失敗しました。もう一度お試しください。', 'error');
        } finally {
            // 保存ボタンを再度有効化
            this.saveTemplateBtn.disabled = false;
            this.saveTemplateBtn.textContent = '保存';
        }
    }

    /**
     * テンプレートをデフォルトにリセット
     * 要件3.3: リセットボタンをクリックした時、デフォルトテンプレートに復元
     * 要件3.4: リセット時に確認メッセージを表示
     * 要件3.5: リセット完了後、Template Editorをデフォルトテンプレートに更新
     * @returns {Promise<void>}
     */
    async resetTemplateToDefault() {
        try {
            // 確認ダイアログを表示
            if (!confirm('テンプレートをデフォルトに戻しますか？')) {
                return;
            }
            
            console.log('テンプレートをリセットします');
            
            // リセットボタンを無効化
            this.resetTemplateBtn.disabled = true;
            this.resetTemplateBtn.textContent = 'リセット中...';
            
            // Service Workerにリセットメッセージを送信
            const response = await this.sendMessageToBackground('resetTemplate');
            
            if (response.success) {
                // デフォルトテンプレートをUIに表示
                this.templateEditor.value = response.template;
                this.updateCharacterCounter(response.template);
                
                // 確認メッセージを表示
                this.showTemplateMessage('テンプレートをデフォルトに戻しました', 'success');
                console.log('テンプレートをリセットしました');
            } else {
                throw new Error(response.error || 'テンプレートのリセットに失敗しました');
            }
        } catch (error) {
            console.error('テンプレートリセットエラー:', error);
            this.showTemplateMessage('テンプレートのリセットに失敗しました', 'error');
        } finally {
            // リセットボタンを再度有効化
            this.resetTemplateBtn.disabled = false;
            this.resetTemplateBtn.textContent = 'リセット';
        }
    }

    /**
     * 文字数カウンターをリアルタイム更新
     * 要件5.2: Template Editorへのテキスト入力時、文字数カウンターを更新
     * @param {string} text - カウント対象のテキスト
     */
    updateCharacterCounter(text) {
        const length = text.length;
        this.templateCharCounter.textContent = `${length}文字`;
    }

    /**
     * テンプレートメッセージを表示
     * 要件5.5: メッセージは表示から3秒後に自動的に非表示
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 'success' または 'error'
     */
    showTemplateMessage(message, type = 'success') {
        this.templateMessage.textContent = message;
        this.templateMessage.className = `template-message ${type}`;
        this.templateMessage.classList.remove('hidden');
        
        // 3秒後に自動非表示
        setTimeout(() => {
            this.hideTemplateMessage();
        }, 3000);
    }

    /**
     * テンプレートメッセージを非表示
     */
    hideTemplateMessage() {
        this.templateMessage.classList.add('hidden');
    }
}

// DOMが読み込まれたら初期化
if (typeof document !== 'undefined' && !window._sidePanelInitialized) {
    document.addEventListener('DOMContentLoaded', () => {
        window.sidePanelUI = new SidePanelUI();
    });
    window._sidePanelInitialized = true;
}
