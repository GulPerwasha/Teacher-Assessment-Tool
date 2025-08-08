'use client';

import { useState, useEffect } from 'react';
import { CategoryScore, OBSERVATION_CATEGORIES } from '@/types';
import { getScoringCriteria } from '@/utils/nlpProcessor';

interface RubricScorerProps {
  categoryScores: CategoryScore[];
  onScoresChange: (scores: CategoryScore[]) => void;
  observationText: string;
}

export default function RubricScorer({ categoryScores, onScoresChange, observationText }: RubricScorerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleScoreChange = (categoryName: string, newScore: number) => {
    const updatedScores = categoryScores.map(score => 
      score.category === categoryName 
        ? { ...score, score: newScore, isAutoSuggested: false }
        : score
    );
    onScoresChange(updatedScores);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score >= 3) return 'bg-blue-500';
    if (score >= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Developing';
    return 'Needs Support';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Category Assessment
      </h3>
      
      {OBSERVATION_CATEGORIES.map(category => {
        const currentScore = categoryScores.find(score => score.category === category.name);
        const score = currentScore?.score || 0;
        const isAutoSuggested = currentScore?.isAutoSuggested || false;
        const scoringCriteria = getScoringCriteria(category.name);
        
        return (
          <div key={category.name} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {category.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {category.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isAutoSuggested && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    AI Suggested
                  </span>
                )}
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  {expandedCategory === category.name ? '−' : '+'}
                </button>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Score:
              </span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(scoreOption => (
                  <button
                    key={scoreOption}
                    onClick={() => handleScoreChange(category.name, scoreOption)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      score === scoreOption
                        ? `${getScoreColor(scoreOption)} text-white`
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {scoreOption}
                  </button>
                ))}
              </div>
              {score > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  score >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  score >= 3 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  score >= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {getScoreLabel(score)}
                </span>
              )}
            </div>

            {/* Expanded Criteria */}
            {expandedCategory === category.name && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Scoring Criteria
                </h5>
                <div className="space-y-2">
                  {scoringCriteria.map(criteria => (
                    <div key={criteria.score} className="flex items-start space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        score === criteria.score
                          ? `${getScoreColor(criteria.score)} text-white`
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {criteria.score}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {criteria.description}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {criteria.indicators.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 