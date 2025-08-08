'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";

export default function Home() {
  const [currentTime, setCurrentTime] = useState('');
  const [teacherName, setTeacherName] = useState('Teacher'); // Would come from auth context

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    
    // Mock teacher name - would come from authentication
    setTeacherName('Ms. Johnson');

    return () => clearInterval(timer);
  }, []);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Ready to capture today's magical moments?",
      "Every observation makes a difference 💫",
      "Let's celebrate your students' growth today!",
      "Your caring attention shapes young minds ✨",
      "Ready to discover what amazing things happen today?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      {/* Header with teacher greeting */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">✨</span>
              </div>
              <div>
                <h1 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentTime}
                </h1>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Classroom Companion
                </p>
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">{teacherName.charAt(0)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-5 pt-6 pb-24">
        {/* Warm greeting section */}
        <div className="text-center mb-8">
          {/* Friendly illustration */}
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-200 to-orange-300 rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">👋</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {getTimeBasedGreeting()}, {teacherName.split(' ')[1] || teacherName}!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Quick mood check */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl p-5 mb-6 shadow-lg border border-white/50">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            How&apos;s your class feeling today? 
          </h3>
          <div className="flex justify-between">
            <button className="flex flex-col items-center p-3 rounded-2xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
              <span className="text-2xl mb-1">😊</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Happy</span>
            </button>
            <button className="flex flex-col items-center p-3 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <span className="text-2xl mb-1">🤔</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Focused</span>
            </button>
            <button className="flex flex-col items-center p-3 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <span className="text-2xl mb-1">🌟</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Energetic</span>
            </button>
            <button className="flex flex-col items-center p-3 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <span className="text-2xl mb-1">😴</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Calm</span>
            </button>
          </div>
        </div>

        {/* Main actions with warm, human language */}
        <div className="space-y-4 mb-8">
          <Link 
            href="/assessments/new"
            className="block bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">🎤 Capture a Moment</h3>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Notice a spark in a student? Record it now!
                </p>
              </div>
              <div className="w-14 h-14 bg-emerald-400 rounded-2xl flex items-center justify-center ml-4">
                <span className="text-2xl">✨</span>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard"
            className="block bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">📈 See Growth Patterns</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Watch how your students are blooming over time
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-400 rounded-2xl flex items-center justify-center ml-4">
                <span className="text-2xl">🌱</span>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/students"
              className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-white/50 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl text-white">👥</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Your Students</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                  Browse and add personal notes
                </p>
              </div>
            </Link>

            <Link 
              href="/reports"
              className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-white/50 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl text-white">📖</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Growth Stories</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                  Share-ready parent summaries
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Today's highlights */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Today&apos;s Bright Moments ✨
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="w-8 h-8 bg-green-200 dark:bg-green-700 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-green-700 dark:text-green-300 text-sm">🌟</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Sarah showed amazing teamwork today!
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Math group project • 2 hours ago
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <div className="w-8 h-8 bg-blue-200 dark:bg-blue-700 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-700 dark:text-blue-300 text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Mike asked thoughtful questions in science
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Voice note recorded • 4 hours ago
                </p>
              </div>
            </div>

            <button className="w-full text-center py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              View all moments →
            </button>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <Link 
        href="/assessments/new"
        className="fixed bottom-20 right-6 w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200"
      >
        <span className="text-white text-2xl font-bold">+</span>
      </Link>

      {/* Bottom Navigation - warmer design */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <Link 
              href="/"
              className="flex flex-col items-center py-2 px-4 text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-2xl"
            >
              <span className="text-xl mb-1">🏠</span>
              <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link 
              href="/assessments"
              className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-2xl transition-colors"
            >
              <span className="text-xl mb-1">📝</span>
              <span className="text-xs font-medium">Moments</span>
            </Link>
            <Link 
              href="/dashboard"
              className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-2xl transition-colors"
            >
              <span className="text-xl mb-1">🌱</span>
              <span className="text-xs font-medium">Growth</span>
            </Link>
            <Link 
              href="/students"
              className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-2xl transition-colors"
            >
              <span className="text-xl mb-1">💝</span>
              <span className="text-xs font-medium">Students</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
