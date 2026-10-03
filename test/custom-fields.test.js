/**
 * カスタム属性機能のテスト
 * プロジェクトのカスタム属性の読み込み・描画・値収集・必須検証を検証
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

const sampleFields = [
    { id: 101, typeId: 1, name: 'テキスト属性', required: true, applicableIssueTypes: [], items: [] },
    { id: 102, typeId: 2, name: '文章属性', required: false, applicableIssueTypes: [], items: [] },
    { id: 103, typeId: 3, name: '数値属性', required: false, applicableIssueTypes: [], items: [] },
    { id: 104, typeId: 4, name: '日付属性', required: false, applicableIssueTypes: [], items: [] },
    { id: 105, typeId: 5, name: '単一リスト属性', required: false, applicableIssueTypes: [], items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
    { id: 106, typeId: 6, name: '複数リスト属性', required: false, applicableIssueTypes: [], items: [{ id: 3, name: 'X' }, { id: 4, name: 'Y' }] },
    { id: 107, typeId: 7, name: 'チェックボックス属性', required: false, applicableIssueTypes: [], items: [{ id: 5, name: 'C1' }, { id: 6, name: 'C2' }] },
    { id: 108, typeId: 8, name: 'ラジオ属性', required: false, applicableIssueTypes: [], items: [{ id: 7, name: 'R1' }, { id: 8, name: 'R2' }] },
    { id: 109, typeId: 1, name: '種別限定属性', required: false, applicableIssueTypes: [11], items: [] }
];

describe('カスタム属性機能', () => {
    let sidePanelUI;
    let mockSendMessage;

    beforeEach(async () => {
        document.documentElement.innerHTML = html;

        mockSendMessage = jest.fn((message, callback) => {
            if (typeof callback === 'function') {
                callback({ success: true });
            }
        });
        global.chrome.runtime.sendMessage = mockSendMessage;
        global.chrome.tabs.query = jest.fn().mockResolvedValue([{
            url: 'https://example.com/test',
            title: 'Test Page'
        }]);

        const stateManagerScript = fs.readFileSync(path.resolve(__dirname, '../shared/state-manager.js'), 'utf8');
        eval(stateManagerScript);

        const sidepanelScript = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.js'), 'utf8');
        eval(sidepanelScript);

        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        sidePanelUI = window.sidePanelUI;
        await new Promise(resolve => setTimeout(resolve, 100));
        mockSendMessage.mockClear();
    });

    afterEach(() => {
        document.documentElement.innerHTML = '';
        jest.clearAllMocks();
    });

    test('カスタム属性取得のメッセージを送信し、フィールドが保持される', async () => {
        sidePanelUI.sendMessageToBackground = jest.fn().mockResolvedValue({
            success: true,
            customFields: sampleFields
        });

        await sidePanelUI.loadProjectCustomFields('123');

        expect(sidePanelUI.sendMessageToBackground).toHaveBeenCalledWith('getCustomFields', { projectId: '123' });
        expect(sidePanelUI.projectCustomFields).toHaveLength(sampleFields.length);
    });

    test('スペース選択時はspaceIdを含めて取得する', async () => {
        sidePanelUI.selectedSpaceId = 'space_abc';
        sidePanelUI.sendMessageToBackground = jest.fn().mockResolvedValue({
            success: true,
            customFields: []
        });

        await sidePanelUI.loadProjectCustomFields('123');

        expect(sidePanelUI.sendMessageToBackground).toHaveBeenCalledWith('getCustomFields', {
            projectId: '123',
            spaceId: 'space_abc'
        });
        sidePanelUI.selectedSpaceId = null;
    });

    test('各タイプの入力コントロールが描画される', () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.renderCustomFields();

        const container = sidePanelUI.customFieldsList;
        expect(sidePanelUI.customFieldsSection.classList.contains('hidden')).toBe(false);

        expect(container.querySelector('[data-field-id="101"] input[type="text"]')).not.toBeNull();
        expect(container.querySelector('[data-field-id="102"] textarea')).not.toBeNull();
        expect(container.querySelector('[data-field-id="103"] input[type="number"]')).not.toBeNull();
        expect(container.querySelector('[data-field-id="104"] input[type="date"]')).not.toBeNull();
        expect(container.querySelector('[data-field-id="105"] select')).not.toBeNull();
        expect(container.querySelector('[data-field-id="105"] select').options.length).toBe(3); // placeholder + 2件
        expect(container.querySelectorAll('[data-field-id="106"] input[type="checkbox"]').length).toBe(2);
        expect(container.querySelectorAll('[data-field-id="107"] input[type="checkbox"]').length).toBe(2);
        expect(container.querySelectorAll('[data-field-id="108"] input[type="radio"]').length).toBe(2);

        // 必須フィールドに必須マークが付く
        const requiredMark = container.querySelector('[data-field-id="101"] .required');
        expect(requiredMark).not.toBeNull();
    });

    test('フィールド名はtextContentで設定されXSSを防ぐ', () => {
        sidePanelUI.projectCustomFields = [
            { id: 201, typeId: 1, name: '<script>alert("xss")</script>', required: false, applicableIssueTypes: [], items: [] }
        ];
        sidePanelUI.renderCustomFields();

        const label = sidePanelUI.customFieldsList.querySelector('[data-field-id="201"] .form-label span');
        expect(label.textContent).toBe('<script>alert("xss")</script>');
        expect(sidePanelUI.customFieldsList.querySelector('script')).toBeNull();
    });

    test('課題種別に応じて適用対象のフィールドのみ表示される', () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.projectIssueTypes = [{ id: 11, name: 'タスク' }, { id: 12, name: 'バグ' }];
        sidePanelUI.issueTypeSelect.innerHTML = '<option value="11">タスク</option><option value="12">バグ</option>';

        // 種別11では種別限定属性が表示される
        sidePanelUI.issueTypeSelect.value = '11';
        sidePanelUI.renderCustomFields();
        expect(sidePanelUI.customFieldsList.querySelector('[data-field-id="109"]')).not.toBeNull();

        // 種別12では種別限定属性が非表示になる
        sidePanelUI.issueTypeSelect.value = '12';
        sidePanelUI.renderCustomFields();
        expect(sidePanelUI.customFieldsList.querySelector('[data-field-id="109"]')).toBeNull();
        expect(sidePanelUI.customFieldsList.querySelector('[data-field-id="101"]')).not.toBeNull();
    });

    test('カスタム属性がない場合はセクションが非表示になる', () => {
        sidePanelUI.projectCustomFields = [];
        sidePanelUI.renderCustomFields();
        expect(sidePanelUI.customFieldsSection.classList.contains('hidden')).toBe(true);
    });

    test('入力値がtypeIdに応じて収集される', () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.renderCustomFields();
        const container = sidePanelUI.customFieldsList;

        container.querySelector('[data-field-id="101"] input').value = 'テスト値';
        container.querySelector('[data-field-id="102"] textarea').value = '長文テキスト';
        container.querySelector('[data-field-id="103"] input').value = '42';
        container.querySelector('[data-field-id="104"] input').value = '2026-10-01';
        container.querySelector('[data-field-id="105"] select').value = '2';
        const checkboxes106 = container.querySelectorAll('[data-field-id="106"] input[type="checkbox"]');
        checkboxes106[0].checked = true;
        checkboxes106[1].checked = true;
        container.querySelectorAll('[data-field-id="107"] input[type="checkbox"]')[0].checked = true;
        container.querySelectorAll('[data-field-id="108"] input[type="radio"]')[1].checked = true;

        const values = sidePanelUI.collectCustomFieldValues();

        expect(values).toEqual(expect.arrayContaining([
            { id: 101, value: 'テスト値' },
            { id: 102, value: '長文テキスト' },
            { id: 103, value: '42' },
            { id: 104, value: '2026-10-01' },
            { id: 105, value: '2' },
            { id: 106, value: ['3', '4'] },
            { id: 107, value: ['5'] },
            { id: 108, value: '8' }
        ]));
        // 非表示の種別限定属性は収集されない（issueType未選択時はapplicableIssueTypes対象外）
        expect(values.find(v => v.id === 109)).toBeUndefined();
    });

    test('必須フィールド未入力時はバリデーションが失敗する', () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.renderCustomFields();

        // id=101が必須で未入力
        expect(sidePanelUI.validateCustomFields()).toBe(false);
        expect(sidePanelUI.customFieldsError.classList.contains('hidden')).toBe(false);

        // 入力後は成功
        sidePanelUI.customFieldsList.querySelector('[data-field-id="101"] input').value = '入力済み';
        expect(sidePanelUI.validateCustomFields()).toBe(true);
        expect(sidePanelUI.customFieldsError.classList.contains('hidden')).toBe(true);
    });

    test('課題作成時にcustomFieldsがメッセージに含まれる', async () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.selectedSpaceId = 'space_xyz';
        sidePanelUI.selectedProjectData = { id: 123, name: 'Test', projectKey: 'TEST' };
        sidePanelUI.issueSummary.value = 'テスト件名';
        sidePanelUI.issueDescription.value = 'テスト説明';
        sidePanelUI.issueTypeSelect.innerHTML = '<option value="11">タスク</option>';
        sidePanelUI.issueTypeSelect.value = '11';
        sidePanelUI.createIssueBtn.disabled = false;
        sidePanelUI.renderCustomFields();

        // 必須フィールドに入力
        sidePanelUI.customFieldsList.querySelector('[data-field-id="101"] input').value = '必須値';
        sidePanelUI.customFieldsList.querySelector('[data-field-id="109"] input').value = '種別限定値';

        sidePanelUI.sendMessageToBackground = jest.fn().mockResolvedValue({
            success: true,
            issue: { issueKey: 'TEST-1' }
        });
        sidePanelUI.spaces = [{ id: 'space_xyz', domain: 'example.backlog.jp' }];

        await sidePanelUI.handleCreateIssue();

        expect(sidePanelUI.sendMessageToBackground).toHaveBeenCalledWith('createIssueForSpace',
            expect.objectContaining({
                spaceId: 'space_xyz',
                projectId: 123,
                customFields: expect.arrayContaining([
                    { id: 101, value: '必須値' },
                    { id: 109, value: '種別限定値' }
                ])
            })
        );
    });

    test('クリア時にカスタム属性がリセットされる', () => {
        sidePanelUI.projectCustomFields = sampleFields;
        sidePanelUI.renderCustomFields();
        expect(sidePanelUI.customFieldsSection.classList.contains('hidden')).toBe(false);

        sidePanelUI.clearCustomFields();
        expect(sidePanelUI.projectCustomFields).toEqual([]);
        expect(sidePanelUI.customFieldsSection.classList.contains('hidden')).toBe(true);
    });
});
