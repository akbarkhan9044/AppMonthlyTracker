import { useRef } from 'react';
import { Row, AddRow } from './Row';
import { DAY_NAMES, fmtTopDate } from './utils';

export function DayColumn({ date, isToday, hasItems, items, A }) {
  const dragFrom = useRef(null);
  const wd = DAY_NAMES[date.getDay()];

  function moveStart(e, idx) {
    dragFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function dropRow(e, idx) {
    e.preventDefault();
    const from = dragFrom.current;
    if (from == null || from === idx) return;
    A.reorder(from, idx);
    dragFrom.current = null;
  }

  return (
    <div className={`col${isToday ? ' is-today' : ''}${hasItems ? ' has-items' : ''}`}>
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
        <div className="col-fill" />
      </div>
    </div>
  );
}
