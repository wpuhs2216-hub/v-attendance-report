import { loadMembers, saveMembers, addMember, removeMember, loadInputData, saveInputData, loadHidden, saveHidden, loadRoles, setRole, loadDefaultCats, setDefaultCat, loadHideStaff, saveHideStaff, exportBackup, importBackup } from './store.js';
import { CATEGORIES, generateReport } from './template.js';

// 状態
let assignments = {};  // { categoryKey: [名前, ...] }
let members = loadMembers();
let hiddenMembers = loadHidden();
let roles = loadRoles();
let defaultCats = loadDefaultCats();
let hideStaff = loadHideStaff();

function getRole(name) {
  return roles[name] === 'staff' ? 'staff' : 'player';
}

function getDefaultCatKey(name) {
  return defaultCats[name] === 'slide' ? 'slide' : 'open';
}

// DOM要素
const reportDate = document.getElementById('report-date');
const numberInputs = document.getElementById('number-inputs');
const assignCategories = document.getElementById('assign-categories');
const preview = document.getElementById('preview');
const btnCopy = document.getElementById('btn-copy');
const btnShare = document.getElementById('btn-share');
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
const btnBackup = document.getElementById('btn-backup');
const btnRestore = document.getElementById('btn-restore');
const restoreFile = document.getElementById('restore-file');
const hideStaffToggle = document.getElementById('hide-staff-toggle');

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

// === デフォルトカテゴリへの正規化 ===
// どの排他カテゴリ（multi以外）にも属さない可視メンバーをデフォルト（通常 open / 一部 slide）へ追加
function ensureInDefault(name) {
  if (!visibleMembers().includes(name)) return;
  for (const cat of nameCategories) {
    if (cat.multi) continue;
    if (assignments[cat.key].includes(name)) return;
  }
  const defaultKey = getDefaultCatKey(name);
  if (!assignments[defaultKey].includes(name)) {
    assignments[defaultKey].push(name);
  }
}

function normalizeAllDefault() {
  for (const name of visibleMembers()) {
    ensureInDefault(name);
  }
  // 非表示・削除済みメンバーは全カテゴリから除外
  for (const cat of nameCategories) {
    assignments[cat.key] = assignments[cat.key].filter((n) => visibleMembers().includes(n));
  }
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

// === カテゴリ選択ポップアップの開閉 ===

function closeCatSelect() {
  catSelect.classList.remove('active');
}

catSelect.addEventListener('click', (e) => {
  if (e.target === catSelect) closeCatSelect();
});

// === デフォルトカテゴリ（open/slide）間の移動禁止判定 ===
const DEFAULT_PAIR = new Set(['open', 'slide']);
function isDefaultPairMove(fromKey, toKey) {
  return DEFAULT_PAIR.has(fromKey) && DEFAULT_PAIR.has(toKey);
}

// === 移動ダイアログ（チップタップで開く） ===

function openMoveDialog(name, fromCatKey) {
  catSelectName.textContent = `「${name}」を移動`;
  const fromIsDefault = DEFAULT_PAIR.has(fromCatKey);
  const targetCats = nameCategories.filter((c) => {
    if (c.key === fromCatKey) return false;
    // open/slide間の移動は設定経由のみ
    if (fromIsDefault && DEFAULT_PAIR.has(c.key)) return false;
    return true;
  });
  catSelectButtons.innerHTML = targetCats.map((cat) => {
    const tag = cat.multi ? '＋' : '→';
    return `<button class="cat-select-btn" data-key="${cat.key}">${tag} ${cat.label}</button>`;
  }).join('');
  catSelectButtons.querySelectorAll('.cat-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      moveToCategory(name, fromCatKey, btn.dataset.key);
      closeCatSelect();
      renderAll();
    });
  });
  catSelect.classList.add('active');
}

// === カテゴリ間移動 ===
// fromCatKey が null なら新規追加、from→to でカテゴリ移動
function moveToCategory(name, fromCatKey, toCatKey) {
  if (isDefaultPairMove(fromCatKey, toCatKey)) return;
  const toCat = nameCategories.find((c) => c.key === toCatKey);
  if (!toCat) return;
  if (fromCatKey && fromCatKey !== toCatKey && assignments[fromCatKey]) {
    assignments[fromCatKey] = assignments[fromCatKey].filter((n) => n !== name);
  }
  if (!toCat.multi) {
    for (const otherCat of nameCategories) {
      if (otherCat.key === toCatKey || otherCat.multi) continue;
      assignments[otherCat.key] = assignments[otherCat.key].filter((n) => n !== name);
    }
  }
  if (!assignments[toCatKey].includes(name)) {
    assignments[toCatKey].push(name);
  }
  ensureInDefault(name);
}

// === チェックボックスピッカー（カテゴリタップで開く） ===

function openCheckboxPicker(catKey) {
  const cat = nameCategories.find((c) => c.key === catKey);
  const currentNames = assignments[catKey];

  // 同伴・スライドは運営スタッフを選択肢から除外
  const baseAvailable = visibleMembers();
  const playerOnlyCats = new Set(['douhan', 'slide']);
  const available = playerOnlyCats.has(catKey)
    ? baseAvailable.filter((n) => getRole(n) !== 'staff')
    : baseAvailable;
  // プレイヤーを先、運営を後でグループ化
  const sortedAvailable = sortByRole(available);

  catSelectName.textContent = cat.label;

  if (sortedAvailable.length === 0) {
    catSelectButtons.innerHTML = '<div style="color:#666;font-size:13px;text-align:center;padding:12px">選択可能なメンバーがいません</div>';
  } else {
    catSelectButtons.innerHTML = sortedAvailable.map((name) => {
      const checked = currentNames.includes(name) ? 'checked' : '';
      const otherCat = findExclusiveCat(name, catKey);
      const hint = otherCat ? `<span class="cb-hint">${otherCat.label}</span>` : '';
      const role = getRole(name);
      return `
        <label class="cb-row" data-role="${role}">
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
        ensureInDefault(name);
      }
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
// オープンメンバーはデフォルト扱いなのでヒントから除外
function findExclusiveCat(name, excludeKey) {
  for (const cat of nameCategories) {
    if (cat.key === excludeKey || cat.multi || cat.key === 'open') continue;
    if (assignments[cat.key].includes(name)) return cat;
  }
  return null;
}

// プレイヤー → 運営 の順でソート（メンバー配列の順序を保つ）
function sortByRole(names) {
  const players = names.filter((n) => getRole(n) !== 'staff');
  const staffs = names.filter((n) => getRole(n) === 'staff');
  return [...players, ...staffs];
}

// === カテゴリ別振り分け表示 ===

function renderAssignCategories() {
  assignCategories.innerHTML = nameCategories.map((cat) => {
    const names = assignments[cat.key];
    const filteredNames = hideStaff ? names.filter((n) => getRole(n) !== 'staff') : names;
    // メンバー配列の順序を維持しつつプレイヤー→運営でグループ化
    const memberOrder = new Map(members.map((m, i) => [m, i]));
    const sortedNames = [...filteredNames].sort((a, b) => {
      const ra = getRole(a) === 'staff' ? 1 : 0;
      const rb = getRole(b) === 'staff' ? 1 : 0;
      if (ra !== rb) return ra - rb;
      return (memberOrder.get(a) ?? 0) - (memberOrder.get(b) ?? 0);
    });
    const chips = sortedNames.map((n) => `<span class="assigned-chip" data-cat="${cat.key}" data-name="${n}" data-role="${getRole(n)}">${n}</span>`).join('');
    let breakdown = '';
    if (cat.key === 'open') {
      const playerCount = names.filter((n) => getRole(n) !== 'staff').length;
      const staffCount = names.filter((n) => getRole(n) === 'staff').length;
      breakdown = `<div class="assign-cat-breakdown"><span class="bd-player">プレイヤー ${playerCount}人</span><span class="bd-sep">＋</span><span class="bd-staff">運営 ${staffCount}人</span></div>`;
    }
    return `
      <div class="assign-cat" data-key="${cat.key}">
        <div class="assign-cat-header">
          <span>${cat.label}</span>
          <span class="count">${names.length}人</span>
        </div>
        ${breakdown}
        <div class="assign-cat-names">${chips}</div>
      </div>
    `;
  }).join('');

  // カテゴリ行タップでチェックボックスピッカーを開く（オープン・スライドは除外）
  assignCategories.querySelectorAll('.assign-cat-header').forEach((header) => {
    header.addEventListener('click', () => {
      const catKey = header.closest('.assign-cat').dataset.key;
      if (DEFAULT_PAIR.has(catKey)) return;
      openCheckboxPicker(catKey);
    });
  });

  // 割り当て済みチップ：タップで移動ダイアログ／解除、ドラッグで他カテゴリへ移動
  assignCategories.querySelectorAll('.assigned-chip').forEach((chip) => {
    setupChipDragAndTap(chip, chip.dataset.cat, chip.dataset.name);
  });
}

// === チップのドラッグ & タップ ===

let dragState = null;
const DRAG_THRESHOLD = 8;

function setupChipDragAndTap(chip, fromCatKey, name) {
  chip.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    dragState = {
      pointerId: e.pointerId,
      chip,
      fromCatKey,
      name,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      ghost: null,
      offsetX: 0,
      offsetY: 0,
      lastTarget: null,
    };
    try { chip.setPointerCapture(e.pointerId); } catch (_) {}
  });

  chip.addEventListener('pointermove', (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      const rect = chip.getBoundingClientRect();
      const ghost = chip.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      document.body.appendChild(ghost);
      dragState.ghost = ghost;
      dragState.offsetX = dragState.startX - rect.left;
      dragState.offsetY = dragState.startY - rect.top;
      chip.classList.add('dragging-source');
      dragState.dragging = true;
    }
    dragState.ghost.style.left = (e.clientX - dragState.offsetX) + 'px';
    dragState.ghost.style.top = (e.clientY - dragState.offsetY) + 'px';
    dragState.ghost.style.visibility = 'hidden';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    dragState.ghost.style.visibility = '';
    const candidateEl = elUnder ? elUnder.closest('.assign-cat') : null;
    const candidateKey = candidateEl ? candidateEl.dataset.key : null;
    // open ↔ slide間ドロップは無効
    const validTarget = candidateKey && isDefaultPairMove(dragState.fromCatKey, candidateKey)
      ? null
      : candidateEl;
    if (dragState.lastTarget && dragState.lastTarget !== validTarget) {
      dragState.lastTarget.classList.remove('drop-target');
    }
    if (validTarget && validTarget !== dragState.lastTarget) {
      validTarget.classList.add('drop-target');
    }
    dragState.lastTarget = validTarget;
  });

  const finishDrag = (commit) => {
    if (!dragState) return;
    const wasDrag = dragState.dragging;
    if (wasDrag) {
      if (commit && dragState.lastTarget) {
        const toCatKey = dragState.lastTarget.dataset.key;
        if (toCatKey && toCatKey !== dragState.fromCatKey) {
          moveToCategory(dragState.name, dragState.fromCatKey, toCatKey);
        }
      }
      if (dragState.ghost) dragState.ghost.remove();
      if (dragState.lastTarget) dragState.lastTarget.classList.remove('drop-target');
      dragState.chip.classList.remove('dragging-source');
      dragState = null;
      renderAll();
      return;
    }
    // タップ扱い
    const tapName = dragState.name;
    const tapFrom = dragState.fromCatKey;
    dragState = null;
    if (DEFAULT_PAIR.has(tapFrom)) {
      openMoveDialog(tapName, tapFrom);
    } else {
      assignments[tapFrom] = assignments[tapFrom].filter((n) => n !== tapName);
      ensureInDefault(tapName);
      renderAll();
    }
  };

  chip.addEventListener('pointerup', (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    finishDrag(true);
  });

  chip.addEventListener('pointercancel', (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    finishDrag(false);
  });
}

// === メンバー一覧の並び替え（設定モーダル内） ===

let rowDragState = null;

function setupRowReorder(row) {
  const handle = row.querySelector('.drag-handle');
  if (!handle) return;

  handle.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = row.getBoundingClientRect();

    const ghost = row.cloneNode(true);
    ghost.classList.add('row-drag-ghost');
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'member-manage-row row-placeholder';
    placeholder.dataset.name = row.dataset.name;
    placeholder.style.height = rect.height + 'px';
    row.parentNode.replaceChild(placeholder, row);

    rowDragState = {
      pointerId: e.pointerId,
      handle,
      name: row.dataset.name,
      ghost,
      placeholder,
      offsetY: e.clientY - rect.top,
    };
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  });

  handle.addEventListener('pointermove', (e) => {
    if (!rowDragState || rowDragState.pointerId !== e.pointerId) return;
    rowDragState.ghost.style.top = (e.clientY - rowDragState.offsetY) + 'px';

    const allRows = Array.from(memberManageList.querySelectorAll('.member-manage-row'));
    const others = allRows.filter((r) => r !== rowDragState.placeholder);

    let insertBefore = null;
    for (const r of others) {
      const rect = r.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertBefore = r;
        break;
      }
    }
    const ph = rowDragState.placeholder;
    const targetParent = insertBefore ? insertBefore.parentNode : memberManageList.querySelector('.member-section:last-child');
    if (insertBefore) {
      if (ph.nextSibling !== insertBefore) {
        targetParent.insertBefore(ph, insertBefore);
      }
    } else {
      // 最後尾に挿入（最後のセクションの末尾）
      const lastSection = memberManageList.querySelector('.member-section:last-child');
      if (lastSection && lastSection.lastElementChild !== ph) {
        lastSection.appendChild(ph);
      }
    }
  });

  const finishRowDrag = (commit) => {
    if (!rowDragState) return;
    const { ghost, placeholder, name } = rowDragState;
    rowDragState = null;
    if (commit) {
      // 各セクション内のplaceholder位置から新しいmembers配列を構築
      const sections = memberManageList.querySelectorAll('.member-section');
      const newMembers = [];
      sections.forEach((section) => {
        const sectionRole = section.dataset.role;
        section.querySelectorAll('.member-manage-row').forEach((el) => {
          const memberName = el === placeholder ? name : el.dataset.name;
          if (!memberName) return;
          newMembers.push(memberName);
          // ドロップ先セクションの役割を当該メンバーに反映
          if (el === placeholder) {
            const targetRole = sectionRole === 'staff' ? 'staff' : 'player';
            if (getRole(name) !== targetRole) {
              roles = setRole(name, targetRole);
            }
          }
        });
      });
      // 既存の他メンバーが漏れないようにmaintain
      for (const m of members) {
        if (!newMembers.includes(m)) newMembers.push(m);
      }
      members = newMembers;
      saveMembers(members);
    }
    if (ghost) ghost.remove();
    if (placeholder) placeholder.remove();
    renderMemberManageList();
  };

  handle.addEventListener('pointerup', (e) => {
    if (!rowDragState || rowDragState.pointerId !== e.pointerId) return;
    finishRowDrag(true);
  });

  handle.addEventListener('pointercancel', (e) => {
    if (!rowDragState || rowDragState.pointerId !== e.pointerId) return;
    finishRowDrag(false);
  });
}

// === まとめて再描画 ===

function renderAll() {
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

// === シェア（LINE優先、Web Share APIフォールバック） ===
// ※ LINEは特定グループへの直接送信は不可。共有シートで宛先を都度選択する仕様。
btnShare.addEventListener('click', async () => {
  const text = preview.textContent;
  // 端末が対応していれば共有シートを開く（LINEを含む任意のアプリを選択可能）
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  // フォールバック: LINEのテキスト共有URLを開く
  const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
  window.open(url, '_blank');
});

// 日付変更でプレビュー更新
reportDate.addEventListener('change', updatePreview);

// === 設定モーダル ===

btnSettings.addEventListener('click', () => {
  hideStaffToggle.checked = hideStaff;
  renderMemberManageList();
  settingsModal.classList.add('active');
});

hideStaffToggle.addEventListener('change', () => {
  hideStaff = hideStaffToggle.checked;
  saveHideStaff(hideStaff);
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
  // プレイヤー / 運営 でグループ化（各グループ内ではmembers配列の順序を維持）
  const playerNames = members.filter((m) => getRole(m) !== 'staff');
  const staffNames = members.filter((m) => getRole(m) === 'staff');

  const renderRow = (name) => {
    const isHidden = hiddenMembers.includes(name);
    const role = getRole(name);
    const roleLabel = role === 'staff' ? '運営' : 'プレイヤー';
    const defaultKey = getDefaultCatKey(name);
    const defaultLabel = defaultKey === 'slide' ? 'スライド' : 'オープン';
    return `
      <div class="member-manage-row ${isHidden ? 'hidden-member' : ''}" data-name="${name}">
        <span class="drag-handle" title="ドラッグで並び替え">⠿</span>
        <span class="member-manage-name" data-role="${role}">${name}</span>
        <div class="member-manage-actions">
          <button class="btn-toggle-default" data-name="${name}" data-default="${defaultKey}" title="デフォルト所属">${defaultLabel}</button>
          <button class="btn-toggle-role" data-name="${name}" data-role="${role}">${roleLabel}</button>
          <button class="btn-toggle-vis" data-name="${name}">${isHidden ? '表示' : '非表示'}</button>
          <button class="btn-remove" data-name="${name}">削除</button>
        </div>
      </div>
    `;
  };

  const sectionHTML = (title, names, roleClass) => `
    <div class="member-section" data-role="${roleClass}">
      <div class="member-section-title">${title}（${names.length}）</div>
      ${names.map(renderRow).join('') || '<div class="member-section-empty">なし</div>'}
    </div>
  `;

  memberManageList.innerHTML =
    sectionHTML('プレイヤー', playerNames, 'player') +
    sectionHTML('運営スタッフ', staffNames, 'staff');

  // ドラッグハンドルで並び替え
  memberManageList.querySelectorAll('.member-manage-row').forEach((row) => {
    setupRowReorder(row);
  });

  memberManageList.querySelectorAll('.btn-toggle-role').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const next = getRole(name) === 'staff' ? 'player' : 'staff';
      roles = setRole(name, next);
      renderMemberManageList();
    });
  });

  memberManageList.querySelectorAll('.btn-toggle-default').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const oldDefault = getDefaultCatKey(name);
      const newDefault = oldDefault === 'slide' ? 'open' : 'slide';
      defaultCats = setDefaultCat(name, newDefault);
      // 現在 旧デフォルトに居るなら 新デフォルトへ移動
      if (assignments[oldDefault] && assignments[oldDefault].includes(name)) {
        assignments[oldDefault] = assignments[oldDefault].filter((n) => n !== name);
        if (!assignments[newDefault].includes(name)) {
          assignments[newDefault].push(name);
        }
      }
      renderMemberManageList();
    });
  });

  memberManageList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (!confirm(`「${name}」を削除しますか？`)) return;
      members = removeMember(name);
      hiddenMembers = hiddenMembers.filter((n) => n !== name);
      saveHidden(hiddenMembers);
      roles = setRole(name, 'player');
      defaultCats = setDefaultCat(name, 'open');
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
        saveHidden(hiddenMembers);
        ensureInDefault(name);
      } else {
        hiddenMembers.push(name);
        for (const key of Object.keys(assignments)) {
          assignments[key] = assignments[key].filter((n) => n !== name);
        }
        saveHidden(hiddenMembers);
      }
      renderMemberManageList();
    });
  });
}

function doAddMember() {
  const name = newMemberName.value.trim();
  if (!name) return;
  members = addMember(name);
  newMemberName.value = '';
  ensureInDefault(name);
  renderMemberManageList();
}

btnAddMember.addEventListener('click', doAddMember);
newMemberName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doAddMember();
});

// === バックアップ / リストア ===

btnBackup.addEventListener('click', () => {
  const backup = exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.download = `v-attendance-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

btnRestore.addEventListener('click', () => {
  restoreFile.value = '';
  restoreFile.click();
});

restoreFile.addEventListener('change', async () => {
  const file = restoreFile.files && restoreFile.files[0];
  if (!file) return;
  if (!confirm('現在のメンバー・非表示・入力データを上書きします。よろしいですか？')) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    importBackup(data);
    alert('リストアしました。アプリを再読み込みします。');
    location.reload();
  } catch (err) {
    alert(`リストアに失敗しました: ${err.message || err}`);
  }
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

normalizeAllDefault();
renderAll();
