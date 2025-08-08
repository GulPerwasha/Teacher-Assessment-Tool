'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ObservationLog, Student, CATEGORY_NAMES } from '@/types';
import { 
  calculateTrends, 
  calculatePeerComparison, 
  generateInterventionAlerts, 
  generateRecommendations,
  type TrendData,
  type PeerComparison,
  type InterventionAlert,
  type Recommendation
} from '@/utils/analytics';
import { generateDummyData } from '@/utils/dummyData';
import TrendChart from '@/components/TrendChart';
import PeerComparisonComponent from '@/components/PeerComparison';
import InterventionAlerts from '@/components/InterventionAlerts';
import Recommendations from '@/components/Recommendations';

interface StudentProgress {
  studentId: string;
  studentName: string;
  categoryAverages: { [category: string]: number };
  recentScores: { [category: string]: number[] };
  totalObservations: number;
  lastObservation: string;
}

export default function TeacherDashboard() {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [peerComparisons, setPeerComparisons] = useState<PeerComparison[]>([]);
  const [alerts, setAlerts] = useState<InterventionAlert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'comparison' | 'alerts' | 'recommendations'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Load logs from localStorage and automatically populate dummy data if needed
  useEffect(() => {
    const loadData = () => {
      try {
        const savedLogs = localStorage.getItem('observationLogs');
        let parsedLogs: ObservationLog[] = [];
        
        if (savedLogs) {
          parsedLogs = JSON.parse(savedLogs);
        }
        
        // If no data exists or data is empty, automatically populate with dummy data
        if (!parsedLogs || parsedLogs.length === 0) {
          console.log('No data found, automatically generating demo data...');
          const dummyData = generateDummyData();
          localStorage.setItem('observationLogs', JSON.stringify(dummyData));
          setLogs(dummyData);
        } else {
          setLogs(parsedLogs);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // If there's an error, generate dummy data
        const dummyData = generateDummyData();
        localStorage.setItem('observationLogs', JSON.stringify(dummyData));
        setLogs(dummyData);
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Calculate all analytics when logs change
  useEffect(() => {
    if (logs.length === 0) return;

    // Calculate trends
    const trendData = calculateTrends(logs, selectedStudent);
    setTrends(trendData);

    // Calculate peer comparisons
    const comparisonData = calculatePeerComparison(logs);
    setPeerComparisons(comparisonData);

    // Generate alerts
    const alertData = generateInterventionAlerts(logs);
    setAlerts(alertData);

    // Generate recommendations
    const recommendationData = generateRecommendations(logs, alertData);
    setRecommendations(recommendationData);

    // Calculate student progress
    const studentMap = new Map<string, StudentProgress>();

    logs.forEach(log => {
      if (!studentMap.has(log.studentId)) {
        studentMap.set(log.studentId, {
          studentId: log.studentId,
          studentName: log.studentName,
          categoryAverages: {},
          recentScores: {},
          totalObservations: 0,
          lastObservation: log.timestamp
        });
      }

      const student = studentMap.get(log.studentId)!;
      student.totalObservations++;
      
      if (new Date(log.timestamp) > new Date(student.lastObservation)) {
        student.lastObservation = log.timestamp;
      }

      // Process category scores
      if (log.categories) {
        log.categories.forEach(categoryScore => {
          const category = categoryScore.category;
          
          // Initialize arrays if they don't exist
          if (!student.recentScores[category]) {
            student.recentScores[category] = [];
          }
          
          student.recentScores[category].push(categoryScore.score);
        });
      }
    });

    // Calculate averages
    studentMap.forEach(student => {
      CATEGORY_NAMES.forEach(category => {
        const scores = student.recentScores[category] || [];
        if (scores.length > 0) {
          student.categoryAverages[category] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        } else {
          student.categoryAverages[category] = 0;
        }
      });
    });

    setStudentProgress(Array.from(studentMap.values()));
  }, [logs, selectedStudent]);

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

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-blue-600 dark:text-blue-400';
    if (score >= 2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score >= 3) return 'bg-blue-500';
    if (score >= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getTrendIcon = (scores: number[]) => {
    if (scores.length < 2) return '➖';
    const recent = scores.slice(-3);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = scores.slice(-6, -3);
    const previousAverage = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : average;
    
    if (average > previousAverage + 0.5) return '📈';
    if (average < previousAverage - 0.5) return '📉';
    return '➖';
  };

  const filteredStudents = selectedStudent 
    ? studentProgress.filter(s => s.studentId === selectedStudent)
    : studentProgress;

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => `${alert.studentId}-${alert.category}` !== alertId));
  };

  const handleDismissRecommendation = (recommendationId: string) => {
    setRecommendations(prev => prev.filter(rec => `${rec.studentId}-${rec.category}` !== recommendationId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">←</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Dashboard</span>
            </Link>
            <Link 
              href="/assessments/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg mb-6">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'trends', label: 'Trends', icon: '📈' },
              { id: 'comparison', label: 'Comparison', icon: '👥' },
              { id: 'alerts', label: 'Alerts', icon: '🚨' },
              { id: 'recommendations', label: 'Recommendations', icon: '💡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="text-lg mb-1">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {studentProgress.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Students Tracked
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {logs.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total Observations
                </div>
              </div>
            </div>

            {/* Quick Alerts Summary */}
            {alerts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Alerts
                </h3>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500">🚨</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.studentName}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.category}
                      </span>
                    </div>
                  ))}
                </div>
                {alerts.length > 3 && (
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="w-full mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium"
                  >
                    View all {alerts.length} alerts →
                  </button>
                )}
              </div>
            )}

            {/* Student Progress Cards */}
            <div className="space-y-4">
              {filteredStudents.map(student => (
                <div key={student.studentId} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {student.studentName}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {student.totalObservations} observation{student.totalObservations !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {student.studentName.charAt(0)}
                      </span>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="space-y-3">
                    {CATEGORY_NAMES.map(category => {
                      const score = student.categoryAverages[category] || 0;
                      const scores = student.recentScores[category] || [];
                      const trendIcon = getTrendIcon(scores);
                      
                      if (score === 0) return null;
                      
                      return (
                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`}></div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {category}
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map(scoreOption => (
                                    <div
                                      key={scoreOption}
                                      className={`w-2 h-2 rounded-full ${
                                        scoreOption <= score ? getProgressColor(score) : 'bg-gray-300 dark:bg-gray-600'
                                      }`}
                                    ></div>
                                  ))}
                                </div>
                                <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                                  {score.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{trendIcon}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {scores.length} scores
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedStudent(student.studentId);
                        setActiveTab('trends');
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-blue-700"
                    >
                      View Trends
                    </button>
                    <Link 
                      href={`/assessments/new?student=${student.studentId}`}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Add Observation
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Progress Trends
              </h3>
              <TrendChart trends={trends} studentName={selectedStudent ? studentProgress.find(s => s.studentId === selectedStudent)?.studentName : undefined} />
            </div>
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <PeerComparisonComponent 
              comparisons={peerComparisons} 
              selectedStudent={selectedStudent}
              onStudentSelect={setSelectedStudent}
            />
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <InterventionAlerts alerts={alerts} onDismiss={handleDismissAlert} />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <Recommendations recommendations={recommendations} onDismiss={handleDismissRecommendation} />
          </div>
        )}
      </div>
    </div>
  );
} 