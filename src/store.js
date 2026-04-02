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
