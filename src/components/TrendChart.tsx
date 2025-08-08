'use client';

import { useState } from 'react';
import { TrendData } from '@/utils/analytics';

interface TrendChartProps {
  trends: TrendData[];
  category?: string;
  studentName?: string;
  height?: number;
}

export default function TrendChart({ trends, category, studentName, height = 200 }: TrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  if (trends.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No trend data available
        </div>
      </div>
    );
  }

  // Get all categories if none specified
  const categories = category ? [category] : ['Cognitive Skills', 'Social Skills', 'Emotional Readiness', 'Communication', 'Creativity'];
  
  // Filter out periods with no data
  const validTrends = trends.filter(trend => 
    categories.some(cat => trend.scores[cat] && trend.scores[cat] > 0)
  );

  if (validTrends.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No data available for selected period
        </div>
      </div>
    );
  }

  const maxScore = 5;
  const minScore = 0;
  const chartHeight = height - 60; // Account for padding and labels

  const getCategoryColor = (categoryName: string) => {
    const colors = {
      'Cognitive Skills': '#3B82F6',
      'Social Skills': '#10B981',
      'Emotional Readiness': '#8B5CF6',
      'Communication': '#F59E0B',
      'Creativity': '#EC4899'
    };
    return colors[categoryName as keyof typeof colors] || '#6B7280';
  };

  const formatPeriod = (period: string) => {
    if (period.includes('W')) {
      const [year, week] = period.split('-W');
      return `Week ${week}, ${year}`;
    } else {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
  };

  const getYPosition = (score: number) => {
    return chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {studentName ? `${studentName}'s Progress` : 'Class Trends'}
        </h3>
        <div className="flex space-x-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getCategoryColor(cat) }}
              ></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {cat.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
          {[5, 4, 3, 2, 1, 0].map(score => (
            <div key={score} className="flex items-center">
              <span>{score}</span>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="ml-8 relative" style={{ height: chartHeight }}>
          {/* Grid lines */}
          {[5, 4, 3, 2, 1, 0].map(score => (
            <div
              key={score}
              className="absolute w-full border-b border-gray-200 dark:border-gray-600"
              style={{ top: getYPosition(score) }}
            ></div>
          ))}

          {/* Data lines */}
          {categories.map(categoryName => {
            const categoryTrends = validTrends.filter(trend => trend.scores[categoryName] > 0);
            
            if (categoryTrends.length < 2) return null;

            const points = categoryTrends.map((trend, index) => {
              const x = (index / (categoryTrends.length - 1)) * 100;
              const y = getYPosition(trend.scores[categoryName]);
              return `${x}%, ${y}px`;
            }).join(', ');

            return (
              <svg
                key={categoryName}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              >
                <polyline
                  fill="none"
                  stroke={getCategoryColor(categoryName)}
                  strokeWidth="2"
                  points={points}
                />
                {categoryTrends.map((trend, index) => {
                  const x = (index / (categoryTrends.length - 1)) * 100;
                  const y = getYPosition(trend.scores[categoryName]);
                  return (
                    <circle
                      key={index}
                      cx={`${x}%`}
                      cy={y}
                      r="3"
                      fill={getCategoryColor(categoryName)}
                      style={{ pointerEvents: 'all' }}
                      onMouseEnter={() => setSelectedPeriod(trend.period)}
                      onMouseLeave={() => setSelectedPeriod(null)}
                    />
                  );
                })}
              </svg>
            );
          })}

          {/* Tooltip */}
          {selectedPeriod && (
            <div className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 z-10">
              {formatPeriod(selectedPeriod)}
            </div>
          )}
        </div>

        {/* X-axis labels */}
        <div className="ml-8 mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {validTrends.map((trend, index) => (
            <div key={trend.period} className="text-center">
              <div className="transform -rotate-45 origin-left">
                {formatPeriod(trend.period)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map(cat => (
          <div key={cat} className="flex items-center space-x-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: getCategoryColor(cat) }}
            ></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 