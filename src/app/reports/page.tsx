'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ObservationLog {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  observation: string;
  tags: string[];
}

interface TagStats {
  tag: string;
  count: number;
  percentage: number;
}

interface StudentStats {
  studentId: string;
  studentName: string;
  observationCount: number;
  lastObservation: string;
}

export default function ReportsPage() {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [totalObservations, setTotalObservations] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  // Load logs from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('observationLogs');
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs);
      setLogs(parsedLogs);
    }
  }, []);

  // Calculate statistics
  useEffect(() => {
    if (logs.length === 0) return;

    // Calculate tag statistics
    const tagCounts: { [key: string]: number } = {};
    logs.forEach(log => {
      log.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const tagStatsArray: TagStats[] = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / logs.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    setTagStats(tagStatsArray);

    // Calculate student statistics
    const studentCounts: { [key: string]: { count: number; name: string; lastObservation: string } } = {};
    logs.forEach(log => {
      if (!studentCounts[log.studentId]) {
        studentCounts[log.studentId] = {
          count: 0,
          name: log.studentName,
          lastObservation: log.timestamp
        };
      }
      studentCounts[log.studentId].count++;
      if (new Date(log.timestamp) > new Date(studentCounts[log.studentId].lastObservation)) {
        studentCounts[log.studentId].lastObservation = log.timestamp;
      }
    });

    const studentStatsArray: StudentStats[] = Object.entries(studentCounts)
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.name,
        observationCount: data.count,
        lastObservation: data.lastObservation
      }))
      .sort((a, b) => b.observationCount - a.observationCount);

    setStudentStats(studentStatsArray);
    setTotalObservations(logs.length);
    setTotalStudents(studentStatsArray.length);
  }, [logs]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getRecentObservations = () => {
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  const getObservationsByDate = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const observationsByDate = last7Days.map(date => ({
      date,
      count: logs.filter(log => log.timestamp.startsWith(date)).length
    }));

    return observationsByDate;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">←</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Reports & Insights</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {totalObservations}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Observations
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {totalStudents}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Students Tracked
            </div>
          </div>
        </div>

        {/* Most Common Tags */}
        {tagStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Most Common Tags
            </h2>
            <div className="space-y-3">
              {tagStats.slice(0, 5).map(stat => (
                <div key={stat.tag} className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {stat.tag}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Students */}
        {studentStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Most Observed Students
            </h2>
            <div className="space-y-3">
              {studentStats.slice(0, 5).map(student => (
                <div key={student.studentId} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {student.studentName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Last: {formatDate(student.lastObservation)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {student.observationCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      observations
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {logs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {getRecentObservations().map(log => (
                <div key={log.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {log.studentName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {log.observation}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link 
              href="/assessments/new"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-center font-medium hover:bg-blue-700"
            >
              Record New Observation
            </Link>
            <Link 
              href="/assessments"
              className="block w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg text-center font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              View All Observations
            </Link>
            <Link 
              href="/students"
              className="block w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg text-center font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Browse Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 