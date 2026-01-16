# Requirements Document

## Introduction

本仕様は、Chrome拡張機能「AnyBacklog」に2つの新機能を追加するものです。1つ目は、拡張機能アイコンをクリックした際にサイドパネルの開閉をトグルする機能です。2つ目は、Settings画面に説明文のテンプレート編集・保存機能を追加し、利用者が自由にカスタマイズできるようにする機能です。

## Glossary

- **Extension_Icon**: Chrome拡張機能のツールバーに表示されるアイコン
- **Side_Panel**: Chromeブラウザの右側に表示される拡張機能のパネルUI
- **Service_Worker**: Chrome拡張機能のバックグラウンドで動作するスクリプト
- **Settings_Panel**: サイドパネル内の設定画面タブ
- **Description_Template**: 課題作成時の説明欄に自動挿入されるテキストのテンプレート
- **Template_Editor**: Settings画面に配置されるテンプレート編集用のテキストエリア
- **Storage_API**: Chrome拡張機能のデータ永続化API

## Requirements

### Requirement 1: アイコンクリックによるサイドパネルのトグル機能

**User Story:** As a user, I want to toggle the side panel by clicking the extension icon, so that I can quickly show or hide the panel without manual operations.

#### Acceptance Criteria

1. WHEN the user clicks the Extension_Icon and the Side_Panel is closed, THE System SHALL open the Side_Panel
2. WHEN the user clicks the Extension_Icon and the Side_Panel is open, THE System SHALL close the Side_Panel
3. WHEN the Side_Panel state changes, THE System SHALL persist the new state to Storage_API
4. WHEN the Service_Worker receives an icon click event, THE System SHALL query the current Side_Panel state before performing the toggle operation
5. IF the Side_Panel state query fails, THEN THE System SHALL default to opening the Side_Panel

### Requirement 2: 説明文テンプレートの編集・保存機能

**User Story:** As a user, I want to customize the description template in Settings, so that I can use my preferred format when creating issues.

#### Acceptance Criteria

1. WHEN the user navigates to the Settings_Panel, THE System SHALL display the Template_Editor with the current template
2. WHEN the user edits text in the Template_Editor, THE System SHALL enable real-time input without blocking
3. WHEN the user clicks the save button, THE System SHALL persist the template to Storage_API
4. WHEN the template is saved successfully, THE System SHALL display a success message
5. IF the template save operation fails, THEN THE System SHALL display an error message and retain the user's input
6. WHEN the user creates a new issue, THE System SHALL use the saved template for the description field
7. THE Template_Editor SHALL support placeholder variables for dynamic content insertion
8. WHEN the template contains placeholder variables, THE System SHALL replace them with actual values when creating an issue

### Requirement 3: テンプレートのデフォルト値とリセット機能

**User Story:** As a user, I want to reset the template to default, so that I can recover from mistakes or start fresh.

#### Acceptance Criteria

1. WHEN the extension is first installed, THE System SHALL initialize the template with a default value
2. THE default template SHALL include placeholders for page URL and page title
3. WHEN the user clicks the reset button, THE System SHALL restore the template to the default value
4. WHEN the template is reset, THE System SHALL display a confirmation message
5. WHEN the user confirms the reset operation, THE System SHALL update the Template_Editor with the default template

### Requirement 4: テンプレート変数の仕様

**User Story:** As a user, I want to use variables in my template, so that dynamic content is automatically inserted when creating issues.

#### Acceptance Criteria

1. THE System SHALL support the variable `{{url}}` for the current page URL
2. THE System SHALL support the variable `{{title}}` for the current page title
3. WHEN a template contains `{{url}}`, THE System SHALL replace it with the actual page URL
4. WHEN a template contains `{{title}}`, THE System SHALL replace it with the actual page title
5. WHEN a variable is not recognized, THE System SHALL leave it unchanged in the output

### Requirement 5: UI/UXの要件

**User Story:** As a user, I want clear visual feedback, so that I understand the system's state and my actions' results.

#### Acceptance Criteria

1. WHEN the Template_Editor is displayed, THE System SHALL show a character count indicator
2. WHEN the user types in the Template_Editor, THE System SHALL update the character count in real-time
3. WHEN the save button is clicked, THE System SHALL disable the button and show a loading state
4. WHEN the save operation completes, THE System SHALL re-enable the button
5. WHEN displaying success or error messages, THE System SHALL auto-hide them after 3 seconds
