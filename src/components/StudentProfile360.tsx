'use client';

import React, { useState, useEffect } from 'react';
import { get360StudentProfile, IntegratedStudentData } from '../utils/systemIntegration';
import { sentimentAnalyzer } from '../utils/sentimentAnalyzer';

interface StudentProfile360Props {
  studentId: string;
  studentName?: string;
  onClose?: () => void;
}

interface ProfileData extends IntegratedStudentData {
  correlationInsights: any;
  summary: {
    academicTrend: 'improving' | 'stable' | 'declining';
    behaviorTrend: 'positive' | 'stable' | 'concerning';
    attendanceTrend: 'excellent' | 'good' | 'concerning';
    overallRisk: 'low' | 'medium' | 'high';
  };
}

export default function StudentProfile360({ studentId, studentName, onClose }: StudentProfile360Props) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'behavior' | 'attendance' | 'insights'>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
  }, [studentId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize required services
      await sentimentAnalyzer.initialize();
      
      const data = await get360StudentProfile(studentId);
      setProfileData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student profile');
      console.error('Failed to load 360° student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving' || trend === 'positive' || trend === 'excellent') {
      return '📈';
    }
    if (trend === 'declining' || trend === 'concerning') {
      return '📉';
    }
    return '➡️';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateRecentAverage = (scores: any[]) => {
    if (scores.length === 0) return 0;
    const recent = scores.slice(-5);
    return recent.reduce((sum, item) => {
      if (item.scores) {
        const values = Object.values(item.scores) as number[];
        return sum + values.reduce((a, b) => a + b, 0) / values.length;
      }
      return sum + (item.percentage || item.score || 0);
    }, 0) / recent.length;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg">Loading 360° Profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <button
                onClick={loadProfileData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{studentName || 'Student'} - 360° Profile</h2>
            <p className="text-blue-100">Comprehensive Student Overview</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(profileData.summary.overallRisk)}`}>
              Risk Level: {profileData.summary.overallRisk.toUpperCase()}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-700 rounded-lg p-2"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: '📊 Overview', count: '' },
              { key: 'academic', label: '📚 Academic', count: `(${profileData.examResults.length})` },
              { key: 'behavior', label: '👥 Behavior', count: `(${profileData.observations.length})` },
              { key: 'attendance', label: '📅 Attendance', count: `(${profileData.attendanceRecords.length})` },
              { key: 'insights', label: '🔍 Insights', count: '' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Academic Trend</p>
                      <p className="text-xl font-bold text-blue-800">
                        {getTrendIcon(profileData.summary.academicTrend)} {profileData.summary.academicTrend}
                      </p>
                    </div>
                    <div className="text-2xl">📚</div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Behavior Trend</p>
                      <p className="text-xl font-bold text-green-800">
                        {getTrendIcon(profileData.summary.behaviorTrend)} {profileData.summary.behaviorTrend}
                      </p>
                    </div>
                    <div className="text-2xl">👥</div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Attendance</p>
                      <p className="text-xl font-bold text-purple-800">
                        {getTrendIcon(profileData.summary.attendanceTrend)} {profileData.summary.attendanceTrend}
                      </p>
                    </div>
                    <div className="text-2xl">📅</div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {profileData.examResults.length > 0 
                        ? Math.round(calculateRecentAverage(profileData.examResults))
                        : 'N/A'}%
                    </div>
                    <div className="text-sm text-gray-600">Recent Exam Average</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {profileData.observations.length > 0 
                        ? calculateRecentAverage(profileData.observations).toFixed(1)
                        : 'N/A'}/5
                    </div>
                    <div className="text-sm text-gray-600">Behavior Score</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {profileData.attendanceRecords.length > 0
                        ? Math.round((profileData.attendanceRecords.filter(r => r.status === 'present').length / profileData.attendanceRecords.length) * 100)
                        : 'N/A'}%
                    </div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {profileData.learningPlatformProgress.length > 0
                        ? Math.round(profileData.learningPlatformProgress.reduce((sum, lp) => sum + lp.completionPercentage, 0) / profileData.learningPlatformProgress.length)
                        : 'N/A'}%
                    </div>
                    <div className="text-sm text-gray-600">Digital Learning</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity Timeline</h3>
                <div className="space-y-3">
                  {profileData.observations.slice(-3).map((obs, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Classroom Observation</p>
                        <p className="text-xs text-gray-600">{formatDate(new Date(obs.timestamp).toISOString())}</p>
                      </div>
                      <div className="text-sm font-medium">
                        {Object.values(obs.scores).reduce((a, b) => (a as number) + (b as number), 0) / Object.keys(obs.scores).length}/5
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Academic Performance</h3>
                <div className="text-sm text-gray-600">
                  Last updated: {formatDate(profileData.lastUpdated)}
                </div>
              </div>

              {profileData.examResults.length > 0 ? (
                <div className="grid gap-4">
                  {profileData.examResults.map((exam, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{exam.examName}</h4>
                          <p className="text-sm text-gray-600">{exam.subject}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{exam.percentage}%</div>
                          <div className="text-sm text-gray-600">Grade: {exam.grade}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {formatDate(exam.dateAdministered)} • {exam.teacher}
                      </div>
                      {exam.skillAreas && exam.skillAreas.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Skill Breakdown:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {exam.skillAreas.map((skill, skillIndex) => (
                              <div key={skillIndex} className="text-sm">
                                <span className="font-medium">{skill.area}:</span> {skill.score}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {exam.feedback && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                          <strong>Feedback:</strong> {exam.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <p>No exam results available</p>
                </div>
              )}

              {/* Learning Platform Progress */}
              {profileData.learningPlatformProgress.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">Digital Learning Progress</h4>
                  <div className="grid gap-4">
                    {profileData.learningPlatformProgress.map((lp, index) => (
                      <div key={index} className="bg-white border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium">{lp.courseName}</h5>
                            <p className="text-sm text-gray-600">{lp.platformName}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{lp.completionPercentage}%</div>
                            <div className="text-sm text-gray-600">{lp.timeSpent}min</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${lp.completionPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Last accessed: {formatDate(lp.lastAccessed)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Behavior Observations</h3>
                <div className="text-sm text-gray-600">
                  Total observations: {profileData.observations.length}
                </div>
              </div>

              {profileData.observations.length > 0 ? (
                <div className="grid gap-4">
                  {profileData.observations.slice().reverse().map((obs, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm text-gray-600">
                          {formatDate(new Date(obs.timestamp).toISOString())}
                        </div>
                        <div className="flex space-x-2">
                          {Object.entries(obs.scores).map(([category, score]) => (
                            <span key={category} className="px-2 py-1 bg-gray-100 rounded text-sm">
                              {category}: {score}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-gray-800 mb-3">{obs.observation}</p>
                      
                      {obs.tags && obs.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {obs.tags.map((tag: string, tagIndex: number) => (
                            <span key={tagIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {obs.sentiment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">Sentiment Analysis:</span>
                            <span className={`px-2 py-1 rounded text-sm ${
                              obs.sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                              obs.sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {obs.sentiment.sentiment} ({Math.round(obs.sentiment.confidence * 100)}%)
                            </span>
                          </div>
                          {obs.sentiment.behaviorInsights && obs.sentiment.behaviorInsights.length > 0 && (
                            <div className="text-sm">
                              <strong>Insights:</strong> {obs.sentiment.behaviorInsights.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p>No behavior observations available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Attendance Records</h3>
                <div className="text-sm text-gray-600">
                  Total records: {profileData.attendanceRecords.length}
                </div>
              </div>

              {profileData.attendanceRecords.length > 0 ? (
                <>
                  {/* Attendance Summary */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Attendance Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {profileData.attendanceRecords.filter(r => r.status === 'present').length}
                        </div>
                        <div className="text-sm text-gray-600">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {profileData.attendanceRecords.filter(r => r.status === 'absent').length}
                        </div>
                        <div className="text-sm text-gray-600">Absent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {profileData.attendanceRecords.filter(r => r.status === 'late').length}
                        </div>
                        <div className="text-sm text-gray-600">Late</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round((profileData.attendanceRecords.filter(r => r.status === 'present').length / profileData.attendanceRecords.length) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Recent Records</h4>
                    <div className="space-y-2">
                      {profileData.attendanceRecords.slice(-10).reverse().map((record, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              record.status === 'present' ? 'bg-green-500' :
                              record.status === 'absent' ? 'bg-red-500' :
                              record.status === 'late' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}></div>
                            <span className="font-medium">{formatDate(record.date)}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium capitalize">{record.status}</div>
                            {record.arrivalTime && (
                              <div className="text-sm text-gray-600">{record.arrivalTime}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📅</div>
                  <p>No attendance records available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Data Insights & Correlations</h3>

              {/* Correlation Analysis */}
              <div className="grid gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Performance Correlations</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Exam vs Classroom Behavior</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.abs(profileData.correlationInsights.examObservationCorrelation) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">
                          {(profileData.correlationInsights.examObservationCorrelation * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Attendance vs Performance</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${Math.abs(profileData.correlationInsights.attendancePerformanceCorrelation) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">
                          {(profileData.correlationInsights.attendancePerformanceCorrelation * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Digital vs Classroom Learning</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full" 
                            style={{ width: `${Math.abs(profileData.correlationInsights.digitalLearningClassroomCorrelation) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">
                          {(profileData.correlationInsights.digitalLearningClassroomCorrelation * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Key Insights</h4>
                  {profileData.correlationInsights.insights.length > 0 ? (
                    <div className="space-y-2">
                      {profileData.correlationInsights.insights.map((insight: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                          <div className="text-blue-500 mt-1">💡</div>
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No specific insights available at this time.</p>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {profileData.summary.overallRisk === 'high' && (
                      <div className="flex items-start space-x-2 p-2 bg-red-50 rounded">
                        <div className="text-red-500 mt-1">⚠️</div>
                        <p className="text-sm">High risk student - consider immediate intervention and support.</p>
                      </div>
                    )}
                    
                    {profileData.summary.academicTrend === 'declining' && (
                      <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                        <div className="text-yellow-500 mt-1">📉</div>
                        <p className="text-sm">Academic performance declining - consider additional tutoring or support.</p>
                      </div>
                    )}
                    
                    {profileData.summary.attendanceTrend === 'concerning' && (
                      <div className="flex items-start space-x-2 p-2 bg-orange-50 rounded">
                        <div className="text-orange-500 mt-1">📅</div>
                        <p className="text-sm">Attendance issues detected - follow up with family and counselor.</p>
                      </div>
                    )}
                    
                    {profileData.summary.behaviorTrend === 'positive' && (
                      <div className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                        <div className="text-green-500 mt-1">🌟</div>
                        <p className="text-sm">Excellent behavior trend - consider leadership opportunities.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Data last updated: {formatDate(profileData.lastUpdated)}</span>
            <div className="space-x-4">
              <button
                onClick={loadProfileData}
                className="text-blue-600 hover:text-blue-800"
              >
                🔄 Refresh Data
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}