'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, Edit2, Trash2, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

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
  clockInLocation?: LocationData | null;
  clockOutLocation?: LocationData | null;
  locationName?: string | null;
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
    return sum + (hours || 0);
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
    <div className="rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-xl overflow-hidden shadow-xl shadow-slate-900/10">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Clock In
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Clock Out
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Break
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Hours
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Location
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Type
              </th>
              {editable && (
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const date = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
              const startTime = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
              const endTime = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
              const hours = typeof entry.hours === 'string' ? parseFloat(entry.hours) || 0 : (entry.hours || 0);

              return (
                <tr
                  key={entry.id}
                  className="odd:bg-white even:bg-slate-50/70 hover:bg-blue-50/60 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      {format(date, 'EEE, MMM d')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 font-medium">
                      {format(startTime, 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 font-medium">
                      {format(endTime, 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 font-medium">
                      {entry.breakMinutes} min
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">
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
                    <div className="flex items-center gap-2">
                      {entry.locationName ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-help text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-medium truncate max-w-[120px]">{entry.locationName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{entry.locationName}</p>
                                {entry.clockInLocation && entry.clockInLocation.lat != null && entry.clockInLocation.lng != null && (
                                  <p className="text-slate-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    In: {entry.clockInLocation.lat.toFixed(5)}, {entry.clockInLocation.lng.toFixed(5)}
                                  </p>
                                )}
                                {entry.clockOutLocation && entry.clockOutLocation.lat != null && entry.clockOutLocation.lng != null && (
                                  <p className="text-slate-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                    Out: {entry.clockOutLocation.lat.toFixed(5)}, {entry.clockOutLocation.lng.toFixed(5)}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (entry.clockInLocation || entry.clockOutLocation) ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-help text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-medium">GPS Recorded</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              <div className="space-y-1">
                                {entry.clockInLocation && entry.clockInLocation.lat != null && entry.clockInLocation.lng != null && (
                                  <p className="font-medium text-blue-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    In: {entry.clockInLocation.lat.toFixed(5)}, {entry.clockInLocation.lng.toFixed(5)}
                                  </p>
                                )}
                                {entry.clockOutLocation && entry.clockOutLocation.lat != null && entry.clockOutLocation.lng != null && (
                                  <p className="font-medium text-purple-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                    Out: {entry.clockOutLocation.lat.toFixed(5)}, {entry.clockOutLocation.lng.toFixed(5)}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Location not recorded</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      entry.entryType === 'CLOCK'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : entry.entryType === 'MANUAL'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-orange-100 text-orange-700 border-orange-200'
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
          <tfoot className="bg-slate-900/95 text-white">
            <tr>
              <td colSpan={editable ? 4 : 4} className="px-6 py-4 text-right">
                <span className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
                  Total Hours:
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-xl font-bold">
                  {totalHours.toFixed(2)}
                </span>
              </td>
              <td colSpan={editable ? 2 : 1}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-slate-200 bg-white/95">
        {entries.map((entry) => {
          const date = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
          const startTime = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
          const endTime = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
          const hours = typeof entry.hours === 'string' ? parseFloat(entry.hours) || 0 : (entry.hours || 0);

          return (
            <div key={entry.id} className="p-4 bg-white/70">
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
        
        <div className="p-4 bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">Total Hours</span>
            <span className="text-xl font-bold">{totalHours.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
