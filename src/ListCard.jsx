import { useState, useRef, useEffect } from 'react';
import { Row, AddRow } from './Row';
import { Icons } from './Icons';

export function ListCard({ list, A }) {
  const dragFrom = useRef(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(list.name);

  useEffect(() => setName(list.name), [list.name]);

  function moveStart(e, idx) {
    dragFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function dropRow(e, idx) {
    e.preventDefault();
    const from = dragFrom.current;
    if (from == null || from === idx) return;
    A.reorder(list.id, from, idx);
    dragFrom.current = null;
  }

  return (
    <div className="listcard">
      {editName ? (
        <input
          className="list-name-input"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            A.rename(list.id, name.trim() || list.name);
            setEditName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              A.rename(list.id, name.trim() || list.name);
              setEditName(false);
            }
            if (e.key === 'Escape') {
              setName(list.name);
              setEditName(false);
            }
          }}
        />
      ) : (
        <h3 className="list-name" onDoubleClick={() => setEditName(true)}>
          {list.name}
          <button className="list-del" title="Delete list" onClick={() => A.delList(list.id)}>
            {Icons.minus()}
          </button>
        </h3>
      )}
      <div className="col-body">
        {list.items.map((it, idx) => (
          <Row
            key={it.id}
            item={it}
            index={idx}
            onToggle={() => A.toggle(list.id, it.id)}
            onEdit={(v) => A.edit(list.id, it.id, v)}
            onDelete={() => A.del(list.id, it.id)}
            onRecur={() => {}}
            onHeader={() => A.header(list.id, it.id)}
            onMoveStart={moveStart}
            onDropRow={dropRow}
          />
        ))}
        <AddRow onAdd={(v) => A.add(list.id, v)} placeholder="Add an item" />
      </div>
    </div>
  );
}
