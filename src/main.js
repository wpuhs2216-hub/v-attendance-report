import { loadMembers, saveMembers, addMember, removeMember, loadInputData, saveInputData, loadHidden, saveHidden } from './store.js';
import { CATEGORIES, generateReport } from './template.js';

// 状態
let assignments = {};  // { categoryKey: [名前, ...] }
let members = loadMembers();
let hiddenMembers = loadHidden();

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

// 初期化: 今日の日付をセット（ローカルタイムゾーン）
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
reportDate.value = todayStr;

// カテゴリ分類
const numberCategories = CATEGORIES.filter((c) => c.type === 'number');
const nameCategories = CATEGORIES.filter((c) => c.type === 'names');
nameCategories.forEach((c) => { assignments[c.key] = []; });

// === 表示対象メンバー（非表示除外） ===

function visibleMembers() {
  return members.filter((m) => !hiddenMembers.includes(m));
}

// === 人数入力セクション ===

function renderNumberInputs() {
  numberInputs.innerHTML = numberCategories.map((cat) => `
    <div class="number-row">
      <label>${cat.label}</label>
      <div class="number-controls">
        <button class="btn-pm" data-key="${cat.key}" data-dir="-1">−</button>
        <input type="number" id="num-${cat.key}" min="0" value="0" inputmode="numeric" />
        <button class="btn-pm" data-key="${cat.key}" data-dir="1">＋</button>
      </div>
    </div>
  `).join('');

  numberInputs.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updatePreview);
  });

  numberInputs.querySelectorAll('.btn-pm').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(`num-${btn.dataset.key}`);
      const val = Math.max(0, (parseInt(el.value, 10) || 0) + parseInt(btn.dataset.dir, 10));
      el.value = val;
      updatePreview();
    });
  });
}

// === 名前プール（未割り当て表示のみ、タップでカテゴリ選択） ===

// 排他カテゴリ（multi以外）に割り当て済みの名前一覧
function getExclusiveAssigned() {
  const names = [];
  for (const cat of nameCategories) {
    if (cat.multi) continue;
    names.push(...(assignments[cat.key] || []));
  }
  return names;
}

function renderMemberPool() {
  const exclusiveAssigned = getExclusiveAssigned();
  const unassigned = visibleMembers().filter((m) => !exclusiveAssigned.includes(m));

  memberPool.innerHTML = unassigned.length > 0
    ? unassigned.map((name) => `<div class="member-chip" data-name="${name}">${name}</div>`).join('')
    : '<span style="color:#666;font-size:12px">全員振り分け済み</span>';

  memberPool.querySelectorAll('.member-chip').forEach((chip) => {
    chip.addEventListener('click', () => openCatSelect(chip.dataset.name));
  });
}

// === カテゴリ選択ポップアップ（プールからの振り分け用） ===

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
      renderAll();
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

// === チェックボックスピッカー（カテゴリタップで開く） ===

function openCheckboxPicker(catKey) {
  const cat = nameCategories.find((c) => c.key === catKey);
  const currentNames = assignments[catKey];

  // 全メンバーを表示（他カテゴリ割り当て済みも含む）
  const available = visibleMembers();

  catSelectName.textContent = cat.label;

  if (available.length === 0) {
    catSelectButtons.innerHTML = '<div style="color:#666;font-size:13px;text-align:center;padding:12px">選択可能なメンバーがいません</div>';
  } else {
    // 他の排他カテゴリに割り当て済みか調べる
    catSelectButtons.innerHTML = available.map((name) => {
      const checked = currentNames.includes(name) ? 'checked' : '';
      const otherCat = findExclusiveCat(name, catKey);
      const hint = otherCat ? `<span class="cb-hint">${otherCat.label}</span>` : '';
      return `
        <label class="cb-row">
          <input type="checkbox" data-name="${name}" ${checked} />
          <span>${name}</span>${hint}
        </label>
      `;
    }).join('') + '<button class="cb-done-btn" id="cb-done">完了</button>';
  }

  // チェック状態の変更をリアルタイム反映
  catSelectButtons.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const name = cb.dataset.name;
      if (cb.checked) {
        // 他の排他カテゴリから削除（multiカテゴリは除く）
        if (!cat.multi) {
          for (const otherCat of nameCategories) {
            if (otherCat.key === catKey || otherCat.multi) continue;
            assignments[otherCat.key] = assignments[otherCat.key].filter((n) => n !== name);
          }
        }
        if (!assignments[catKey].includes(name)) {
          assignments[catKey].push(name);
        }
      } else {
        assignments[catKey] = assignments[catKey].filter((n) => n !== name);
      }
      renderMemberPool();
      renderAssignCategories();
      updatePreview();
    });
  });

  const doneBtn = document.getElementById('cb-done');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => closeCatSelect());
  }

  catSelect.classList.add('active');
}

// 指定メンバーが他の排他カテゴリに割り当て済みならそのカテゴリを返す
function findExclusiveCat(name, excludeKey) {
  for (const cat of nameCategories) {
    if (cat.key === excludeKey || cat.multi) continue;
    if (assignments[cat.key].includes(name)) return cat;
  }
  return null;
}

// === カテゴリ別振り分け表示 ===

function renderAssignCategories() {
  assignCategories.innerHTML = nameCategories.map((cat) => {
    const names = assignments[cat.key];
    const chips = names.map((n) => `<span class="assigned-chip" data-cat="${cat.key}" data-name="${n}">${n}</span>`).join('');
    return `
      <div class="assign-cat" data-key="${cat.key}">
        <div class="assign-cat-header">
          <span>${cat.label}</span>
          <span class="count">${names.length}人</span>
        </div>
        <div class="assign-cat-names">${chips}</div>
      </div>
    `;
  }).join('');

  // カテゴリ行タップでチェックボックスピッカーを開く
  assignCategories.querySelectorAll('.assign-cat-header').forEach((header) => {
    header.addEventListener('click', () => {
      const catKey = header.closest('.assign-cat').dataset.key;
      openCheckboxPicker(catKey);
    });
  });

  // 割り当て済みチップのタップで解除
  assignCategories.querySelectorAll('.assigned-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const cat = chip.dataset.cat;
      const name = chip.dataset.name;
      assignments[cat] = assignments[cat].filter((n) => n !== name);
      renderAll();
    });
  });
}

// === まとめて再描画 ===

function renderAll() {
  renderMemberPool();
  renderAssignCategories();
  updatePreview();
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

  // 入力データを保存
  saveInputData({ date: reportDate.value, numbers: data, assignments });
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
  renderAll();
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('active');
    renderAll();
  }
});

function renderMemberManageList() {
  memberManageList.innerHTML = members.map((name) => {
    const isHidden = hiddenMembers.includes(name);
    return `
      <div class="member-manage-row ${isHidden ? 'hidden-member' : ''}">
        <span>${name}</span>
        <div class="member-manage-actions">
          <button class="btn-toggle-vis" data-name="${name}">${isHidden ? '表示' : '非表示'}</button>
          <button class="btn-remove" data-name="${name}">削除</button>
        </div>
      </div>
    `;
  }).join('');

  memberManageList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (!confirm(`「${name}」を削除しますか？`)) return;
      members = removeMember(name);
      hiddenMembers = hiddenMembers.filter((n) => n !== name);
      saveHidden(hiddenMembers);
      for (const key of Object.keys(assignments)) {
        assignments[key] = assignments[key].filter((n) => n !== name);
      }
      renderMemberManageList();
    });
  });

  memberManageList.querySelectorAll('.btn-toggle-vis').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (hiddenMembers.includes(name)) {
        hiddenMembers = hiddenMembers.filter((n) => n !== name);
      } else {
        hiddenMembers.push(name);
        for (const key of Object.keys(assignments)) {
          assignments[key] = assignments[key].filter((n) => n !== name);
        }
      }
      saveHidden(hiddenMembers);
      renderMemberManageList();
    });
  });
}

function doAddMember() {
  const name = newMemberName.value.trim();
  if (!name) return;
  members = addMember(name);
  newMemberName.value = '';
  renderMemberManageList();
}

btnAddMember.addEventListener('click', doAddMember);
newMemberName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doAddMember();
});

// === 初期描画 ===

renderNumberInputs();

// 保存データがあれば復元
const saved = loadInputData();
if (saved) {
  if (saved.numbers) {
    numberCategories.forEach((cat) => {
      const el = document.getElementById(`num-${cat.key}`);
      if (el && saved.numbers[cat.key] != null) el.value = saved.numbers[cat.key];
    });
  }
  if (saved.assignments) {
    for (const key of Object.keys(assignments)) {
      if (saved.assignments[key]) {
        assignments[key] = saved.assignments[key].filter((n) => members.includes(n) && !hiddenMembers.includes(n));
      }
    }
  }
}

renderAll();
