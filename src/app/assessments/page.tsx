'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ObservationLog } from '@/types';

export default function AssessmentsList() {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ObservationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Load logs from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('observationLogs');
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs);
      setLogs(parsedLogs);
      setFilteredLogs(parsedLogs);
    }
  }, []);

  // Filter logs based on search term, student, tag, and category
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.observation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStudent) {
      filtered = filtered.filter(log => log.studentId === selectedStudent);
    }

    if (selectedTag) {
      filtered = filtered.filter(log => log.tags.includes(selectedTag));
    }

    if (selectedCategory) {
      filtered = filtered.filter(log => 
        log.categories && log.categories.some(cat => cat.category === selectedCategory)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedStudent, selectedTag, selectedCategory]);

  const deleteLog = (logId: string) => {
    if (confirm('Are you sure you want to delete this observation?')) {
      const updatedLogs = logs.filter(log => log.id !== logId);
      setLogs(updatedLogs);
      localStorage.setItem('observationLogs', JSON.stringify(updatedLogs));
    }
  };

  const getUniqueStudents = () => {
    const students = logs.map(log => ({ id: log.studentId, name: log.studentName }));
    return students.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id)
    );
  };

  const getUniqueTags = () => {
    const allTags = logs.flatMap(log => log.tags);
    return [...new Set(allTags)];
  };

  const getUniqueCategories = () => {
    const allCategories = logs.flatMap(log => log.categories || []).map(cat => cat.category);
    return [...new Set(allCategories)];
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">←</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">All Observations</span>
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
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search & Filter
          </h2>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by student name or observation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Student Filter */}
          <div className="mb-4">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Students</option>
              {getUniqueStudents().map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div className="mb-4">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Tags</option>
              {getUniqueTags().map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedStudent || selectedTag || selectedCategory) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStudent('');
                setSelectedTag('');
                setSelectedCategory('');
              }}
              className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300">
            {filteredLogs.length} observation{filteredLogs.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Observations List */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No observations found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {logs.length === 0 
                  ? "Start by recording your first observation"
                  : "Try adjusting your search or filters"
                }
              </p>
              {logs.length === 0 && (
                <Link 
                  href="/assessments/new"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  Record First Observation
                </Link>
              )}
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {log.studentName}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </span>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                  {log.observation}
                </p>

                {/* Category Scores */}
                {log.categories && log.categories.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Category Scores:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {log.categories.map(category => (
                        <span 
                          key={category.category} 
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(category.category)}`}
                        >
                          {category.category}: {category.score}/5
                          {category.isAutoSuggested && (
                            <span className="ml-1">🤖</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {log.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 