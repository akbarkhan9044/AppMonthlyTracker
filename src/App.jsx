import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icons } from './Icons';
import { DayColumn } from './DayColumn';
import { ListCard } from './ListCard';
import { Calendar } from './Calendar';
import {
  dayKey, addDays, today0, sameDay, uid,
  loadStore, saveStore, SEED_BOARDS, FONT_STEPS
} from './utils';
import './App.css';

function App() {
  const [store, setStore] = useState(loadStore);
  const [dark, setDark] = useState(() => localStorage.getItem('dayboard.dark') === '1');
  const [fontIdx, setFontIdx] = useState(() => Number(localStorage.getItem('dayboard.font')) || 5);
  const [anchor, setAnchor] = useState(() => today0());
  const [viewDays, setViewDays] = useState(() => Number(localStorage.getItem('dayboard.view')) || 5);
  const [board, setBoard] = useState(0);
  const [boards, setBoards] = useState(SEED_BOARDS);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [listsCollapsed, setListsCollapsed] = useState(false);
  const [addTabOpen, setAddTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [deleteListTarget, setDeleteListTarget] = useState(null);
  const [deleteTabTarget, setDeleteTabTarget] = useState(null);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [manageBoard, setManageBoard] = useState(0);
  const [renameTabOpen, setRenameTabOpen] = useState(false);
  const [renameTabName, setRenameTabName] = useState('');
  const [manageListsOpen, setManageListsOpen] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const manageDragFrom = useRef(null);

  const createTab = useCallback(() => {
    const trimmed = newTabName.trim();
    if (!trimmed) return;
    setBoards(bs => [...bs, trimmed]);
    setNewTabName('');
    setAddTabOpen(false);
  }, [newTabName]);

  const closeAddTab = useCallback(() => {
    setNewTabName('');
    setAddTabOpen(false);
  }, []);

  const confirmDeleteList = useCallback(() => {
    if (!deleteListTarget) return;
    setStore(s => {
      const currentLists = s.listsByBoard?.[board] || [];
      return {
        ...s,
        listsByBoard: {
          ...s.listsByBoard,
          [board]: currentLists.filter(l => l.id !== deleteListTarget.id)
        }
      };
    });
    setDeleteListTarget(null);
  }, [deleteListTarget, board]);

  const deleteTab = useCallback((idx) => {
    if (boards.length <= 1) return;
    setDeleteTabTarget({ idx, name: boards[idx] });
  }, [boards]);

  const confirmDeleteTab = useCallback(() => {
    if (!deleteTabTarget) return;
    const { idx } = deleteTabTarget;
    // Re-key listsByBoard: drop idx, shift higher indices down by one
    setStore(s => {
      const next = {};
      Object.entries(s.listsByBoard || {}).forEach(([k, lists]) => {
        const i = Number(k);
        if (i === idx) return;
        next[i > idx ? i - 1 : i] = lists;
      });
      return { ...s, listsByBoard: next };
    });
    setBoards(bs => bs.filter((_, i) => i !== idx));
    setBoard(b => (b > idx ? b - 1 : b === idx ? Math.max(0, idx - 1) : b));
    setDeleteTabTarget(null);
  }, [deleteTabTarget]);

  // Manage-tab menu actions (operate on the chosen tab index)
  const openRenameTab = useCallback((idx) => {
    setMenuOpenFor(null);
    setManageBoard(idx);
    setRenameTabName(boards[idx]);
    setRenameTabOpen(true);
  }, [boards]);

  const saveRenameTab = useCallback(() => {
    const trimmed = renameTabName.trim();
    if (!trimmed) return;
    setBoards(bs => bs.map((b, i) => (i === manageBoard ? trimmed : b)));
    setRenameTabOpen(false);
  }, [renameTabName, manageBoard]);

  const openManageLists = useCallback((idx) => {
    setMenuOpenFor(null);
    setManageBoard(idx);
    setEditingListId(null);
    setManageListsOpen(true);
  }, []);

  const reorderLists = useCallback((from, to) => {
    if (from === to) return;
    setStore(s => {
      const lists = [...(s.listsByBoard?.[manageBoard] || [])];
      const [m] = lists.splice(from, 1);
      lists.splice(to, 0, m);
      return { ...s, listsByBoard: { ...s.listsByBoard, [manageBoard]: lists } };
    });
  }, [manageBoard]);

  const removeListNow = useCallback((lid) => {
    setStore(s => {
      const lists = (s.listsByBoard?.[manageBoard] || []).filter(l => l.id !== lid);
      return { ...s, listsByBoard: { ...s.listsByBoard, [manageBoard]: lists } };
    });
  }, [manageBoard]);

  const saveListName = useCallback((lid) => {
    const trimmed = editingListName.trim();
    if (trimmed) setLists(manageBoard, ls => ls.map(l => (l.id === lid ? { ...l, name: trimmed } : l)));
    setEditingListId(null);
  }, [editingListName, manageBoard]);

  // Focus mode + Pomodoro timer
  const [focusMode, setFocusMode] = useState(false);
  const [pomoMinutes, setPomoMinutes] = useState(15);
  const [pomoRemaining, setPomoRemaining] = useState(15 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);

  const selectPomo = useCallback((m) => {
    setPomoMinutes(m);
    setPomoRemaining(m * 60);
    setPomoRunning(false);
  }, []);

  // Tick the timer when running
  useEffect(() => {
    if (!pomoRunning) return;
    const id = setInterval(() => {
      setPomoRemaining(r => {
        if (r <= 1) {
          setPomoRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomoRunning]);

  // Exit focus mode on Escape
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e) => { if (e.key === 'Escape') setFocusMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  const fmtClock = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Smooth date navigation
  const navigateDate = useCallback((delta) => {
    setTransitioning(true);
    setTimeout(() => {
      setAnchor(a => addDays(a, delta));
      setTimeout(() => setTransitioning(false), 50);
    }, 150);
  }, []);

  useEffect(() => { saveStore(store); }, [store]);
  useEffect(() => { localStorage.setItem('dayboard.dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => { localStorage.setItem('dayboard.font', String(fontIdx)); }, [fontIdx]);
  useEffect(() => { localStorage.setItem('dayboard.view', String(viewDays)); }, [viewDays]);

  // Apply theme + font size
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle('theme-dark', dark);
    r.style.setProperty('--base-size', FONT_STEPS[fontIdx] + 'px');
  }, [dark, fontIdx]);

  const days = useMemo(
    () => Array.from({ length: viewDays }, (_, i) => addDays(anchor, i)),
    [anchor, viewDays]
  );

  // Day mutations
  const setDay = (key, fn) => setStore(s => {
    const cur = s.days[key] || [];
    return { ...s, days: { ...s.days, [key]: fn(cur) } };
  });

  function dayActions(key) {
    return {
      add: (text) => setDay(key, a => [...a, { id: uid(), text, done: false, header: false, recur: false }]),
      toggle: (id) => setDay(key, a => a.map(x => x.id === id ? { ...x, done: !x.done } : x)),
      edit: (id, v) => setDay(key, a => a.map(x => x.id === id ? { ...x, text: v } : x)),
      del: (id) => setDay(key, a => a.filter(x => x.id !== id)),
      recur: (id) => setDay(key, a => a.map(x => x.id === id ? { ...x, recur: !x.recur } : x)),
      header: (id) => setDay(key, a => a.map(x => x.id === id ? { ...x, header: !x.header, done: false } : x)),
      reorder: (from, to) => setDay(key, a => {
        const b = [...a];
        const [m] = b.splice(from, 1);
        b.splice(to, 0, m);
        return b;
      }),
    };
  }

  // List mutations - now board-specific
  const setLists = (boardIdx, fn) => setStore(s => {
    const currentLists = s.listsByBoard?.[boardIdx] || [];
    return {
      ...s,
      listsByBoard: {
        ...s.listsByBoard,
        [boardIdx]: fn(currentLists)
      }
    };
  });

  const listActions = {
    add: (lid, text) => setLists(board, ls => ls.map(l =>
      l.id === lid ? { ...l, items: [...l.items, { id: uid(), text, done: false, header: false }] } : l
    )),
    toggle: (lid, id) => setLists(board, ls => ls.map(l =>
      l.id === lid ? { ...l, items: l.items.map(x => x.id === id ? { ...x, done: !x.done } : x) } : l
    )),
    edit: (lid, id, v) => setLists(board, ls => ls.map(l =>
      l.id === lid ? { ...l, items: l.items.map(x => x.id === id ? { ...x, text: v } : x) } : l
    )),
    del: (lid, id) => setLists(board, ls => ls.map(l =>
      l.id === lid ? { ...l, items: l.items.filter(x => x.id !== id) } : l
    )),
    header: (lid, id) => setLists(board, ls => ls.map(l =>
      l.id === lid ? { ...l, items: l.items.map(x => x.id === id ? { ...x, header: !x.header, done: false } : x) } : l
    )),
    reorder: (lid, from, to) => setLists(board, ls => ls.map(l => {
      if (l.id !== lid) return l;
      const b = [...l.items];
      const [m] = b.splice(from, 1);
      b.splice(to, 0, m);
      return { ...l, items: b };
    })),
    rename: (lid, name) => setLists(board, ls => ls.map(l => l.id === lid ? { ...l, name } : l)),
    delList: (lid) => {
      const l = (store.listsByBoard?.[board] || []).find(x => x.id === lid);
      setDeleteListTarget({ id: lid, name: l?.name || 'this list' });
    },
    newList: () => setLists(board, ls => [...ls, { id: uid(), name: 'NEW LIST', items: [] }]),
  };

  // Get current board's lists
  const currentBoardLists = store.listsByBoard?.[board] || [];
  const manageBoardLists = store.listsByBoard?.[manageBoard] || [];

  const dayItems = (d) => {
    const key = dayKey(d);
    return store.days[key] || [];
  };

  // Search across everything
  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const out = [];
    Object.entries(store.days).forEach(([k, arr]) =>
      arr.forEach(it => {
        if (!it.header && it.text.toLowerCase().includes(q))
          out.push({ where: k, text: it.text, done: it.done });
      })
    );
    Object.values(store.listsByBoard || {}).forEach(lists =>
      lists.forEach(l =>
        l.items.forEach(it => {
          if (!it.header && it.text.toLowerCase().includes(q))
            out.push({ where: l.name, text: it.text, done: it.done });
        })
      )
    );
    return out;
  }, [query, store]);

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="tb-left relative">
          <button
            className={`icon-btn${searchOpen ? ' active' : ''}`}
            title="Search"
            onClick={() => setSearchOpen(o => !o)}
          >
            {Icons.search()}
          </button>
          <button className="today-btn" onClick={() => setAnchor(today0())}>
            TODAY
          </button>
          {searchOpen && (
            <div className="searchpop">
              <input
                autoFocus
                placeholder="Search all to-dos…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {results && (
                <div className="search-results">
                  {results.length === 0 && <div className="sr-empty">No matches</div>}
                  {results.map((r, i) => (
                    <div key={i} className={`sr-item${r.done ? ' done' : ''}`}>
                      <span className="sr-text">{r.text}</span>
                      <span className="sr-where">{r.where}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="wordmark">TEUXDEUX<span className="asterisk">*</span></div>
        <div className="tb-right">
          <div className="nav-arrows">
            <button className="icon-btn" title="Jump back a week" onClick={() => navigateDate(-7)}>
              {Icons.dblL()}
            </button>
            <button className="icon-btn" title="Previous day" onClick={() => navigateDate(-1)}>
              {Icons.chevL()}
            </button>
            <button className="icon-btn" title="Next day" onClick={() => navigateDate(1)}>
              {Icons.chevR()}
            </button>
            <button className="icon-btn" title="Jump forward a week" onClick={() => navigateDate(7)}>
              {Icons.dblR()}
            </button>
          </div>
          <div className="calendar-wrapper">
            <button
              className={`icon-btn${calendarOpen ? ' active' : ''}`}
              title="Calendar"
              onClick={() => setCalendarOpen(o => !o)}
            >
              {Icons.cal()}
            </button>
            <Calendar
              isOpen={calendarOpen}
              onClose={() => setCalendarOpen(false)}
              onSelectDate={(date) => setAnchor(date)}
              currentDate={anchor}
            />
          </div>
        </div>
      </header>

      {/* Week columns */}
      <div className="week-container">
        <button className="week-nav week-nav-left" onClick={() => navigateDate(-1)}>
          {Icons.chevL()}
        </button>
        <div className={`week${transitioning ? ' transitioning' : ''}`} style={{ '--cols': viewDays }}>
          {days.map((d) => {
            const key = dayKey(d);
            const items = dayItems(d);
            return (
              <DayColumn
                key={key}
                date={d}
                isToday={sameDay(d, today0())}
                hasItems={items.length > 0}
                items={items}
                A={dayActions(key)}
              />
            );
          })}
        </div>
        <button className="week-nav week-nav-right" onClick={() => navigateDate(1)}>
          {Icons.chevR()}
        </button>
      </div>

      {/* Board tabs */}
      <div className="boards">
        {boards.map((b, i) => {
          const boardLists = store.listsByBoard?.[i] || [];
          const itemCount = boardLists.reduce((sum, l) => sum + l.items.filter(x => !x.done).length, 0);
          return (
            <span key={i} className={`board${i === board ? ' active' : ''}`}>
              <button className="board-label" onClick={() => setBoard(i)}>
                {b}
                {itemCount > 0 && <span className="board-n">{itemCount}</span>}
              </button>
              <div className="board-grip-wrap">
                <button
                  className={`board-grip${menuOpenFor === i ? ' active' : ''}`}
                  title="Manage tab"
                  onClick={() => setMenuOpenFor(o => (o === i ? null : i))}
                >
                  {Icons.dots()}
                </button>
                {menuOpenFor === i && (
                  <>
                    <div className="menu-backdrop" onClick={() => setMenuOpenFor(null)} />
                    <div className="manage-menu">
                      <div className="manage-menu-head">MANAGE TAB</div>
                      <button className="manage-menu-item" onClick={() => openManageLists(i)}>
                        {Icons.dragHandle()} Manage lists in tab
                      </button>
                      <button className="manage-menu-item" onClick={() => openRenameTab(i)}>
                        {Icons.edit()} Rename tab
                      </button>
                      {boards.length > 1 && (
                        <button
                          className="manage-menu-item danger"
                          onClick={() => { setMenuOpenFor(null); deleteTab(i); }}
                        >
                          {Icons.minus()} Delete tab
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </span>
          );
        })}
        <button
          className="board-add"
          title="New board"
          onClick={() => { setNewTabName(''); setAddTabOpen(true); }}
        >
          {Icons.plus()}
        </button>
        <button
          className={`board-collapse${listsCollapsed ? ' collapsed' : ''}`}
          title={listsCollapsed ? "Expand lists" : "Collapse lists"}
          onClick={() => setListsCollapsed(c => !c)}
        >
          {Icons.chevL({ style: { transform: listsCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)' } })}
        </button>
      </div>

      {/* Custom lists */}
      {!listsCollapsed && (
        <div className="lists" style={{ '--cols': viewDays }}>
          {currentBoardLists.map(l => (
            <ListCard key={l.id} list={l} A={listActions} />
          ))}
          <div className="newlist-wrap">
            <button className="newlist" onClick={listActions.newList}>
              + NEW LIST
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        {[1, 3, 5, 7].map(n => (
          <button
            key={n}
            className={`fontstep${n !== 1 && viewDays === n ? ' active' : ''}`}
            title={n === 1 ? 'Focus mode' : n === 7 ? 'Show whole week' : `Show ${n} days`}
            onClick={() => {
              if (n === 1) { setFocusMode(true); return; }
              setViewDays(n);
            }}
          >
            {n}
          </button>
        ))}
        <button
          className={`ft-moon${dark ? ' on' : ''}`}
          title="Toggle dark mode"
          onClick={() => setDark(d => !d)}
        >
          {Icons.moon()}
        </button>
      </footer>

      {/* Add tab modal */}
      {addTabOpen && (
        <div className="modal-overlay" onMouseDown={closeAddTab}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add tab name</h2>
              <button className="modal-close" title="Close" onClick={closeAddTab}>
                {Icons.close()}
              </button>
            </div>
            <input
              className="modal-input"
              type="text"
              autoFocus
              value={newTabName}
              onChange={e => setNewTabName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createTab();
                if (e.key === 'Escape') closeAddTab();
              }}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-primary" onClick={createTab}>
                Create
              </button>
              <button className="modal-btn modal-btn-ghost" onClick={closeAddTab}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete list confirmation modal */}
      {deleteListTarget && (
        <div className="modal-overlay" onMouseDown={() => setDeleteListTarget(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete list</h2>
              <button className="modal-close" title="Close" onClick={() => setDeleteListTarget(null)}>
                {Icons.close()}
              </button>
            </div>
            <p className="modal-text">
              Delete “{deleteListTarget.name}”? This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-danger" onClick={confirmDeleteList}>
                Delete
              </button>
              <button className="modal-btn modal-btn-ghost" onClick={() => setDeleteListTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete tab confirmation modal */}
      {deleteTabTarget && (
        <div className="modal-overlay" onMouseDown={() => setDeleteTabTarget(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete tab</h2>
              <button className="modal-close" title="Close" onClick={() => setDeleteTabTarget(null)}>
                {Icons.close()}
              </button>
            </div>
            <p className="modal-text">
              Delete the “{deleteTabTarget.name}” tab and all of its lists? This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-danger" onClick={confirmDeleteTab}>
                Delete
              </button>
              <button className="modal-btn modal-btn-ghost" onClick={() => setDeleteTabTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename tab modal */}
      {renameTabOpen && (
        <div className="modal-overlay" onMouseDown={() => setRenameTabOpen(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit tab name</h2>
              <button className="modal-close" title="Close" onClick={() => setRenameTabOpen(false)}>
                {Icons.close()}
              </button>
            </div>
            <input
              className="modal-input"
              type="text"
              autoFocus
              value={renameTabName}
              onChange={e => setRenameTabName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRenameTab();
                if (e.key === 'Escape') setRenameTabOpen(false);
              }}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-primary" onClick={saveRenameTab}>
                Save
              </button>
              <button className="modal-btn modal-btn-ghost" onClick={() => setRenameTabOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage lists modal */}
      {manageListsOpen && (
        <div className="modal-overlay" onMouseDown={() => setManageListsOpen(false)}>
          <div className="modal modal-wide" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{boards[manageBoard]}</h2>
              <button className="modal-close" title="Close" onClick={() => setManageListsOpen(false)}>
                {Icons.close()}
              </button>
            </div>
            <div className="manage-lists">
              {manageBoardLists.length === 0 && (
                <div className="manage-empty">No lists in this tab yet.</div>
              )}
              {manageBoardLists.map((l, idx) => (
                <div
                  key={l.id}
                  className="manage-list-row"
                  draggable={editingListId !== l.id}
                  onDragStart={(e) => { manageDragFrom.current = idx; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = manageDragFrom.current;
                    if (from != null && from !== idx) reorderLists(from, idx);
                    manageDragFrom.current = null;
                  }}
                >
                  <span className="mlr-grip">{Icons.grip()}</span>
                  {editingListId === l.id ? (
                    <input
                      className="mlr-input"
                      autoFocus
                      value={editingListName}
                      onChange={e => setEditingListName(e.target.value)}
                      onBlur={() => saveListName(l.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveListName(l.id);
                        if (e.key === 'Escape') setEditingListId(null);
                      }}
                    />
                  ) : (
                    <span className="mlr-name">{l.name}</span>
                  )}
                  <div className="mlr-actions">
                    <button
                      className="mlr-btn"
                      title="Rename list"
                      onClick={() => { setEditingListId(l.id); setEditingListName(l.name); }}
                    >
                      {Icons.edit()}
                    </button>
                    <button
                      className="mlr-btn"
                      title="Delete list"
                      onClick={() => removeListNow(l.id)}
                    >
                      {Icons.minus()}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-primary" onClick={() => setManageListsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus mode */}
      {focusMode && (
        <div className="focus">
          <div className="focus-top">
            <button className="focus-esc" onClick={() => setFocusMode(false)}>
              ESC
            </button>
            <div className="wordmark focus-wordmark">TEUXDEUX<span className="asterisk">*</span></div>
            <div className="pomo">
              {[15, 25, 30, 45].map(m => (
                <button
                  key={m}
                  className={`pomo-time${pomoMinutes === m ? ' active' : ''}`}
                  onClick={() => selectPomo(m)}
                >
                  {pomoMinutes === m ? fmtClock(pomoRemaining) : fmtClock(m * 60)}
                </button>
              ))}
              <button
                className="pomo-start"
                onClick={() => {
                  if (pomoRemaining === 0) setPomoRemaining(pomoMinutes * 60);
                  setPomoRunning(r => !r);
                }}
              >
                {pomoRunning ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>

          <div className="focus-card">
            {(() => {
              const d = today0();
              const key = dayKey(d);
              const items = dayItems(d);
              return (
                <DayColumn
                  date={d}
                  isToday
                  hasItems={items.length > 0}
                  items={items}
                  A={dayActions(key)}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
