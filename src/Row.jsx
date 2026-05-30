import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Icons } from './Icons';

// Auto-growing textarea
function autoSize(el) {
  if (!el) return;
  el.style.height = '0px';
  el.style.height = el.scrollHeight + 'px';
}

// Turn "word" segments that look like links into underlined accents
const LINK_WORDS = ['roadmap', 'newsletter'];
function linkify(text) {
  const parts = text.split(/(\s+)/);
  return parts.map((w, i) =>
    LINK_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, ''))
      ? <u key={i} className="ln">{w}</u>
      : <span key={i}>{w}</span>
  );
}

export function Row({ item, onToggle, onEdit, onDelete, onRecur, onHeader, onMoveStart, onDropRow, index }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [menu, setMenu] = useState(false);
  const taRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (editing) {
      const ta = taRef.current;
      if (ta) {
        autoSize(ta);
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }
  }, [editing]);

  useEffect(() => {
    setDraft(item.text);
  }, [item.text]);

  useEffect(() => {
    if (!menu) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  function commit() {
    const v = draft.trim();
    if (v === '') {
      onDelete();
    } else if (v !== item.text) {
      onEdit(v);
    }
    setEditing(false);
  }

  function keyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(item.text);
      setEditing(false);
    } else if (e.key === 'Backspace' && draft === '') {
      e.preventDefault();
      onDelete();
    }
  }

  if (item.header) {
    return (
      <div
        className={`row header-row${editing ? ' is-editing' : ''}`}
        draggable={!editing}
        onDragStart={(e) => onMoveStart(e, index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropRow(e, index)}
      >
        {editing ? (
          <textarea
            ref={taRef}
            className="row-input header-input"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); autoSize(e.target); }}
            onBlur={commit}
            onKeyDown={keyDown}
            rows={1}
          />
        ) : (
          <span className="header-text" onDoubleClick={() => setEditing(true)}>{item.text}</span>
        )}
        <div className="row-tools">
          <button className="tool" title="Delete" onClick={onDelete}>{Icons.minus()}</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`row${item.done ? ' done' : ''}${editing ? ' is-editing' : ''}`}
      draggable={!editing}
      onDragStart={(e) => onMoveStart(e, index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropRow(e, index)}
    >
      <button className="row-checkbox" onClick={onToggle} title="Mark complete"></button>
      {editing ? (
        <textarea
          ref={taRef}
          className="row-input"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); autoSize(e.target); }}
          onBlur={commit}
          onKeyDown={keyDown}
          rows={1}
        />
      ) : (
        <span className="row-text" onDoubleClick={() => setEditing(true)}>
          {linkify(item.text)}
        </span>
      )}
      <div className="row-tools">
        {item.recur && <span className="tool tool-static recur-on" title="Repeats">{Icons.repeat()}</span>}
        <button className="tool grip" title="Drag to reorder" tabIndex={-1}>{Icons.dragHandle()}</button>
        <button className="tool tool-delete" title="Delete" onClick={onDelete}>{Icons.minus()}</button>
      </div>
    </div>
  );
}

export function AddRow({ onAdd, placeholder }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);

  function key(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const v = val.trim();
      if (v) {
        onAdd(v);
        setVal('');
        requestAnimationFrame(() => {
          autoSize(ref.current);
          ref.current && ref.current.focus();
        });
      }
    } else if (e.key === 'Escape') {
      setVal('');
      ref.current && ref.current.blur();
    }
  }

  return (
    <div className="row add-row">
      <textarea
        ref={ref}
        className="row-input add-input"
        value={val}
        rows={1}
        placeholder={placeholder || 'Add a to-do'}
        onChange={(e) => { setVal(e.target.value); autoSize(e.target); }}
        onKeyDown={key}
      />
    </div>
  );
}
