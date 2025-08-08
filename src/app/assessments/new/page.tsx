'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ObservationLog, CategoryScore, CATEGORY_NAMES } from '@/types';
import { processObservationText } from '@/utils/nlpProcessor';
import RubricScorer from '@/components/RubricScorer';

const PREDEFINED_TAGS = [
  'Attentive',
  'Needs Help', 
  'Problem-Solving',
  'Engaged',
  'Distracted',
  'Collaborative',
  'Independent',
  'Struggling'
];

const SAMPLE_STUDENTS = [
  { id: '1', name: 'Sarah Johnson' },
  { id: '2', name: 'Mike Chen' },
  { id: '3', name: 'Emma Davis' },
  { id: '4', name: 'Alex Rodriguez' },
  { id: '5', name: 'Jordan Smith' }
];

export default function NewAssessment() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [showRubric, setShowRubric] = useState(false);
  const [nlpSuggestions, setNlpSuggestions] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  // Load logs from localStorage on component mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('observationLogs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setObservation(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsListening(false);
      };
    }
  }, []);

  // Process observation text with NLP when it changes
  useEffect(() => {
    if (observation.trim().length > 10) {
      const nlpResult = processObservationText(observation);
      setCategoryScores(nlpResult.categoryScores);
      setNlpSuggestions(nlpResult.suggestions);
      setShowRubric(true);
    }
  }, [observation]);

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      setIsListening(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setStudentId(selectedId);
    const student = SAMPLE_STUDENTS.find(s => s.id === selectedId);
    setStudentName(student ? student.name : '');
  };

  const saveObservation = () => {
    if (!studentId || !observation.trim()) {
      alert('Please select a student and add an observation');
      return;
    }

    const newLog: ObservationLog = {
      id: Date.now().toString(),
      studentId,
      studentName,
      timestamp: new Date().toISOString(),
      observation: observation.trim(),
      tags: selectedTags,
      categories: categoryScores,
      nlpSuggestions
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('observationLogs', JSON.stringify(updatedLogs));

    // Reset form
    setStudentId('');
    setStudentName('');
    setObservation('');
    setSelectedTags([]);
    setCategoryScores([]);
    setNlpSuggestions([]);
    setShowRubric(false);
    
    alert('Observation saved successfully!');
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
              <span className="text-lg font-semibold text-gray-900 dark:text-white">New Assessment</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Student Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Student
          </h2>
          <select
            value={studentId}
            onChange={handleStudentChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a student...</option>
            {SAMPLE_STUDENTS.map(student => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Recording */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Record Observation
          </h2>
          
          {/* Voice Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
          </div>
          
          {isListening && (
            <div className="text-center text-sm text-blue-600 dark:text-blue-400 mb-4">
              Listening... Speak now
            </div>
          )}

          {/* Text Input */}
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Type or speak your observation here... (AI will analyze and suggest categories)"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* NLP Suggestions */}
        {nlpSuggestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              AI Suggestions
            </h2>
            <div className="space-y-2">
              {nlpSuggestions.map(suggestion => (
                <div key={suggestion.category} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(suggestion.category)}`}>
                      {suggestion.category}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Keywords: {suggestion.keywords.slice(0, 2).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Rubric Scoring */}
        {showRubric && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <RubricScorer
              categoryScores={categoryScores}
              onScoresChange={setCategoryScores}
              observationText={observation}
            />
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={saveObservation}
          disabled={!studentId || !observation.trim()}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Save Observation
        </button>

        {/* Recent Logs Preview */}
        {logs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Observations
            </h3>
            <div className="space-y-3">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {log.studentName}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    {log.observation}
                  </p>
                  {log.categories && log.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {log.categories.slice(0, 3).map(category => (
                        <span key={category.category} className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category.category)}`}>
                          {category.category}: {category.score}/5
                        </span>
                      ))}
                    </div>
                  )}
                  {log.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {logs.length > 3 && (
              <Link 
                href="/assessments"
                className="block text-center text-blue-600 dark:text-blue-400 mt-4 font-medium"
              >
                View all observations →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 