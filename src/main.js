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
