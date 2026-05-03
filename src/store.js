const MEMBERS_KEY = 'v-report-members';

const DEFAULT_MEMBERS = [
  '祐也', '迅', 'ちんすこう', 'クロム',
  '雅', '寿里', 'はると', 'スバル', '琥珀', '狼恋',
  'TO-YA', 'ルイ', '湊', '宗', '音羽', 'ライト',
  'とあ', '紫月', 'けんしん',
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

// メンバー非表示リスト
const HIDDEN_KEY = 'v-report-hidden';

export function loadHidden() {
  const raw = localStorage.getItem(HIDDEN_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveHidden(hidden) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
}

// 入力データの永続化
const INPUT_KEY = 'v-report-input';

export function loadInputData() {
  const raw = localStorage.getItem(INPUT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveInputData(data) {
  localStorage.setItem(INPUT_KEY, JSON.stringify(data));
}

// === バックアップ / リストア ===

const BACKUP_VERSION = 1;

export function exportBackup() {
  return {
    app: 'v-attendance-report',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    members: loadMembers(),
    hidden: loadHidden(),
    input: loadInputData(),
  };
}

export function importBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('バックアップファイルの形式が不正です');
  }
  if (data.app && data.app !== 'v-attendance-report') {
    throw new Error('このアプリのバックアップではありません');
  }
  if (Array.isArray(data.members)) {
    saveMembers(data.members.filter((m) => typeof m === 'string'));
  }
  if (Array.isArray(data.hidden)) {
    saveHidden(data.hidden.filter((m) => typeof m === 'string'));
  }
  if (data.input && typeof data.input === 'object') {
    saveInputData(data.input);
  }
}
