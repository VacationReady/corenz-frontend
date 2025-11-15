'use client';

/**
 * SLA Configuration Panel
 * 
 * UI component for configuring step SLAs with business day calculations,
 * public holiday exclusions, and compliance tracking.
 */

import React, { useState } from 'react';
import { Info, Calendar, AlertCircle } from 'lucide-react';
import { SLAConfig, DEFAULT_SLA_CONFIG } from '@/lib/onboarding/reminder-types';

interface SLAConfigPanelProps {
  value: SLAConfig;
  onChange: (config: SLAConfig) => void;
}

export function SLAConfigPanel({
  value = DEFAULT_SLA_CONFIG,
  onChange,
}: SLAConfigPanelProps) {
  const [config, setConfig] = useState<SLAConfig>(value);

  const updateConfig = (updates: Partial<SLAConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-gray-900">SLA Settings</h4>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Enable SLA tracking</span>
        </label>
      </div>

      {config.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Target (Days)
                <span className="ml-1 text-gray-400" title="Number of days the employee has to complete this step">
                  <Info className="w-4 h-4 inline" />
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={config.completionDays}
                onChange={(e) => updateConfig({ completionDays: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Target completion timeframe</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warning Threshold (Days)
                <span className="ml-1 text-gray-400" title="Days before deadline to show warning">
                  <Info className="w-4 h-4 inline" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max={config.completionDays - 1}
                value={config.warningDays}
                onChange={(e) => updateConfig({ warningDays: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Show warning this many days before deadline</p>
            </div>
          </div>

          {/* Business Day Configuration */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h5 className="font-medium text-gray-900 mb-3">Business Day Calculation</h5>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludePublicHolidays}
                  onChange={(e) => updateConfig({ excludePublicHolidays: e.target.checked })}
                  className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 block">
                    Exclude NZ Public Holidays
                  </span>
                  <span className="text-xs text-gray-500">
                    Don't count public holidays toward SLA deadline (recommended for compliance)
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludeWeekends}
                  onChange={(e) => updateConfig({ excludeWeekends: e.target.checked })}
                  className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 block">
                    Exclude Weekends
                  </span>
                  <span className="text-xs text-gray-500">
                    Count only business days (Mon-Fri) toward SLA deadline
                  </span>
                </div>
              </label>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-3">
              <p className="text-sm text-purple-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {config.excludePublicHolidays && config.excludeWeekends
                  ? 'SLA will count business days only, excluding weekends and NZ public holidays.'
                  : config.excludePublicHolidays
                    ? 'SLA will count calendar days, excluding NZ public holidays.'
                    : config.excludeWeekends
                      ? 'SLA will count weekdays only, excluding weekends.'
                      : 'SLA will count all calendar days including weekends and holidays.'}
              </p>
            </div>
          </div>

          {/* SLA Preview */}
          {config.completionDays > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h5 className="font-medium text-gray-900 mb-2">SLA Preview</h5>
              <div className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completion Target:</span>
                  <span className="font-medium text-gray-900">
                    {config.completionDays} {config.completionDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Warning Threshold:</span>
                  <span className="font-medium text-amber-600">
                    {config.warningDays} {config.warningDays === 1 ? 'day' : 'days'} before deadline
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Calculation Method:</span>
                  <span className="font-medium text-gray-900">
                    {config.excludeWeekends && config.excludePublicHolidays
                      ? 'Business days only'
                      : config.excludeWeekends
                        ? 'Weekdays only'
                        : config.excludePublicHolidays
                          ? 'Calendar days (excl. holidays)'
                          : 'Calendar days'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Best Practices Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h6 className="text-sm font-medium text-blue-900 mb-2">NZ Compliance Guidelines</h6>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Visa/Work Permit uploads:</strong> 3-5 business days</li>
              <li>• <strong>Tax forms (IR330, IR348):</strong> 5-7 business days</li>
              <li>• <strong>Health & Safety acknowledgments:</strong> 1-2 business days</li>
              <li>• <strong>Employment agreement signing:</strong> 7-10 business days</li>
              <li>• Always exclude public holidays for compliance-critical steps</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
