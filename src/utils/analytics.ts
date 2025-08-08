import { ObservationLog, CategoryScore } from '@/types';

export interface TrendData {
  period: string;
  scores: { [category: string]: number };
  totalObservations: number;
}

export interface PeerComparison {
  studentId: string;
  studentName: string;
  categoryAverages: { [category: string]: number };
  percentile: { [category: string]: number };
  overallPercentile: number;
}

export interface InterventionAlert {
  studentId: string;
  studentName: string;
  alertType: 'decline' | 'threshold' | 'improvement';
  category: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  score: number;
  threshold: number;
  trend: number;
}

export interface Recommendation {
  studentId: string;
  studentName: string;
  category: string;
  recommendation: string;
  activity: string;
  resources: string[];
  priority: 'low' | 'medium' | 'high';
}

// Trend Analysis Functions
export function calculateTrends(logs: ObservationLog[], studentId?: string): TrendData[] {
  const filteredLogs = studentId 
    ? logs.filter(log => log.studentId === studentId)
    : logs;

  const weeklyData = new Map<string, { [category: string]: number[] }>();
  const monthlyData = new Map<string, { [category: string]: number[] }>();

  filteredLogs.forEach(log => {
    const date = new Date(log.timestamp);
    const weekKey = getWeekKey(date);
    const monthKey = getMonthKey(date);

    // Initialize if not exists
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {});
    }
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {});
    }

    // Add category scores
    if (log.categories) {
      log.categories.forEach(categoryScore => {
        const category = categoryScore.category;
        
        // Weekly data
        if (!weeklyData.get(weekKey)![category]) {
          weeklyData.get(weekKey)![category] = [];
        }
        weeklyData.get(weekKey)![category].push(categoryScore.score);

        // Monthly data
        if (!monthlyData.get(monthKey)![category]) {
          monthlyData.get(monthKey)![category] = [];
        }
        monthlyData.get(monthKey)![category].push(categoryScore.score);
      });
    }
  });

  // Convert to trend data
  const weeklyTrends: TrendData[] = Array.from(weeklyData.entries()).map(([period, scores]) => ({
    period,
    scores: Object.fromEntries(
      Object.entries(scores).map(([category, scoreArray]) => [
        category,
        scoreArray.length > 0 ? scoreArray.reduce((a, b) => a + b, 0) / scoreArray.length : 0
      ])
    ),
    totalObservations: Object.values(scores).reduce((sum, arr) => sum + arr.length, 0)
  }));

  const monthlyTrends: TrendData[] = Array.from(monthlyData.entries()).map(([period, scores]) => ({
    period,
    scores: Object.fromEntries(
      Object.entries(scores).map(([category, scoreArray]) => [
        category,
        scoreArray.length > 0 ? scoreArray.reduce((a, b) => a + b, 0) / scoreArray.length : 0
      ])
    ),
    totalObservations: Object.values(scores).reduce((sum, arr) => sum + arr.length, 0)
  }));

  return [...weeklyTrends, ...monthlyTrends].sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
}

// Peer Comparison Functions
export function calculatePeerComparison(logs: ObservationLog[]): PeerComparison[] {
  const studentMap = new Map<string, { scores: { [category: string]: number[] }, name: string }>();

  // Collect all student scores
  logs.forEach(log => {
    if (!studentMap.has(log.studentId)) {
      studentMap.set(log.studentId, { scores: {}, name: log.studentName });
    }

    if (log.categories) {
      log.categories.forEach(categoryScore => {
        const category = categoryScore.category;
        if (!studentMap.get(log.studentId)!.scores[category]) {
          studentMap.get(log.studentId)!.scores[category] = [];
        }
        studentMap.get(log.studentId)!.scores[category].push(categoryScore.score);
      });
    }
  });

  // Calculate averages for each student
  const studentAverages: PeerComparison[] = Array.from(studentMap.entries()).map(([studentId, data]) => {
    const categoryAverages: { [category: string]: number } = {};
    Object.entries(data.scores).forEach(([category, scores]) => {
      categoryAverages[category] = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
    });

    return {
      studentId,
      studentName: data.name,
      categoryAverages,
      percentile: {},
      overallPercentile: 0
    };
  });

  // Calculate percentiles
  const categories = ['Cognitive Skills', 'Social Skills', 'Emotional Readiness', 'Communication', 'Creativity'];
  
  categories.forEach(category => {
    const scores = studentAverages
      .map(s => s.categoryAverages[category])
      .filter(score => score > 0)
      .sort((a, b) => a - b);

    studentAverages.forEach(student => {
      const score = student.categoryAverages[category];
      if (score > 0) {
        const rank = scores.findIndex(s => s >= score);
        student.percentile[category] = Math.round(((rank + 1) / scores.length) * 100);
      } else {
        student.percentile[category] = 0;
      }
    });
  });

  // Calculate overall percentile
  studentAverages.forEach(student => {
    const validPercentiles = Object.values(student.percentile).filter(p => p > 0);
    student.overallPercentile = validPercentiles.length > 0 
      ? Math.round(validPercentiles.reduce((a, b) => a + b, 0) / validPercentiles.length)
      : 0;
  });

  return studentAverages.sort((a, b) => b.overallPercentile - a.overallPercentile);
}

// Intervention Alert Functions
export function generateInterventionAlerts(logs: ObservationLog[]): InterventionAlert[] {
  const alerts: InterventionAlert[] = [];
  const studentMap = new Map<string, ObservationLog[]>();

  // Group logs by student
  logs.forEach(log => {
    if (!studentMap.has(log.studentId)) {
      studentMap.set(log.studentId, []);
    }
    studentMap.get(log.studentId)!.push(log);
  });

  studentMap.forEach((studentLogs, studentId) => {
    const studentName = studentLogs[0].studentName;
    const categories = ['Cognitive Skills', 'Social Skills', 'Emotional Readiness', 'Communication', 'Creativity'];

    categories.forEach(category => {
      const categoryLogs = studentLogs.filter(log => 
        log.categories?.some(cat => cat.category === category)
      );

      if (categoryLogs.length >= 3) {
        const scores = categoryLogs
          .flatMap(log => log.categories?.filter(cat => cat.category === category) || [])
          .map(cat => cat.score)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        // Check for decline
        if (scores.length >= 3) {
          const recentScores = scores.slice(-3);
          const olderScores = scores.slice(-6, -3);
          
          if (olderScores.length > 0) {
            const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
            const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
            const decline = olderAvg - recentAvg;

            if (decline > 0.5) {
              alerts.push({
                studentId,
                studentName,
                alertType: 'decline',
                category,
                severity: decline > 1 ? 'high' : decline > 0.7 ? 'medium' : 'low',
                message: `${category} scores have declined by ${decline.toFixed(1)} points`,
                score: recentAvg,
                threshold: olderAvg,
                trend: decline
              });
            }
          }
        }

        // Check for low scores
        const currentScore = scores[scores.length - 1];
        if (currentScore < 2.5) {
          alerts.push({
            studentId,
            studentName,
            alertType: 'threshold',
            category,
            severity: currentScore < 1.5 ? 'high' : currentScore < 2 ? 'medium' : 'low',
            message: `${category} score is below threshold (${currentScore}/5)`,
            score: currentScore,
            threshold: 2.5,
            trend: 0
          });
        }
      }
    });
  });

  return alerts.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

// Recommendation Functions
export function generateRecommendations(logs: ObservationLog[], alerts: InterventionAlert[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const recommendationMap = getRecommendationMap();

  alerts.forEach(alert => {
    const categoryRecommendations = recommendationMap[alert.category] || [];
    
    categoryRecommendations.forEach(rec => {
      if (alert.score <= rec.maxScore && alert.score >= rec.minScore) {
        recommendations.push({
          studentId: alert.studentId,
          studentName: alert.studentName,
          category: alert.category,
          recommendation: rec.recommendation,
          activity: rec.activity,
          resources: rec.resources,
          priority: alert.severity
        });
      }
    });
  });

  return recommendations;
}

// Helper Functions
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

function getRecommendationMap() {
  return {
    'Cognitive Skills': [
      {
        minScore: 1,
        maxScore: 2,
        recommendation: 'Focus on foundational problem-solving skills',
        activity: 'One-on-one problem-solving sessions',
        resources: ['Math manipulatives', 'Logic puzzles', 'Step-by-step guides']
      },
      {
        minScore: 2,
        maxScore: 3,
        recommendation: 'Build critical thinking through guided activities',
        activity: 'Small group problem-solving activities',
        resources: ['Brain teasers', 'Strategy games', 'Discussion prompts']
      }
    ],
    'Social Skills': [
      {
        minScore: 1,
        maxScore: 2,
        recommendation: 'Develop basic social interaction skills',
        activity: 'Structured group activities with clear roles',
        resources: ['Social stories', 'Role-playing scenarios', 'Team building games']
      },
      {
        minScore: 2,
        maxScore: 3,
        recommendation: 'Enhance collaboration and communication',
        activity: 'Partner and small group projects',
        resources: ['Collaborative games', 'Communication exercises', 'Peer mentoring']
      }
    ],
    'Emotional Readiness': [
      {
        minScore: 1,
        maxScore: 2,
        recommendation: 'Build emotional awareness and regulation',
        activity: 'Mindfulness and emotional literacy activities',
        resources: ['Emotion cards', 'Breathing exercises', 'Calm-down strategies']
      },
      {
        minScore: 2,
        maxScore: 3,
        recommendation: 'Strengthen resilience and self-confidence',
        activity: 'Goal-setting and achievement activities',
        resources: ['Confidence-building exercises', 'Growth mindset activities', 'Success journals']
      }
    ],
    'Communication': [
      {
        minScore: 1,
        maxScore: 2,
        recommendation: 'Develop basic communication skills',
        activity: 'Structured speaking and listening activities',
        resources: ['Picture cards', 'Sentence starters', 'Listening games']
      },
      {
        minScore: 2,
        maxScore: 3,
        recommendation: 'Enhance verbal and non-verbal communication',
        activity: 'Presentation and discussion activities',
        resources: ['Public speaking exercises', 'Body language activities', 'Active listening practice']
      }
    ],
    'Creativity': [
      {
        minScore: 1,
        maxScore: 2,
        recommendation: 'Encourage creative expression and imagination',
        activity: 'Open-ended art and creative projects',
        resources: ['Art supplies', 'Creative prompts', 'Imagination games']
      },
      {
        minScore: 2,
        maxScore: 3,
        recommendation: 'Foster innovative thinking and originality',
        activity: 'Creative problem-solving challenges',
        resources: ['Innovation challenges', 'Creative thinking exercises', 'Design thinking activities']
      }
    ]
  };
} 