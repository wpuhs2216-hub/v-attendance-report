const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// カテゴリ定義
// type: 'number' = 人数のみ入力, 'names' = 名前選択
// inHeadcount: true = 在籍人数に含める
// hideNames: 出力に名前を表示しない
// multi: 他カテゴリに割り当て済みでも選択可能
export const CATEGORIES = [
  { key: 'open',       label: 'オープンメンバー', type: 'names', inHeadcount: true, hideNames: true },
  { key: 'slide',      label: 'スライド',         type: 'names', inHeadcount: true, hideNames: true },
  { key: 'douhan',     label: '同伴',             type: 'names',  inHeadcount: true },
  { key: 'taiken',     label: '体験者',           type: 'number', inHeadcount: false },
  { key: 'shift',      label: 'シフト出勤者',     type: 'names',  inHeadcount: false, multi: true },
  { key: 'newEntry',   label: '新規入店者',       type: 'names',  inHeadcount: false, multi: true },
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
    const nameStr = (!cat.hideNames && names.length > 0) ? '　' + names.join('　') : '';

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
