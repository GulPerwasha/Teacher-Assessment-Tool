'use client';

import { useState } from 'react';
import type { InterventionAlert } from '@/utils/analytics';

interface InterventionAlertsProps {
  alerts: InterventionAlert[];
  onDismiss?: (alertId: string) => void;
}

export default function InterventionAlerts({ alerts, onDismiss }: InterventionAlertsProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📊';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'decline':
        return '📉';
      case 'threshold':
        return '🎯';
      case 'improvement':
        return '📈';
      default:
        return '📊';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const colors = {
      'Cognitive Skills': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Social Skills': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Emotional Readiness': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Communication': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Creativity': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return colors[categoryName as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Intervention Alerts
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-4xl mb-2">✅</div>
          <p>No alerts at this time</p>
          <p className="text-sm">All students are performing well</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Intervention Alerts
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
          {alerts.filter(a => a.severity === 'high').length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs rounded-full font-medium">
              {alerts.filter(a => a.severity === 'high').length} High Priority
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div 
            key={`${alert.studentId}-${alert.category}-${index}`}
            className={`border rounded-lg p-4 transition-all ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {alert.studentName}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(alert.category)}`}>
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>Score: {alert.score.toFixed(1)}/5</span>
                    {alert.trend > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        Decline: {alert.trend.toFixed(1)} points
                      </span>
                    )}
                    <span className="capitalize">{alert.severity} priority</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setExpandedAlert(expandedAlert === `${alert.studentId}-${alert.category}-${index}` ? null : `${alert.studentId}-${alert.category}-${index}`)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {expandedAlert === `${alert.studentId}-${alert.category}-${index}` ? '−' : '+'}
                </button>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(`${alert.studentId}-${alert.category}-${index}`)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedAlert === `${alert.studentId}-${alert.category}-${index}` && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                      Details
                    </h5>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Current Score:</span>
                        <span className="font-medium">{alert.score.toFixed(1)}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Threshold:</span>
                        <span className="font-medium">{alert.threshold}/5</span>
                      </div>
                      {alert.trend > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Trend:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{alert.trend.toFixed(1)} points
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                      Suggested Actions
                    </h5>
                    <div className="space-y-1 text-xs">
                      {alert.severity === 'high' && (
                        <div className="text-red-600 dark:text-red-400">
                          • Immediate intervention recommended
                        </div>
                      )}
                      <div>• Schedule one-on-one meeting</div>
                      <div>• Review recent observations</div>
                      <div>• Consider additional support</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              High Priority
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {alerts.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Medium Priority
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {alerts.filter(a => a.severity === 'low').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Low Priority
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 