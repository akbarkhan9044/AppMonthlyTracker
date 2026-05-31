import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icons } from './Icons';
import { DayColumn } from './DayColumn';
import { ListCard } from './ListCard';
import { Calendar } from './Calendar';
import {
  dayKey, addDays, today0, sameDay, uid,
  loadStore, saveStore, rolloverStore, SEED_BOARDS, FONT_STEPS
} from './utils';
import { computeStats } from './stats';
import './App.css';

function App() {
  const [store, setStore] = useState(() => rolloverStore(loadStore()));
  const [midnightTick, setMidnightTick] = useState(0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('dayboard.theme');
    if (saved) return saved;
    return localStorage.getItem('dayboard.dark') === '1' ? 'dark' : 'light';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const dark = theme === 'dark';
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [wakaOpen, setWakaOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [waka, setWaka] = useState(null);
  const [wakaLoading, setWakaLoading] = useState(false);
  const [wakaError, setWakaError] = useState('');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challenge, setChallenge] = useState(() => {
    try {
      const raw = localStorage.getItem('dayboard.challenge');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { startKey: null, coded: {} };
  });
  const [fontIdx, setFontIdx] = useState(() => Number(localStorage.getItem('dayboard.font')) || 5);
  const [anchor, setAnchor] = useState(() => today0());
  const [viewDays, setViewDays] = useState(() => {
    const v = Number(localStorage.getItem('dayboard.view')) || 5;
    return v > 5 ? 5 : v;
  });
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
  const searchRef = useRef(null);

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

  // Close the search popup when clicking anywhere outside it
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchOpen]);

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

  // At midnight, roll unfinished tasks forward to the new day (and reschedule).
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => {
      setStore(s => rolloverStore(s));
      setAnchor(today0());
      setMidnightTick(t => t + 1);
    }, nextMidnight - now + 1000);
    return () => clearTimeout(id);
  }, [midnightTick]);
  useEffect(() => { localStorage.setItem('dayboard.theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('dayboard.font', String(fontIdx)); }, [fontIdx]);
  useEffect(() => { localStorage.setItem('dayboard.view', String(viewDays)); }, [viewDays]);
  useEffect(() => { localStorage.setItem('dayboard.challenge', JSON.stringify(challenge)); }, [challenge]);

  // Apply theme + font size
  useEffect(() => {
    const r = document.documentElement;
    ['theme-dark', 'theme-mint', 'theme-peach', 'theme-lavender', 'theme-sky', 'theme-butter']
      .forEach(c => r.classList.toggle(c, c === `theme-${theme}`));
    r.style.setProperty('--base-size', FONT_STEPS[fontIdx] + 'px');
  }, [theme, fontIdx]);

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

  // Productivity insights (computed locally, no AI)
  const stats = useMemo(() => computeStats(store, boards), [store, boards]);
  const maxDay = useMemo(() => Math.max(1, ...stats.last7.map(d => d.total)), [stats]);

  // 100 Days challenge — a day counts when ≥2 tasks done OR ≥1h coded
  const CODE_GOAL = 3600;
  const TASK_GOAL = 2;
  const challengeView = useMemo(() => {
    if (!challenge.startKey) return null;
    const [sy, sm, sd] = challenge.startKey.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    start.setHours(0, 0, 0, 0);
    const todayK = dayKey(today0());
    const days = [];
    let completed = 0, currentDay = 0;
    for (let i = 0; i < 100; i++) {
      const d = addDays(start, i);
      const key = dayKey(d);
      const isPast = key < todayK;
      const isToday = key === todayK;
      const tasksCount = (store.days[key] || []).filter(it => !it.header && it.done).length;
      const coded = key === todayK && waka ? (waka.todaySeconds || 0) : (challenge.coded[key] || 0);
      const counts = tasksCount >= TASK_GOAL || coded >= CODE_GOAL;
      let status;
      if (counts) { status = 'done'; completed++; }
      else if (isToday) status = 'today';
      else if (isPast) status = 'missed';
      else status = 'upcoming';
      if (isPast || isToday) currentDay = i + 1;
      days.push({ key, n: i + 1, status, tasksCount, coded });
    }
    const today = days.find(d => d.key === todayK) || null;
    return { days, completed, currentDay: Math.min(currentDay, 100), today };
  }, [challenge, store, waka]);

  const fetchWaka = useCallback(async () => {
    setWakaLoading(true);
    setWakaError('');
    try {
      const res = await fetch('/api/wakatime');
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (res.status === 404 || !isJson) throw new Error('FUNCTION_MISSING');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setWaka(data);
      // Record per-day coded seconds for the 100-day challenge (WakaTime free
      // only keeps ~14 days, so we snapshot what we see).
      if (data.last7?.length) {
        setChallenge(c => {
          const coded = { ...c.coded };
          for (const d of data.last7) if (d.date) coded[d.date] = d.seconds;
          return { ...c, coded };
        });
      }
    } catch (e) {
      const msg = e.message || '';
      setWaka(null);
      setWakaError(
        msg === 'FUNCTION_MISSING' || msg.includes('Failed to fetch') || msg.includes('JSON')
          ? 'Coding stats run on a Netlify function. Deploy with WAKATIME_API_KEY set (or run `netlify dev`).'
          : msg || 'Could not load coding stats.'
      );
    } finally {
      setWakaLoading(false);
    }
  }, []);

  // Load WakaTime stats when any panel that needs coding data opens
  useEffect(() => {
    if ((wakaOpen || insightsOpen || challengeOpen) && !waka && !wakaLoading && !wakaError) fetchWaka();
  }, [wakaOpen, insightsOpen, challengeOpen, waka, wakaLoading, wakaError, fetchWaka]);

  const generateAiSummary = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    setAiSummary('');
    try {
      const payload = waka ? { ...stats, coding: waka } : stats;
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stats: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new Error('FUNCTION_MISSING');
      }
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setAiSummary(data.summary || 'No summary returned.');
    } catch (e) {
      const msg = e.message || '';
      setAiError(
        msg === 'FUNCTION_MISSING' || msg.includes('Failed to fetch') || msg.includes('JSON') || msg.includes('Unexpected token')
          ? 'AI summary runs on a Netlify function. Deploy the site (with ANTHROPIC_API_KEY set in Netlify), or run `netlify dev` locally — plain `vite` doesn’t serve functions.'
          : msg || 'Could not generate summary.'
      );
    } finally {
      setAiLoading(false);
    }
  }, [stats, waka]);

  const dayItems = (d) => {
    const key = dayKey(d);
    return store.days[key] || [];
  };

  // Jump to a search result's day or list
  const goToResult = (r) => {
    if (r.type === 'day') {
      const [y, m, d] = r.dateKey.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);
      setAnchor(target);
    } else {
      setBoard(r.boardIdx);
      setListsCollapsed(false);
    }
    setSearchOpen(false);
    setQuery('');
  };

  // Search across everything
  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const out = [];
    Object.entries(store.days).forEach(([k, arr]) =>
      arr.forEach(it => {
        if (!it.header && it.text.toLowerCase().includes(q))
          out.push({ type: 'day', dateKey: k, where: k, text: it.text, done: it.done });
      })
    );
    Object.entries(store.listsByBoard || {}).forEach(([boardIdx, lists]) =>
      lists.forEach(l =>
        l.items.forEach(it => {
          if (!it.header && it.text.toLowerCase().includes(q))
            out.push({ type: 'list', boardIdx: Number(boardIdx), where: l.name, text: it.text, done: it.done });
        })
      )
    );
    return out;
  }, [query, store]);

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="tb-left relative" ref={searchRef}>
          <button
            className={`icon-btn${searchOpen ? ' active' : ''}`}
            title="Search"
            onClick={() => setSearchOpen(o => !o)}
          >
            {Icons.search()}
          </button>
          <button
            className="today-btn"
            onClick={() => { setAnchor(today0()); setSearchOpen(false); }}
          >
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
                    <button
                      key={i}
                      className={`sr-item${r.done ? ' done' : ''}`}
                      onClick={() => goToResult(r)}
                    >
                      <span className="sr-text">{r.text}</span>
                      <span className="sr-where">{r.where}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="wordmark">Atomic Tracker<span className="asterisk">*</span></div>
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
        {[1, 3, 5].map(n => (
          <button
            key={n}
            className={`fontstep${n !== 1 && viewDays === n ? ' active' : ''}`}
            title={n === 1 ? 'Focus mode' : `Show ${n} days`}
            onClick={() => {
              if (n === 1) { setFocusMode(true); return; }
              setViewDays(n);
            }}
          >
            {n}
          </button>
        ))}
        <button
          className="ft-moon"
          title="Insights"
          onClick={() => setInsightsOpen(true)}
        >
          {Icons.chart()}
        </button>
        <button
          className="ft-moon"
          title="Coding time (WakaTime)"
          onClick={() => setWakaOpen(true)}
        >
          {Icons.code()}
        </button>
        <button
          className="ft-moon"
          title="100 Days challenge"
          onClick={() => setChallengeOpen(true)}
        >
          {Icons.target()}
        </button>
        <button
          className={`ft-moon${dark ? ' on' : ''}`}
          title="Toggle dark mode"
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        >
          {Icons.moon()}
        </button>
        <div className="palette-wrap">
          <button
            className={`ft-moon${paletteOpen ? ' on' : ''}`}
            title="Background color"
            onClick={() => setPaletteOpen(o => !o)}
          >
            {Icons.palette()}
          </button>
          {paletteOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setPaletteOpen(false)} />
              <div className="palette-pop">
                {[
                  { id: 'light', label: 'Default', color: '#ffffff' },
                  { id: 'mint', label: 'Mint', color: '#effaf3' },
                  { id: 'peach', label: 'Peach', color: '#fff4ec' },
                  { id: 'lavender', label: 'Lavender', color: '#f3f0fc' },
                  { id: 'sky', label: 'Sky', color: '#eef6fd' },
                  { id: 'butter', label: 'Butter', color: '#fdf8e8' },
                  { id: 'dark', label: 'Dark', color: '#111827' },
                ].map(s => (
                  <button
                    key={s.id}
                    className={`swatch${theme === s.id ? ' active' : ''}`}
                    title={s.label}
                    style={{ background: s.color }}
                    onClick={() => { setTheme(s.id); setPaletteOpen(false); }}
                  />
                ))}
              </div>
            </>
          )}
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

      {/* Insights modal */}
      {insightsOpen && (
        <div className="modal-overlay" onMouseDown={() => setInsightsOpen(false)}>
          <div className="modal modal-wide" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Insights</h2>
              <button className="modal-close" title="Close" onClick={() => setInsightsOpen(false)}>
                {Icons.close()}
              </button>
            </div>

            <div className="insights-grid">
              <div className="stat-card stat-streak">
                <span className="stat-flame">{Icons.flame()}</span>
                <div className="stat-num">{stats.streak}</div>
                <div className="stat-label">day streak</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.today.done}/{stats.today.total}</div>
                <div className="stat-label">done today</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.week.done}/{stats.week.total}</div>
                <div className="stat-label">this week · {stats.week.rate}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.allTime.done}</div>
                <div className="stat-label">completed all-time</div>
              </div>
            </div>

            <div className="insights-section-title">Last 7 days</div>
            <div className="spark">
              {stats.last7.map((d) => (
                <div className="spark-col" key={d.key} title={`${d.label}: ${d.done}/${d.total} done`}>
                  <div className="spark-bar-wrap">
                    <div className="spark-bar-total" style={{ height: `${(d.total / maxDay) * 100}%` }} />
                    <div className="spark-bar-done" style={{ height: `${(d.done / maxDay) * 100}%` }} />
                  </div>
                  <div className="spark-label">{d.label[0]}</div>
                </div>
              ))}
            </div>

            {stats.boards.some(b => b.total > 0) && (
              <>
                <div className="insights-section-title">Effort by board</div>
                <div className="effort-list">
                  {stats.boards.filter(b => b.total > 0).map((b) => (
                    <div className="effort-row" key={b.name}>
                      <span className="effort-name">{b.name}</span>
                      <div className="effort-bar">
                        <div className="effort-bar-done" style={{ width: `${(b.done / b.total) * 100}%` }} />
                      </div>
                      <span className="effort-count">{b.done}/{b.total}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="insights-section-title">AI summary</div>
            <div className="ai-box">
              {aiSummary && <p className="ai-text">{aiSummary}</p>}
              {aiError && <p className="ai-error">{aiError}</p>}
              {!aiSummary && !aiError && !aiLoading && (
                <p className="ai-hint">Get a short written update on your streak, today, this week, and where your effort is going.</p>
              )}
              <button className="modal-btn modal-btn-primary" onClick={generateAiSummary} disabled={aiLoading}>
                {aiLoading ? 'Thinking…' : aiSummary ? 'Regenerate' : 'Generate AI summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WakaTime modal */}
      {wakaOpen && (
        <div className="modal-overlay" onMouseDown={() => setWakaOpen(false)}>
          <div className="modal modal-wide" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Coding time</h2>
              <button className="modal-close" title="Close" onClick={() => setWakaOpen(false)}>
                {Icons.close()}
              </button>
            </div>

            {wakaLoading && <div className="ai-hint">Loading coding stats…</div>}
            {wakaError && !wakaLoading && (
              <div className="ai-box">
                <p className="ai-error">{wakaError}</p>
                <button className="modal-btn modal-btn-ghost" onClick={() => { setWakaError(''); fetchWaka(); }}>
                  Retry
                </button>
              </div>
            )}
            {waka && !wakaLoading && (
              <>
                <div className="insights-grid insights-grid-3">
                  <div className="stat-card">
                    <div className="stat-num">{waka.todayText || '0m'}</div>
                    <div className="stat-label">coded today</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{waka.weekText || '0m'}</div>
                    <div className="stat-label">this week</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{waka.dailyAverageText || '0m'}</div>
                    <div className="stat-label">daily average</div>
                  </div>
                </div>

                {waka.projects?.length > 0 && (
                  <>
                    <div className="insights-section-title">Top projects</div>
                    <div className="effort-list">
                      {waka.projects.map((p) => (
                        <div className="effort-row" key={p.name}>
                          <span className="effort-name">{p.name}</span>
                          <div className="effort-bar">
                            <div className="effort-bar-done" style={{ width: `${p.percent || 0}%` }} />
                          </div>
                          <span className="effort-count">{p.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {waka.languages?.length > 0 && (
                  <>
                    <div className="insights-section-title">Languages</div>
                    <div className="waka-langs">
                      {waka.languages.map((l) => (
                        <span className="waka-lang" key={l.name}>{l.name} · {l.text}</span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 100 Days challenge modal */}
      {challengeOpen && (
        <div className="modal-overlay" onMouseDown={() => setChallengeOpen(false)}>
          <div className="modal modal-wide" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">100 Days challenge</h2>
              <button className="modal-close" title="Close" onClick={() => setChallengeOpen(false)}>
                {Icons.close()}
              </button>
            </div>

            {!challengeView ? (
              <div className="ai-box">
                <p className="ai-hint">
                  Build a daily habit: a day counts when you complete <strong>at least 2 tasks</strong> or
                  code <strong>at least 1 hour</strong> (via WakaTime). Track 100 days of consistency.
                </p>
                <button
                  className="modal-btn modal-btn-primary"
                  onClick={() => setChallenge(c => ({ ...c, startKey: dayKey(today0()) }))}
                >
                  Start the challenge
                </button>
              </div>
            ) : (
              <>
                <div className="insights-grid insights-grid-3">
                  <div className="stat-card">
                    <div className="stat-num">{challengeView.currentDay}<span className="stat-of">/100</span></div>
                    <div className="stat-label">current day</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{challengeView.completed}</div>
                    <div className="stat-label">days completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{100 - challengeView.completed}</div>
                    <div className="stat-label">remaining</div>
                  </div>
                </div>

                <div className="insights-section-title">Today — do either one</div>
                <div className="chal-today-row">
                  <span className={`chal-req${(challengeView.today?.tasksCount || 0) >= TASK_GOAL ? ' met' : ''}`}>
                    {(challengeView.today?.tasksCount || 0) >= TASK_GOAL ? '✓' : '○'} Complete 2 tasks
                    <span className="chal-sub"> ({challengeView.today?.tasksCount || 0}/{TASK_GOAL})</span>
                  </span>
                  <span className="chal-or">or</span>
                  <span className={`chal-req${(challengeView.today?.coded || 0) >= CODE_GOAL ? ' met' : ''}`}>
                    {(challengeView.today?.coded || 0) >= CODE_GOAL ? '✓' : '○'} Code 1 hour
                    <span className="chal-sub">
                      {' '}({Math.floor((challengeView.today?.coded || 0) / 3600)}h{' '}
                      {Math.floor(((challengeView.today?.coded || 0) % 3600) / 60)}m
                      {waka ? '' : ' · open Coding to sync'})
                    </span>
                  </span>
                </div>

                <div className="insights-section-title">Progress</div>
                <div className="chal-grid">
                  {challengeView.days.map(d => (
                    <div
                      key={d.key}
                      className={`chal-cell chal-${d.status}`}
                      title={`Day ${d.n} · ${d.key} · ${d.status}`}
                    />
                  ))}
                </div>
                <div className="chal-legend">
                  <span><i className="chal-cell chal-done" /> Completed</span>
                  <span><i className="chal-cell chal-today" /> Today</span>
                  <span><i className="chal-cell chal-missed" /> Missed</span>
                  <span><i className="chal-cell chal-upcoming" /> Upcoming</span>
                </div>

                <div className="modal-actions" style={{ marginTop: '18px' }}>
                  <button
                    className="modal-btn modal-btn-ghost"
                    onClick={() => setChallenge(c => ({ ...c, startKey: null }))}
                  >
                    Reset challenge
                  </button>
                </div>
              </>
            )}
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
            <div className="wordmark focus-wordmark">Atomic Tracker<span className="asterisk">*</span></div>
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
