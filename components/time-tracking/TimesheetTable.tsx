'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, Edit2, Trash2 } from 'lucide-react';

interface TimesheetEntry {
  id: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  breakMinutes: number;
  hours: number | string;
  isOvertime: boolean;
  notes?: string | null;
  entryType: string;
}

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  onEdit?: (entry: TimesheetEntry) => void;
  onDelete?: (entryId: string) => void;
  editable?: boolean;
  isLoading?: boolean;
}

export default function TimesheetTable({
  entries,
  onEdit,
  onDelete,
  editable = false,
  isLoading = false,
}: TimesheetTableProps) {
  const totalHours = entries.reduce((sum, entry) => {
    const hours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;
    return sum + hours;
  }, 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-16 bg-slate-200 rounded"></div>
          <div className="h-16 bg-slate-200 rounded"></div>
          <div className="h-16 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Entries Yet</h3>
        <p className="text-slate-600">
          Clock in/out entries will appear here once they are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Clock In
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Clock Out
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Break
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Type
              </th>
              {editable && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.map((entry) => {
              const date = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
              const startTime = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
              const endTime = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
              const hours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;

              return (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {format(date, 'EEE, MMM d')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">
                      {format(startTime, 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">
                      {format(endTime, 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">
                      {entry.breakMinutes} min
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {hours.toFixed(2)}
                      </span>
                      {entry.isOvertime && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                          OT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      entry.entryType === 'CLOCK'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : entry.entryType === 'MANUAL'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      {entry.entryType}
                    </span>
                  </td>
                  {editable && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(entry)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {onDelete && entry.entryType !== 'CLOCK' && (
                          <button
                            onClick={() => onDelete(entry.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t border-slate-200">
            <tr>
              <td colSpan={editable ? 4 : 4} className="px-6 py-4 text-right">
                <span className="text-sm font-semibold text-slate-600 uppercase">
                  Total Hours:
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-lg font-bold text-slate-900">
                  {totalHours.toFixed(2)}
                </span>
              </td>
              <td colSpan={editable ? 2 : 1}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-slate-200">
        {entries.map((entry) => {
          const date = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
          const startTime = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
          const endTime = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
          const hours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;

          return (
            <div key={entry.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">
                    {format(date, 'EEE, MMM d')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">{hours.toFixed(2)}h</div>
                  {entry.isOvertime && (
                    <span className="text-xs text-amber-600">Overtime</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Break: {entry.breakMinutes} min</span>
                <span className={`px-2 py-0.5 rounded-full ${
                  entry.entryType === 'CLOCK'
                    ? 'bg-blue-100 text-blue-700'
                    : entry.entryType === 'MANUAL'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {entry.entryType}
                </span>
              </div>

              {editable && (
                <div className="flex gap-2 mt-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(entry)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && entry.entryType !== 'CLOCK' && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        <div className="p-4 bg-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Total Hours</span>
            <span className="text-xl font-bold text-slate-900">{totalHours.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
