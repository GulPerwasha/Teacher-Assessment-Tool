export interface ObservationLog {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  observation: string;
  tags: string[];
  categories: CategoryScore[];
  nlpSuggestions?: NLPSuggestion[];
}

export interface CategoryScore {
  category: string;
  score: number; // 1-5 scale
  isAutoSuggested: boolean;
}

export interface NLPSuggestion {
  category: string;
  confidence: number;
  keywords: string[];
}

export interface Student {
  id: string;
  name: string;
  observationCount: number;
  lastObservation?: string;
  commonTags: string[];
  categoryAverages: { [category: string]: number };
}

export interface CategoryFramework {
  name: string;
  description: string;
  keywords: string[];
  scoringCriteria: ScoringCriteria[];
}

export interface ScoringCriteria {
  score: number;
  description: string;
  indicators: string[];
}

export const OBSERVATION_CATEGORIES: CategoryFramework[] = [
  {
    name: 'Cognitive Skills',
    description: 'Thinking, reasoning, and problem-solving abilities',
    keywords: [
      'problem solving', 'critical thinking', 'analysis', 'reasoning', 'logic',
      'memory', 'comprehension', 'understanding', 'application', 'synthesis',
      'evaluation', 'strategic thinking', 'planning', 'organization'
    ],
    scoringCriteria: [
      { score: 1, description: 'Needs significant support', indicators: ['Struggles with basic concepts', 'Requires constant guidance'] },
      { score: 2, description: 'Developing with support', indicators: ['Needs frequent prompts', 'Limited independent thinking'] },
      { score: 3, description: 'Meets expectations', indicators: ['Generally understands concepts', 'Can work independently'] },
      { score: 4, description: 'Exceeds expectations', indicators: ['Strong analytical skills', 'Creative problem solving'] },
      { score: 5, description: 'Exceptional performance', indicators: ['Advanced reasoning', 'Innovative solutions'] }
    ]
  },
  {
    name: 'Social Skills',
    description: 'Interaction, collaboration, and relationship building',
    keywords: [
      'collaboration', 'teamwork', 'cooperation', 'sharing', 'listening',
      'communication', 'empathy', 'respect', 'leadership', 'conflict resolution',
      'group work', 'peer interaction', 'social awareness', 'relationship building'
    ],
    scoringCriteria: [
      { score: 1, description: 'Needs significant support', indicators: ['Struggles with peer interaction', 'Requires constant supervision'] },
      { score: 2, description: 'Developing with support', indicators: ['Needs prompts for social interaction', 'Limited collaboration'] },
      { score: 3, description: 'Meets expectations', indicators: ['Generally works well with others', 'Respects peers'] },
      { score: 4, description: 'Exceeds expectations', indicators: ['Strong leadership skills', 'Excellent collaboration'] },
      { score: 5, description: 'Exceptional performance', indicators: ['Natural leader', 'Exceptional social awareness'] }
    ]
  },
  {
    name: 'Emotional Readiness',
    description: 'Self-awareness, emotional regulation, and resilience',
    keywords: [
      'emotional regulation', 'self-awareness', 'resilience', 'confidence',
      'motivation', 'perseverance', 'stress management', 'self-control',
      'empathy', 'emotional intelligence', 'coping skills', 'mindfulness'
    ],
    scoringCriteria: [
      { score: 1, description: 'Needs significant support', indicators: ['Frequent emotional outbursts', 'Low self-confidence'] },
      { score: 2, description: 'Developing with support', indicators: ['Needs help with emotional regulation', 'Limited self-awareness'] },
      { score: 3, description: 'Meets expectations', indicators: ['Generally manages emotions well', 'Shows confidence'] },
      { score: 4, description: 'Exceeds expectations', indicators: ['Strong emotional intelligence', 'High resilience'] },
      { score: 5, description: 'Exceptional performance', indicators: ['Exceptional self-awareness', 'Natural emotional leader'] }
    ]
  },
  {
    name: 'Communication',
    description: 'Verbal and non-verbal expression, listening, and articulation',
    keywords: [
      'verbal communication', 'listening', 'articulation', 'presentation',
      'expression', 'speaking', 'writing', 'non-verbal', 'body language',
      'active listening', 'clarity', 'fluency', 'vocabulary', 'comprehension'
    ],
    scoringCriteria: [
      { score: 1, description: 'Needs significant support', indicators: ['Limited verbal expression', 'Poor listening skills'] },
      { score: 2, description: 'Developing with support', indicators: ['Needs prompts for communication', 'Limited vocabulary'] },
      { score: 3, description: 'Meets expectations', indicators: ['Generally communicates clearly', 'Good listening skills'] },
      { score: 4, description: 'Exceeds expectations', indicators: ['Excellent communication skills', 'Strong presentation abilities'] },
      { score: 5, description: 'Exceptional performance', indicators: ['Exceptional communicator', 'Natural public speaker'] }
    ]
  },
  {
    name: 'Creativity',
    description: 'Imagination, innovation, and artistic expression',
    keywords: [
      'creativity', 'imagination', 'innovation', 'artistic', 'original thinking',
      'divergent thinking', 'artistic expression', 'design thinking', 'innovation',
      'creative problem solving', 'artistic skills', 'imaginative play', 'original ideas'
    ],
    scoringCriteria: [
      { score: 1, description: 'Needs significant support', indicators: ['Limited creative expression', 'Struggles with original ideas'] },
      { score: 2, description: 'Developing with support', indicators: ['Needs prompts for creativity', 'Limited imagination'] },
      { score: 3, description: 'Meets expectations', indicators: ['Shows creativity in projects', 'Good imagination'] },
      { score: 4, description: 'Exceeds expectations', indicators: ['Highly creative', 'Innovative thinking'] },
      { score: 5, description: 'Exceptional performance', indicators: ['Exceptional creativity', 'Natural innovator'] }
    ]
  }
];

export const CATEGORY_NAMES = OBSERVATION_CATEGORIES.map(cat => cat.name); 