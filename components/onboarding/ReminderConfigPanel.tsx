'use client';

/**
 * Reminder Configuration Panel
 * 
 * UI component for configuring step reminders with escalation settings,
 * timezone awareness, and multi-tenant support.
 */

import React, { useState } from 'react';
import { Info, Clock, AlertTriangle, User } from 'lucide-react';
import { ReminderConfig, DEFAULT_REMINDER_CONFIG } from '@/lib/onboarding/reminder-types';

interface ReminderConfigPanelProps {
  value: ReminderConfig;
  onChange: (config: ReminderConfig) => void;
  availableManagers?: Array<{ id: string; name: string; email: string }>;
  availableHRAdmins?: Array<{ id: string; name: string; email: string }>;
}

export function ReminderConfigPanel({
  value = DEFAULT_REMINDER_CONFIG,
  onChange,
  availableManagers = [],
  availableHRAdmins = [],
}: ReminderConfigPanelProps) {
  const [config, setConfig] = useState<ReminderConfig>(value);

  const updateConfig = (updates: Partial<ReminderConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const updateEscalation = (updates: Partial<ReminderConfig['escalation']>) => {
    const newConfig = {
      ...config,
      escalation: { ...config.escalation, ...updates },
    };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Reminder Settings</h4>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Enable reminders</span>
        </label>
      </div>

      {config.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Before Due Date
                <span className="ml-1 text-gray-400" title="How many days before the step is due should the reminder be sent">
                  <Info className="w-4 h-4 inline" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={config.daysBefore}
                onChange={(e) => updateConfig({ daysBefore: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Send reminder this many days in advance</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time (NZ Timezone)
                <span className="ml-1 text-gray-400" title="Time of day to send the reminder in New Zealand timezone">
                  <Info className="w-4 h-4 inline" />
                </span>
              </label>
              <input
                type="time"
                value={config.time}
                onChange={(e) => updateConfig({ time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Pacific/Auckland timezone</p>
            </div>
          </div>

          {/* Escalation Configuration */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h5 className="font-medium text-gray-900">Escalation Settings</h5>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.escalation.enabled}
                  onChange={(e) => updateEscalation({ enabled: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">Enable escalation</span>
              </label>
            </div>

            {config.escalation.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days After Reminder
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="14"
                      value={config.escalation.days}
                      onChange={(e) => updateEscalation({ days: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Escalate if not completed within this timeframe
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Escalate To
                    </label>
                    <select
                      value={config.escalation.role}
                      onChange={(e) =>
                        updateEscalation({
                          role: e.target.value as 'manager' | 'hr_admin' | 'custom',
                          userId: e.target.value === 'custom' ? config.escalation.userId : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="manager">Employee's Manager</option>
                      <option value="hr_admin">HR Administrator</option>
                      <option value="custom">Specific Person</option>
                    </select>
                  </div>
                </div>

                {config.escalation.role === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Select Person
                    </label>
                    <select
                      value={config.escalation.userId || ''}
                      onChange={(e) => updateEscalation({ userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select a person...</option>
                      <optgroup label="Managers">
                        {availableManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.email})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="HR Administrators">
                        {availableHRAdmins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.name} ({admin.email})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                  <p className="text-sm text-amber-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    Escalation emails will be sent if the step remains incomplete after the specified period.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Best Practices Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h6 className="text-sm font-medium text-blue-900 mb-2">NZ Onboarding Best Practices</h6>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Send initial reminders 1-2 days before critical compliance steps</li>
              <li>• Escalate after 3-5 days for regulatory requirements</li>
              <li>• Consider NZ public holidays and weekends when setting timelines</li>
              <li>• Remind employees about time-sensitive documents (e.g., visa, work permits)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
