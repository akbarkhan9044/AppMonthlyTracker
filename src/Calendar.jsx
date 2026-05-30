import { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { MONTHS, today0, addDays } from './utils';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function Calendar({ isOpen, onClose, onSelectDate, currentDate }) {
  const [viewDate, setViewDate] = useState(() => currentDate || today0());
  const calRef = useRef(null);

  useEffect(() => {
    if (currentDate) {
      setViewDate(currentDate);
    }
  }, [currentDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayDate = today0();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Get days from previous month to fill the grid
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = [];
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i)
    });
  }

  // Current month days
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month days to fill remaining slots
  const totalCells = 42; // 6 rows × 7 days
  const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length;
  const nextMonthDays = [];
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dayInfo) => {
    onSelectDate(dayInfo.date);
    onClose();
  };

  const isToday = (date) => {
    return date.getDate() === todayDate.getDate() &&
           date.getMonth() === todayDate.getMonth() &&
           date.getFullYear() === todayDate.getFullYear();
  };

  return (
    <div className="calendar-popup" ref={calRef}>
      <div className="cal-header">
        <button className="cal-nav" onClick={goToPrevMonth}>
          {Icons.chevL()}
        </button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={goToNextMonth}>
          {Icons.chevR()}
        </button>
      </div>
      <div className="cal-weekdays">
        {DAY_LABELS.map(day => (
          <span key={day} className="cal-weekday">{day}</span>
        ))}
      </div>
      <div className="cal-days">
        {allDays.map((dayInfo, idx) => (
          <button
            key={idx}
            className={`cal-day ${!dayInfo.isCurrentMonth ? 'cal-day-other' : ''} ${isToday(dayInfo.date) ? 'cal-day-today' : ''}`}
            onClick={() => handleDateClick(dayInfo)}
          >
            {dayInfo.day}
          </button>
        ))}
      </div>
    </div>
  );
}
