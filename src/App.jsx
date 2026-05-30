import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [board, setBoard] = useState(0);
  const [boards, setBoards] = useState(SEED_BOARDS);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [listsCollapsed, setListsCollapsed] = useState(false);
  const [addTabOpen, setAddTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');

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

  // Apply theme + font size
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle('theme-dark', dark);
    r.style.setProperty('--base-size', FONT_STEPS[fontIdx] + 'px');
  }, [dark, fontIdx]);

  const days = useMemo(() => [0, 1, 2, 3, 4].map(i => addDays(anchor, i)), [anchor]);

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
      if (confirm('Delete this list?')) setLists(board, ls => ls.filter(l => l.id !== lid));
    },
    newList: () => setLists(board, ls => [...ls, { id: uid(), name: 'NEW LIST', items: [] }]),
  };

  // Get current board's lists
  const currentBoardLists = store.listsByBoard?.[board] || [];

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
    store.lists.forEach(l =>
      l.items.forEach(it => {
        if (!it.header && it.text.toLowerCase().includes(q))
          out.push({ where: l.name, text: it.text, done: it.done });
      })
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
        <div className={`week${transitioning ? ' transitioning' : ''}`}>
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
        <button className="board-grip" tabIndex={-1}>{Icons.dots()}</button>
        {boards.map((b, i) => {
          const boardLists = store.listsByBoard?.[i] || [];
          const itemCount = boardLists.reduce((sum, l) => sum + l.items.filter(x => !x.done).length, 0);
          return (
            <button
              key={b}
              className={`board${i === board ? ' active' : ''}`}
              onClick={() => setBoard(i)}
            >
              {b}
              {itemCount > 0 && <span className="board-n">{itemCount}</span>}
            </button>
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
        <div className="lists">
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
        <div className="ft-left">
          <button className="ft-icon" title="Emoji">😊</button>
          <button className="ft-icon" title="Sync">{Icons.repeat()}</button>
        </div>
        <div className="ft-center">
          {[1, 3, 5, 7].map(n => (
            <button
              key={n}
              className={`fontstep${fontIdx === n ? ' active' : ''}`}
              onClick={() => setFontIdx(n)}
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
        </div>
        <div className="ft-right">
          <button className="ft-icon" title="Account">{Icons.user()}</button>
          <button className="ft-icon" title="Help">{Icons.help()}</button>
          <button className="go-pro-btn">GO PRO</button>
        </div>
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
    </div>
  );
}

export default App;
