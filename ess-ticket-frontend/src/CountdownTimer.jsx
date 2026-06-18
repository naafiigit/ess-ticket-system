import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ deadline, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyClass, setUrgencyClass] = useState('text-slate-400 bg-slate-950/40 border-slate-900');

  useEffect(() => {
    // If the ticket is already resolved, don't tick
    if (status === 'Resolved') {
      setTimeLeft('Fulfilled ✅');
      setUrgencyClass('text-emerald-400 bg-emerald-500/10 border-emerald-500/20');
      return;
    }

    const calculateTime = () => {
      const difference = new Date(deadline) - new Date();

      if (difference <= 0) {
        setTimeLeft('SLA Breached 🛑');
        setUrgencyClass('text-red-400 bg-red-500/10 border-red-500/20 animate-pulse font-black');
        return;
      }

      // Time math conversions
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Pad zero characters for digital stopwatch layout appearance
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeLeft(`${hStr}h : ${mStr}m : ${sStr}s`);

      // Dynamic color shifts based on urgency thresholds
      if (hours < 1) {
        // Less than 1 hour remaining -> Urgent Warning
        setUrgencyClass('text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold');
      } else {
        // Safe operational state
        setUrgencyClass('text-blue-400 bg-blue-500/10 border-blue-500/20');
      }
    };

    // Calculate immediately on initialization loop
    calculateTime();

    // Hook interval worker thread to update layout every single second
    const intervalId = setInterval(calculateTime, 1000);

    // Clean up interval execution loops on unmount hooks to stop background performance memory leaks
    return () => clearInterval(intervalId);
  }, [deadline, status]);

  return (
    <div className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border tracking-wide inline-flex items-center justify-center transition-all ${urgencyClass}`}>
      {timeLeft}
    </div>
  );
}