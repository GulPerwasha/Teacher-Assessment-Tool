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

interface Student {
  id: string;
  name: string;
  observationCount: number;
  lastObservation?: string;
  commonTags: string[];
}

export default function StudentsPage() {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load logs from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('observationLogs');
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs);
      setLogs(parsedLogs);
    }
  }, []);

  // Process students data
  useEffect(() => {
    const studentMap = new Map<string, Student>();
    
    logs.forEach(log => {
      if (!studentMap.has(log.studentId)) {
        studentMap.set(log.studentId, {
          id: log.studentId,
          name: log.studentName,
          observationCount: 0,
          commonTags: []
        });
      }
      
      const student = studentMap.get(log.studentId)!;
      student.observationCount++;
      
      if (!student.lastObservation || new Date(log.timestamp) > new Date(student.lastObservation)) {
        student.lastObservation = log.timestamp;
      }
      
      // Collect tags
      log.tags.forEach(tag => {
        if (!student.commonTags.includes(tag)) {
          student.commonTags.push(tag);
        }
      });
    });
    
    setStudents(Array.from(studentMap.values()));
  }, [logs]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStudentObservations = (studentId: string) => {
    return logs.filter(log => log.studentId === studentId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">←</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Students</span>
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
        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Students
          </h2>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Students List */}
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {students.length === 0 ? 'No students found' : 'No students match your search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {students.length === 0 
                  ? "Start by recording observations for students"
                  : "Try adjusting your search term"
                }
              </p>
              {students.length === 0 && (
                <Link 
                  href="/assessments/new"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  Record First Observation
                </Link>
              )}
            </div>
          ) : (
            filteredStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {student.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {student.observationCount} observation{student.observationCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {student.name.charAt(0)}
                    </span>
                  </div>
                </div>
                
                {student.lastObservation && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                    Last observation: {formatDate(student.lastObservation)}
                  </p>
                )}
                
                {student.commonTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {student.commonTags.slice(0, 3).map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {student.commonTags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                        +{student.commonTags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Link 
                    href={`/students/${student.id}`}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-blue-700"
                  >
                    View Details
                  </Link>
                  <Link 
                    href={`/assessments/new?student=${student.id}`}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Add Observation
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {students.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {students.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total Students
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {logs.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total Observations
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 