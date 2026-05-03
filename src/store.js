const MEMBERS_KEY = 'v-report-members';

const DEFAULT_MEMBERS = [
  '祐也', '迅', 'ちんすこう', 'クロム',
  '雅', '寿里', 'はると', 'スバル', '狼恋',
  'TO-YA', 'ルイ', '湊', '宗', '音羽', 'ライト',
  'とあ', '紫月', 'けんしん',
];

// 初期で運営スタッフとして登録するメンバー
const DEFAULT_STAFF = ['TO-YA', 'ルイ', '湊', '宗', '狼恋', '音羽', 'ライト'];

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

// メンバー役割（player / staff）
const ROLES_KEY = 'v-report-roles';

export function loadRoles() {
  const raw = localStorage.getItem(ROLES_KEY);
  if (!raw) {
    const initial = {};
    for (const name of DEFAULT_STAFF) initial[name] = 'staff';
    saveRoles(initial);
    return initial;
  }
  return JSON.parse(raw);
}

export function saveRoles(roles) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
}

export function setRole(name, role) {
  const roles = loadRoles();
  if (role === 'staff') {
    roles[name] = 'staff';
  } else {
    delete roles[name];
  }
  saveRoles(roles);
  return roles;
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
    roles: loadRoles(),
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
  if (data.roles && typeof data.roles === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(data.roles)) {
      if (typeof k === 'string' && v === 'staff') cleaned[k] = 'staff';
    }
    saveRoles(cleaned);
  }
  if (data.input && typeof data.input === 'object') {
    saveInputData(data.input);
  }
}
