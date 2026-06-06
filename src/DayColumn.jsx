import { Row, AddRow } from './Row';
import { DAY_NAMES, fmtTopDate } from './utils';

export function DayColumn({ date, isToday, hasItems, items, A, dayKeyStr, onMoveToDay }) {
  const wd = DAY_NAMES[date.getDay()];

  function moveStart(e, idx, id) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ fromKey: dayKeyStr, id, fromIndex: idx }));
  }

  function readDrag(e) {
    try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; }
  }

  // Drop onto a specific row: reorder within the day, or move from another day.
  function dropRow(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    const d = readDrag(e);
    if (!d) return;
    if (d.fromKey === dayKeyStr) {
      if (d.fromIndex !== idx) A.reorder(d.fromIndex, idx);
    } else if (onMoveToDay) {
      onMoveToDay(d.fromKey, d.id, dayKeyStr, idx);
    }
  }

  // Drop onto empty space in the column: append (only when coming from another day).
  function dropColumn(e) {
    e.preventDefault();
    const d = readDrag(e);
    if (!d || !onMoveToDay) return;
    if (d.fromKey !== dayKeyStr) {
      onMoveToDay(d.fromKey, d.id, dayKeyStr, null);
    }
  }

  return (
    <div
      className={`col${isToday ? ' is-today' : ''}${hasItems ? ' has-items' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={dropColumn}
    >
      <div className="col-date">{fmtTopDate(date)}</div>
      <h2 className="col-day">{wd}</h2>
      <div className="col-body">
        {items.map((it, idx) => (
          <Row
            key={it.id}
            item={it}
            index={idx}
            onToggle={() => A.toggle(it.id)}
            onEdit={(v) => A.edit(it.id, v)}
            onDelete={() => A.del(it.id)}
            onRecur={() => A.recur(it.id)}
            onHeader={() => A.header(it.id)}
            onMoveStart={moveStart}
            onDropRow={dropRow}
          />
        ))}
        <AddRow onAdd={A.add} />
        <div className="col-fill" onDragOver={(e) => e.preventDefault()} onDrop={dropColumn} />
      </div>
    </div>
  );
}
