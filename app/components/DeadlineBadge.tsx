import React from 'react';

export default function DeadlineBadge({ date }: { date: string }) {
  if (!date) return <span className="text-xs text-gray-500 font-medium">No deadline</span>;

  const deadline = new Date(date);
  deadline.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Default: Aman (Masa Depan)
  let status = "aman";
  let colorClass = "text-gray-700 border-gray-300";

  const diffTime = deadline.getTime() - today.getTime();
  
  if (diffTime === 0) {
    status = "hari_ini";
    colorClass = "text-orange-600 border-orange-500 bg-orange-50";
  } else if (diffTime < 0) {
    status = "terlambat";
    colorClass = "text-red-600 border-red-500 bg-red-50";
  } else {
    colorClass = "text-gray-700 border-gray-300 bg-gray-50";
  }

  const formattedDate = deadline.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <div className={`px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 ${colorClass}`}>
      {status === "aman" && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
      {status === "hari_ini" && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === "terlambat" && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      <span>{formattedDate}</span>
    </div>
  );
}
