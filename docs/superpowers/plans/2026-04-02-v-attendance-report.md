# V出勤報告ジェネレーター 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホストクラブ「V」の日次出勤報告テンプレートを名前タップで生成・コピーできるWebアプリを構築する

**Architecture:** Vanilla JS + Vite の1画面SPA。store.js でlocalStorage管理、template.js でテンプレート文字列生成、main.js でUI制御。名前一覧をタップしてカテゴリに振り分け、リアルタイムでテンプレートプレビューを更新する。

**Tech Stack:** Vanilla JS, Vite, localStorage

---

### Task 1: プロジェクト初期化

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/style.css` (空ファイル)
- Create: `src/main.js` (空ファイル)
- Create: `src/store.js` (空ファイル)
- Create: `src/template.js` (空ファイル)

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "v-attendance-report",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: vite.config.js を作成**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
});
```

- [ ] **Step 3: index.html を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>V出勤報告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <header>
    <h1>V出勤報告</h1>
  </header>
  <main id="app"></main>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: src/ 配下に空ファイルを作成**

`src/style.css`, `src/main.js`, `src/store.js`, `src/template.js` を空ファイルとして作成。

- [ ] **Step 5: Vite をインストール**

```bash
cd C:/Users/wpuhs/v-attendance-report && npm install vite --save-dev
```

- [ ] **Step 6: 開発サーバーの起動確認**

```bash
cd C:/Users/wpuhs/v-attendance-report && npx vite --host
```

ブラウザで `http://localhost:5173` にアクセスし、「V出勤報告」が表示されることを確認。確認後 Ctrl+C で停止。

- [ ] **Step 7: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add package.json package-lock.json vite.config.js index.html src/
git commit -m "feat: プロジェクト初期化（Vite + 空ファイル構成）"
```

---

### Task 2: store.js — localStorage CRUD

**Files:**
- Create: `src/store.js`

- [ ] **Step 1: store.js を実装**

```js
const MEMBERS_KEY = 'v-report-members';

const DEFAULT_MEMBERS = [
  '祐也', '迅', 'ちんすこう', 'クロム', '夏目',
  '雅', '寿里', 'はると', 'スバル', '琥珀', '狼恋',
];

export function loadMembers() {
  const raw = localStorage.getItem(MEMBERS_KEY);
  if (!raw) {
    saveMembers(DEFAULT_MEMBERS);
    return [...DEFAULT_MEMBERS];
  }
  return JSON.parse(raw);
}

export function saveMembers(members) {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export function addMember(name) {
  const members = loadMembers();
  if (members.includes(name)) return members;
  members.push(name);
  saveMembers(members);
  return members;
}

export function removeMember(name) {
  const members = loadMembers().filter((m) => m !== name);
  saveMembers(members);
  return members;
}
```

- [ ] **Step 2: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add src/store.js
git commit -m "feat: store.js — メンバーの永続化CRUD"
```

---

### Task 3: template.js — テンプレート生成

**Files:**
- Create: `src/template.js`

- [ ] **Step 1: template.js を実装**

```js
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// カテゴリ定義
// type: 'number' = 人数のみ入力, 'names' = 名前選択
// inHeadcount: true = 在籍人数に含める
export const CATEGORIES = [
  { key: 'open',       label: 'オープンメンバー', type: 'number', inHeadcount: true },
  { key: 'slide',      label: 'スライド',         type: 'number', inHeadcount: true },
  { key: 'douhan',     label: '同伴',             type: 'names',  inHeadcount: true },
  { key: 'taiken',     label: '体験者',           type: 'number', inHeadcount: false },
  { key: 'shift',      label: 'シフト出勤者',     type: 'names',  inHeadcount: false },
  { key: 'newEntry',   label: '新規入店者',       type: 'names',  inHeadcount: false },
  { key: 'temp',       label: '仮入店者',         type: 'number', inHeadcount: false },
  { key: 'late',       label: '遲刻',             type: 'names',  inHeadcount: true },
  { key: 'absent',     label: '欠勤',             type: 'names',  inHeadcount: true },
  { key: 'shiftAbsent',label: 'シフト欠',         type: 'names',  inHeadcount: true },
  { key: 'training',   label: '研修',             type: 'names',  inHeadcount: true },
  { key: 'unknown',    label: '不明',             type: 'names',  inHeadcount: true },
  { key: 'dayoff',     label: '公休',             type: 'names',  inHeadcount: true },
  { key: 'closed',     label: '休業',             type: 'names',  inHeadcount: true },
];

export function generateReport(date, data) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];

  const lines = [`V出勤報告 ${month}月${day}日（${weekday}）`];

  for (const cat of CATEGORIES) {
    const count = cat.type === 'number' ? (data[cat.key] || 0) : (data[cat.key] || []).length;
    const names = cat.type === 'names' ? (data[cat.key] || []) : [];
    const nameStr = names.length > 0 ? '　' + names.join('　') : '';

    // 同伴の後と体験者の後に空行を入れる（元テンプレート準拠）
    lines.push(`${cat.label}　${count}人${nameStr}`);
    if (cat.key === 'douhan' || cat.key === 'taiken') {
      lines.push('');
    }
  }

  // 在籍人数
  let headcount = 0;
  for (const cat of CATEGORIES) {
    if (!cat.inHeadcount) continue;
    headcount += cat.type === 'number' ? (data[cat.key] || 0) : (data[cat.key] || []).length;
  }

  lines.push('');
  lines.push(`在籍人数 ${headcount}名`);
  lines.push('');
  lines.push('以上宜しくお願い致します。');

  return lines.join('\n');
}
```

- [ ] **Step 2: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add src/template.js
git commit -m "feat: template.js — テンプレート生成ロジック"
```

---

### Task 4: index.html — 画面レイアウト

**Files:**
- Modify: `index.html`

- [ ] **Step 1: index.html の <main> 内にUI構造を追加**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>V出勤報告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <header>
    <h1>V出勤報告</h1>
    <button class="btn-settings" id="btn-settings">⚙</button>
  </header>

  <main>
    <!-- 日付 -->
    <section class="section">
      <input type="date" id="report-date" />
    </section>

    <!-- 人数のみ入力 -->
    <section class="section">
      <h2>人数入力</h2>
      <div class="number-inputs" id="number-inputs"></div>
    </section>

    <!-- 名前振り分け -->
    <section class="section">
      <h2>名前振り分け</h2>
      <div class="member-pool" id="member-pool"></div>
      <div class="assign-categories" id="assign-categories"></div>
    </section>

    <!-- プレビュー & コピー -->
    <section class="section">
      <h2>出力プレビュー</h2>
      <pre class="preview" id="preview"></pre>
      <button class="btn-copy" id="btn-copy">コピー</button>
    </section>
  </main>

  <!-- 名前管理モーダル -->
  <div class="modal-overlay" id="settings-modal">
    <div class="modal">
      <h3>メンバー管理</h3>
      <div class="member-add">
        <input type="text" id="new-member-name" placeholder="名前を入力" />
        <button class="btn-add" id="btn-add-member">追加</button>
      </div>
      <div class="member-list" id="member-manage-list"></div>
      <button class="btn-close" id="btn-close-settings">閉じる</button>
    </div>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add index.html
git commit -m "feat: index.html — 画面レイアウト構造"
```

---

### Task 5: style.css — スタイリング

**Files:**
- Create: `src/style.css`

- [ ] **Step 1: style.css を実装**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
  min-height: 100dvh;
  padding-bottom: 40px;
}

header {
  background: #1a1a2e;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
}

header h1 {
  font-size: 18px;
  color: #d4af37;
  letter-spacing: 2px;
}

.btn-settings {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #aaa;
  font-size: 20px;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
}

.section {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.section h2 {
  font-size: 14px;
  color: #d4af37;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

/* 日付 */
input[type="date"] {
  width: 100%;
  padding: 10px 12px;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #fff;
  font-size: 16px;
  font-family: inherit;
}

input[type="date"]:focus {
  outline: none;
  border-color: rgba(212, 175, 55, 0.5);
}

/* 人数入力 */
.number-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.number-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a2e;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.number-row label {
  font-size: 14px;
}

.number-row input[type="number"] {
  width: 70px;
  padding: 6px 8px;
  background: #0d0d1a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: #fff;
  font-size: 16px;
  text-align: center;
  font-family: inherit;
}

.number-row input[type="number"]:focus {
  outline: none;
  border-color: rgba(212, 175, 55, 0.5);
}

/* 名前プール（未割り当て） */
.member-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 40px;
  padding: 10px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.member-chip {
  padding: 6px 14px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: #d4af37;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.member-chip:active {
  background: rgba(212, 175, 55, 0.3);
  transform: scale(0.95);
}

/* カテゴリ振り分けエリア */
.assign-categories {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assign-cat {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
}

.assign-cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.assign-cat-header span {
  font-size: 13px;
  color: #aaa;
}

.assign-cat-header .count {
  font-size: 13px;
  color: #d4af37;
  font-weight: 700;
}

.assign-cat-names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 8px;
}

.assigned-chip {
  padding: 4px 12px;
  background: rgba(100, 200, 100, 0.15);
  border: 1px solid rgba(100, 200, 100, 0.3);
  border-radius: 16px;
  font-size: 12px;
  color: #8f8;
  cursor: pointer;
  user-select: none;
}

.assigned-chip:active {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

/* カテゴリ選択ポップアップ */
.cat-select-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  align-items: center;
  justify-content: center;
}

.cat-select-overlay.active {
  display: flex;
}

.cat-select-list {
  background: #1a1a2e;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 16px;
  width: 280px;
  max-height: 80vh;
  overflow-y: auto;
}

.cat-select-list h3 {
  font-size: 14px;
  color: #d4af37;
  margin-bottom: 12px;
  text-align: center;
}

.cat-select-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.cat-select-btn:active {
  background: rgba(212, 175, 55, 0.2);
  border-color: #d4af37;
}

/* プレビュー */
.preview {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.btn-copy {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #d4af37, #b8941e);
  color: #0a0a0a;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 2px;
  transition: opacity 0.2s;
}

.btn-copy:active {
  opacity: 0.8;
}

.btn-copy.copied {
  background: #28a745;
  color: #fff;
}

/* 設定モーダル */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.8);
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.modal-overlay.active {
  display: flex;
}

.modal {
  background: #1a1a2e;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  margin: auto 0;
}

.modal h3 {
  font-size: 16px;
  color: #d4af37;
  margin-bottom: 16px;
}

.member-add {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.member-add input {
  flex: 1;
  padding: 10px 12px;
  background: #0d0d1a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
}

.member-add input:focus {
  outline: none;
  border-color: rgba(212, 175, 55, 0.5);
}

.btn-add {
  padding: 10px 16px;
  background: rgba(212, 175, 55, 0.15);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.member-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
}

.member-manage-row span {
  font-size: 14px;
}

.btn-remove {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.btn-close {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}
```

- [ ] **Step 2: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add src/style.css
git commit -m "feat: style.css — ダークテーマUI"
```

---

### Task 6: main.js — UI制御

**Files:**
- Create: `src/main.js`
- Modify: `index.html` (カテゴリ選択ポップアップ追加)

- [ ] **Step 1: index.html に カテゴリ選択ポップアップを追加（</main> の直後）**

`</main>` の直後、設定モーダルの前に追加:

```html
  <!-- カテゴリ選択ポップアップ -->
  <div class="cat-select-overlay" id="cat-select">
    <div class="cat-select-list">
      <h3 id="cat-select-name"></h3>
      <div id="cat-select-buttons"></div>
    </div>
  </div>
```

- [ ] **Step 2: main.js を実装**

```js
import { loadMembers, saveMembers, addMember, removeMember } from './store.js';
import { CATEGORIES, generateReport } from './template.js';

// 状態
let assignments = {};  // { categoryKey: [名前, ...] }
let members = loadMembers();

// DOM要素
const reportDate = document.getElementById('report-date');
const numberInputs = document.getElementById('number-inputs');
const memberPool = document.getElementById('member-pool');
const assignCategories = document.getElementById('assign-categories');
const preview = document.getElementById('preview');
const btnCopy = document.getElementById('btn-copy');
const catSelect = document.getElementById('cat-select');
const catSelectName = document.getElementById('cat-select-name');
const catSelectButtons = document.getElementById('cat-select-buttons');

// 設定モーダル
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const newMemberName = document.getElementById('new-member-name');
const btnAddMember = document.getElementById('btn-add-member');
const memberManageList = document.getElementById('member-manage-list');
const btnCloseSettings = document.getElementById('btn-close-settings');

// 初期化: 今日の日付をセット
const today = new Date();
reportDate.value = today.toISOString().slice(0, 10);

// カテゴリ初期化
const numberCategories = CATEGORIES.filter((c) => c.type === 'number');
const nameCategories = CATEGORIES.filter((c) => c.type === 'names');
nameCategories.forEach((c) => { assignments[c.key] = []; });

// === 人数入力セクション ===

function renderNumberInputs() {
  numberInputs.innerHTML = numberCategories.map((cat) => `
    <div class="number-row">
      <label>${cat.label}</label>
      <input type="number" id="num-${cat.key}" min="0" value="0" inputmode="numeric" />
    </div>
  `).join('');

  numberInputs.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updatePreview);
  });
}

// === 名前プール ===

function getAssignedNames() {
  const all = [];
  for (const names of Object.values(assignments)) {
    all.push(...names);
  }
  return all;
}

function renderMemberPool() {
  const assigned = getAssignedNames();
  const unassigned = members.filter((m) => !assigned.includes(m));

  memberPool.innerHTML = unassigned.length > 0
    ? unassigned.map((name) => `<div class="member-chip" data-name="${name}">${name}</div>`).join('')
    : '<span style="color:#666;font-size:12px">全員振り分け済み</span>';

  memberPool.querySelectorAll('.member-chip').forEach((chip) => {
    chip.addEventListener('click', () => openCatSelect(chip.dataset.name));
  });
}

// === カテゴリ選択ポップアップ ===

let selectingName = '';

function openCatSelect(name) {
  selectingName = name;
  catSelectName.textContent = `「${name}」の振り分け先`;
  catSelectButtons.innerHTML = nameCategories.map((cat) => `
    <button class="cat-select-btn" data-key="${cat.key}">${cat.label}</button>
  `).join('');

  catSelectButtons.querySelectorAll('.cat-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      assignments[btn.dataset.key].push(selectingName);
      closeCatSelect();
      renderMemberPool();
      renderAssignCategories();
      updatePreview();
    });
  });

  catSelect.classList.add('active');
}

function closeCatSelect() {
  catSelect.classList.remove('active');
  selectingName = '';
}

catSelect.addEventListener('click', (e) => {
  if (e.target === catSelect) closeCatSelect();
});

// === カテゴリ別振り分け表示 ===

function renderAssignCategories() {
  assignCategories.innerHTML = nameCategories.map((cat) => {
    const names = assignments[cat.key];
    const chips = names.map((n) => `<span class="assigned-chip" data-cat="${cat.key}" data-name="${n}">${n}</span>`).join('');
    return `
      <div class="assign-cat">
        <div class="assign-cat-header">
          <span>${cat.label}</span>
          <span class="count">${names.length}人</span>
        </div>
        <div class="assign-cat-names">${chips}</div>
      </div>
    `;
  }).join('');

  // 割り当て解除
  assignCategories.querySelectorAll('.assigned-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      const name = chip.dataset.name;
      assignments[cat] = assignments[cat].filter((n) => n !== name);
      renderMemberPool();
      renderAssignCategories();
      updatePreview();
    });
  });
}

// === プレビュー更新 ===

function updatePreview() {
  const data = {};

  // 人数入力
  numberCategories.forEach((cat) => {
    const el = document.getElementById(`num-${cat.key}`);
    data[cat.key] = parseInt(el.value, 10) || 0;
  });

  // 名前振り分け
  for (const [key, names] of Object.entries(assignments)) {
    data[key] = [...names];
  }

  preview.textContent = generateReport(reportDate.value, data);
}

// === コピー ===

btnCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preview.textContent);
    btnCopy.textContent = 'コピーしました！';
    btnCopy.classList.add('copied');
    setTimeout(() => {
      btnCopy.textContent = 'コピー';
      btnCopy.classList.remove('copied');
    }, 2000);
  } catch {
    // フォールバック
    const textarea = document.createElement('textarea');
    textarea.value = preview.textContent;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btnCopy.textContent = 'コピーしました！';
    btnCopy.classList.add('copied');
    setTimeout(() => {
      btnCopy.textContent = 'コピー';
      btnCopy.classList.remove('copied');
    }, 2000);
  }
});

// 日付変更でプレビュー更新
reportDate.addEventListener('change', updatePreview);

// === 設定モーダル ===

btnSettings.addEventListener('click', () => {
  renderMemberManageList();
  settingsModal.classList.add('active');
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.remove('active');
});

function renderMemberManageList() {
  memberManageList.innerHTML = members.map((name) => `
    <div class="member-manage-row">
      <span>${name}</span>
      <button class="btn-remove" data-name="${name}">削除</button>
    </div>
  `).join('');

  memberManageList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (!confirm(`「${name}」を削除しますか？`)) return;
      members = removeMember(name);
      // 振り分けからも削除
      for (const key of Object.keys(assignments)) {
        assignments[key] = assignments[key].filter((n) => n !== name);
      }
      renderMemberManageList();
      renderMemberPool();
      renderAssignCategories();
      updatePreview();
    });
  });
}

function doAddMember() {
  const name = newMemberName.value.trim();
  if (!name) return;
  members = addMember(name);
  newMemberName.value = '';
  renderMemberManageList();
  renderMemberPool();
}

btnAddMember.addEventListener('click', doAddMember);
newMemberName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doAddMember();
});

// === 初期描画 ===

renderNumberInputs();
renderMemberPool();
renderAssignCategories();
updatePreview();
```

- [ ] **Step 3: コミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add src/main.js index.html
git commit -m "feat: main.js — UI制御・振り分け・プレビュー・コピー機能"
```

---

### Task 7: 動作確認 & 最終調整

- [ ] **Step 1: 開発サーバーで動作確認**

```bash
cd C:/Users/wpuhs/v-attendance-report && npx vite --host
```

確認項目:
1. 日付が今日に自動セットされている
2. オープンメンバー等の人数入力ができる
3. 名前チップをタップ → カテゴリ選択 → 振り分けされる
4. 振り分け済みチップをタップ → 解除される
5. プレビューがリアルタイム更新される
6. コピーボタンでクリップボードにコピーできる
7. 在籍人数が正しく計算される
8. ⚙ → メンバー追加・削除が動作する
9. ページリロード後もメンバーリストが保持される

- [ ] **Step 2: 問題があれば修正してコミット**

```bash
cd C:/Users/wpuhs/v-attendance-report
git add -A
git commit -m "fix: 動作確認で見つかった問題を修正"
```
