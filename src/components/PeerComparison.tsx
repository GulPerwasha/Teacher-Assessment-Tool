'use client';

import type { PeerComparison } from '@/utils/analytics';

interface PeerComparisonProps {
  comparisons: PeerComparison[];
  selectedStudent?: string;
  onStudentSelect?: (studentId: string) => void;
}

export default function PeerComparison({ comparisons, selectedStudent, onStudentSelect }: PeerComparisonProps) {
  const categories = ['Cognitive Skills', 'Social Skills', 'Emotional Readiness', 'Communication', 'Creativity'];

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (percentile >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (percentile >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (percentile >= 20) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return 'Excellent';
    if (percentile >= 80) return 'Above Average';
    if (percentile >= 60) return 'Good';
    if (percentile >= 40) return 'Average';
    if (percentile >= 20) return 'Below Average';
    return 'Needs Support';
  };

  const getCategoryColor = (categoryName: string) => {
    const colors = {
      'Cognitive Skills': 'bg-blue-500',
      'Social Skills': 'bg-green-500',
      'Emotional Readiness': 'bg-purple-500',
      'Communication': 'bg-orange-500',
      'Creativity': 'bg-pink-500'
    };
    return colors[categoryName as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Peer Comparison
      </h3>

      {comparisons.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No comparison data available
        </div>
      ) : (
        <div className="space-y-4">
          {comparisons.map((student) => (
            <div 
              key={student.studentId}
              className={`border rounded-lg p-4 transition-colors ${
                selectedStudent === student.studentId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => onStudentSelect?.(student.studentId)}
            >
              {/* Student Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {student.studentName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {student.studentName}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPercentileColor(student.overallPercentile)}`}>
                        {student.overallPercentile}th percentile
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getPercentileLabel(student.overallPercentile)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {categories.map(category => {
                  const score = student.categoryAverages[category] || 0;
                  const percentile = student.percentile[category] || 0;
                  
                  if (score === 0) return null;

                  return (
                    <div key={category} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getCategoryColor(category)}`}></div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {category.split(' ')[0]}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {score.toFixed(1)}
                        </div>
                        <div className={`text-xs px-1 rounded ${getPercentileColor(percentile)}`}>
                          {percentile}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bars */}
              <div className="mt-3 space-y-2">
                {categories.map(category => {
                  const score = student.categoryAverages[category] || 0;
                  const percentile = student.percentile[category] || 0;
                  
                  if (score === 0) return null;

                  return (
                    <div key={category} className="flex items-center space-x-2">
                      <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                        {category.split(' ')[0]}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getCategoryColor(category)}`}
                          style={{ width: `${(score / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-8 text-xs text-gray-500 dark:text-gray-400 text-right">
                        {score.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {comparisons.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Class Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {comparisons.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Students
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round(comparisons.reduce((sum, s) => sum + s.overallPercentile, 0) / comparisons.length)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Avg Percentile
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 