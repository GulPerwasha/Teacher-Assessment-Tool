import { ObservationLog, CategoryScore } from '@/types';

const SAMPLE_STUDENTS = [
  { id: '1', name: 'Sarah Johnson' },
  { id: '2', name: 'Mike Chen' },
  { id: '3', name: 'Emma Davis' },
  { id: '4', name: 'Alex Rodriguez' },
  { id: '5', name: 'Jordan Smith' },
  { id: '6', name: 'Sophia Williams' },
  { id: '7', name: 'Lucas Brown' },
  { id: '8', name: 'Olivia Garcia' }
];

const CATEGORIES = ['Cognitive Skills', 'Social Skills', 'Emotional Readiness', 'Communication', 'Creativity'];

// Generate realistic score patterns for different student types
function generateStudentPattern(studentId: string): { [category: string]: number[] } {
  const patterns = {
    '1': { // Sarah - High performer with slight decline
      'Cognitive Skills': [4.2, 4.1, 4.0, 3.8, 3.7, 3.5],
      'Social Skills': [4.5, 4.4, 4.3, 4.2, 4.1, 4.0],
      'Emotional Readiness': [4.0, 3.9, 3.8, 3.7, 3.6, 3.5],
      'Communication': [4.3, 4.2, 4.1, 4.0, 3.9, 3.8],
      'Creativity': [4.1, 4.0, 3.9, 3.8, 3.7, 3.6]
    },
    '2': { // Mike - Struggling student
      'Cognitive Skills': [2.1, 2.0, 1.9, 1.8, 1.7, 1.6],
      'Social Skills': [2.5, 2.4, 2.3, 2.2, 2.1, 2.0],
      'Emotional Readiness': [2.0, 1.9, 1.8, 1.7, 1.6, 1.5],
      'Communication': [2.3, 2.2, 2.1, 2.0, 1.9, 1.8],
      'Creativity': [2.8, 2.7, 2.6, 2.5, 2.4, 2.3]
    },
    '3': { // Emma - Improving student
      'Cognitive Skills': [2.5, 2.7, 2.9, 3.1, 3.3, 3.5],
      'Social Skills': [3.0, 3.2, 3.4, 3.6, 3.8, 4.0],
      'Emotional Readiness': [2.8, 3.0, 3.2, 3.4, 3.6, 3.8],
      'Communication': [2.9, 3.1, 3.3, 3.5, 3.7, 3.9],
      'Creativity': [3.2, 3.4, 3.6, 3.8, 4.0, 4.2]
    },
    '4': { // Alex - Consistent performer
      'Cognitive Skills': [3.5, 3.6, 3.5, 3.7, 3.6, 3.8],
      'Social Skills': [3.8, 3.9, 3.8, 4.0, 3.9, 4.1],
      'Emotional Readiness': [3.6, 3.7, 3.6, 3.8, 3.7, 3.9],
      'Communication': [3.7, 3.8, 3.7, 3.9, 3.8, 4.0],
      'Creativity': [3.9, 4.0, 3.9, 4.1, 4.0, 4.2]
    },
    '5': { // Jordan - Declining performance
      'Cognitive Skills': [3.8, 3.6, 3.4, 3.2, 3.0, 2.8],
      'Social Skills': [4.0, 3.8, 3.6, 3.4, 3.2, 3.0],
      'Emotional Readiness': [3.5, 3.3, 3.1, 2.9, 2.7, 2.5],
      'Communication': [3.7, 3.5, 3.3, 3.1, 2.9, 2.7],
      'Creativity': [3.9, 3.7, 3.5, 3.3, 3.1, 2.9]
    },
    '6': { // Sophia - High performer
      'Cognitive Skills': [4.5, 4.6, 4.7, 4.8, 4.9, 5.0],
      'Social Skills': [4.3, 4.4, 4.5, 4.6, 4.7, 4.8],
      'Emotional Readiness': [4.4, 4.5, 4.6, 4.7, 4.8, 4.9],
      'Communication': [4.2, 4.3, 4.4, 4.5, 4.6, 4.7],
      'Creativity': [4.6, 4.7, 4.8, 4.9, 5.0, 5.0]
    },
    '7': { // Lucas - Average performer
      'Cognitive Skills': [3.0, 3.1, 3.2, 3.1, 3.3, 3.2],
      'Social Skills': [3.2, 3.3, 3.4, 3.3, 3.5, 3.4],
      'Emotional Readiness': [3.1, 3.2, 3.3, 3.2, 3.4, 3.3],
      'Communication': [3.3, 3.4, 3.5, 3.4, 3.6, 3.5],
      'Creativity': [3.4, 3.5, 3.6, 3.5, 3.7, 3.6]
    },
    '8': { // Olivia - Struggling with improvement
      'Cognitive Skills': [2.0, 2.2, 2.4, 2.6, 2.8, 3.0],
      'Social Skills': [2.5, 2.7, 2.9, 3.1, 3.3, 3.5],
      'Emotional Readiness': [2.2, 2.4, 2.6, 2.8, 3.0, 3.2],
      'Communication': [2.3, 2.5, 2.7, 2.9, 3.1, 3.3],
      'Creativity': [2.8, 3.0, 3.2, 3.4, 3.6, 3.8]
    }
  };

  return patterns[studentId as keyof typeof patterns] || {
    'Cognitive Skills': [3.0, 3.1, 3.2, 3.1, 3.3, 3.2],
    'Social Skills': [3.2, 3.3, 3.4, 3.3, 3.5, 3.4],
    'Emotional Readiness': [3.1, 3.2, 3.3, 3.2, 3.4, 3.3],
    'Communication': [3.3, 3.4, 3.5, 3.4, 3.6, 3.5],
    'Creativity': [3.4, 3.5, 3.6, 3.5, 3.7, 3.6]
  };
}

// Generate timestamps for the last 6 weeks
function generateTimestamps(): string[] {
  const timestamps = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7));
    timestamps.push(date.toISOString());
  }
  
  return timestamps;
}

// Generate dummy observations
export function generateDummyData(): ObservationLog[] {
  const logs: ObservationLog[] = [];
  const timestamps = generateTimestamps();
  
  try {
    SAMPLE_STUDENTS.forEach(student => {
      const pattern = generateStudentPattern(student.id);
      
      timestamps.forEach((timestamp, weekIndex) => {
        CATEGORIES.forEach(category => {
          const scores = pattern[category];
          if (scores && scores[weekIndex] !== undefined) {
            const score = scores[weekIndex];
            
            // Generate 2-3 observations per week per student
            const observationsPerWeek = Math.floor(Math.random() * 2) + 2;
            
            for (let obs = 0; obs < observationsPerWeek; obs++) {
              const observationLog: ObservationLog = {
                id: `${student.id}-${weekIndex}-${obs}-${Date.now()}`,
                studentId: student.id,
                studentName: student.name,
                timestamp: new Date(timestamp).toISOString(),
                observation: generateObservationText(category, score),
                tags: generateTags(category, score),
                categories: [{
                  category,
                  score: Math.max(1, Math.min(5, score + (Math.random() - 0.5) * 0.5)),
                  isAutoSuggested: Math.random() > 0.3
                }],
                nlpSuggestions: [{
                  category,
                  confidence: 0.7 + Math.random() * 0.3,
                  keywords: generateKeywords(category)
                }]
              };
              
              logs.push(observationLog);
            }
          }
        });
      });
    });
    
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sortedLogs;
  } catch (error) {
    console.error('Error generating dummy data:', error);
    // Return a minimal set of dummy data if there's an error
    return [
      {
        id: 'demo-1',
        studentId: '1',
        studentName: 'Sarah Johnson',
        timestamp: new Date().toISOString(),
        observation: 'Demonstrated excellent problem-solving skills during math activities',
        tags: ['Excellent', 'Engaged', 'Problem-Solving'],
        categories: [{
          category: 'Cognitive Skills',
          score: 4.2,
          isAutoSuggested: false
        }],
        nlpSuggestions: [{
          category: 'Cognitive Skills',
          confidence: 0.8,
          keywords: ['problem solving', 'critical thinking']
        }]
      }
    ];
  }
}

// Generate realistic observation text
function generateObservationText(category: string, score: number): string {
  const observations = {
    'Cognitive Skills': {
      high: [
        'Demonstrated excellent problem-solving skills during math activities',
        'Showed strong critical thinking when analyzing complex problems',
        'Displayed advanced reasoning abilities in group discussions',
        'Exhibited exceptional analytical skills during science experiments'
      ],
      medium: [
        'Generally understands concepts with some guidance',
        'Shows good problem-solving skills with occasional support',
        'Demonstrates solid analytical thinking in familiar contexts',
        'Exhibits reasonable critical thinking skills'
      ],
      low: [
        'Struggles with basic problem-solving tasks',
        'Requires significant support for analytical thinking',
        'Has difficulty with critical thinking exercises',
        'Needs constant guidance for complex problem-solving'
      ]
    },
    'Social Skills': {
      high: [
        'Excellent collaboration skills during group activities',
        'Demonstrates strong leadership qualities in team settings',
        'Shows exceptional empathy and understanding of peers',
        'Exhibits outstanding teamwork and cooperation'
      ],
      medium: [
        'Works well with others in familiar group settings',
        'Shows good cooperation skills with some guidance',
        'Demonstrates appropriate social interactions',
        'Exhibits reasonable teamwork abilities'
      ],
      low: [
        'Struggles with peer interactions and collaboration',
        'Requires support for group activities',
        'Has difficulty working with others',
        'Needs guidance for social interactions'
      ]
    },
    'Emotional Readiness': {
      high: [
        'Shows excellent emotional regulation and self-awareness',
        'Demonstrates strong resilience and confidence',
        'Exhibits exceptional emotional intelligence',
        'Displays outstanding self-control and motivation'
      ],
      medium: [
        'Generally manages emotions well in most situations',
        'Shows good self-awareness with occasional support',
        'Demonstrates reasonable emotional regulation',
        'Exhibits appropriate confidence levels'
      ],
      low: [
        'Struggles with emotional regulation and self-control',
        'Requires support for emotional management',
        'Has difficulty with self-awareness',
        'Needs guidance for emotional expression'
      ]
    },
    'Communication': {
      high: [
        'Excellent verbal and written communication skills',
        'Demonstrates strong presentation abilities',
        'Shows exceptional listening and articulation',
        'Exhibits outstanding communication clarity'
      ],
      medium: [
        'Generally communicates clearly in familiar contexts',
        'Shows good listening skills with some support',
        'Demonstrates reasonable verbal expression',
        'Exhibits appropriate communication abilities'
      ],
      low: [
        'Struggles with verbal expression and communication',
        'Requires support for clear communication',
        'Has difficulty with listening and articulation',
        'Needs guidance for effective communication'
      ]
    },
    'Creativity': {
      high: [
        'Demonstrates exceptional creative thinking and imagination',
        'Shows outstanding artistic expression and innovation',
        'Exhibits excellent original thinking and creativity',
        'Displays remarkable imaginative problem-solving'
      ],
      medium: [
        'Shows good creativity in familiar contexts',
        'Demonstrates reasonable artistic expression',
        'Exhibits appropriate imaginative thinking',
        'Displays solid creative problem-solving skills'
      ],
      low: [
        'Struggles with creative expression and imagination',
        'Requires support for creative activities',
        'Has difficulty with original thinking',
        'Needs guidance for artistic expression'
      ]
    }
  };

  const categoryObs = observations[category as keyof typeof observations];
  const level = score >= 4 ? 'high' : score >= 2.5 ? 'medium' : 'low';
  const obsList = categoryObs[level as keyof typeof categoryObs];
  
  return obsList[Math.floor(Math.random() * obsList.length)];
}

// Generate appropriate tags based on category and score
function generateTags(category: string, score: number): string[] {
  const tags = [];
  
  if (score >= 4) {
    tags.push('Excellent', 'Engaged', 'Independent');
  } else if (score >= 2.5) {
    tags.push('Good', 'Attentive', 'Collaborative');
  } else {
    tags.push('Needs Help', 'Struggling', 'Distracted');
  }
  
  // Add category-specific tags
  if (category === 'Cognitive Skills') {
    tags.push('Problem-Solving');
  } else if (category === 'Social Skills') {
    tags.push('Teamwork');
  } else if (category === 'Emotional Readiness') {
    tags.push('Confident');
  } else if (category === 'Communication') {
    tags.push('Articulate');
  } else if (category === 'Creativity') {
    tags.push('Creative');
  }
  
  return tags.slice(0, 3); // Return max 3 tags
}

// Generate keywords for NLP suggestions
function generateKeywords(category: string): string[] {
  const keywords = {
    'Cognitive Skills': ['problem solving', 'critical thinking', 'analysis'],
    'Social Skills': ['collaboration', 'teamwork', 'empathy'],
    'Emotional Readiness': ['emotional regulation', 'self-awareness', 'confidence'],
    'Communication': ['verbal expression', 'listening', 'articulation'],
    'Creativity': ['creative thinking', 'imagination', 'artistic expression']
  };
  
  return keywords[category as keyof typeof keywords] || [];
}

// Function to populate localStorage with dummy data
export function populateDummyData(): void {
  if (typeof window !== 'undefined') {
    const existingData = localStorage.getItem('observationLogs');
    if (!existingData || JSON.parse(existingData).length === 0) {
      const dummyData = generateDummyData();
      localStorage.setItem('observationLogs', JSON.stringify(dummyData));
      console.log('Dummy data populated:', dummyData.length, 'observations');
    }
  }
} 