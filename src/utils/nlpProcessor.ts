import { OBSERVATION_CATEGORIES, NLPSuggestion, CategoryScore } from '@/types';

export interface NLPResult {
  suggestions: NLPSuggestion[];
  categoryScores: CategoryScore[];
}

export function processObservationText(text: string): NLPResult {
  const lowerText = text.toLowerCase();
  const suggestions: NLPSuggestion[] = [];
  const categoryScores: CategoryScore[] = [];

  // Analyze each category
  OBSERVATION_CATEGORIES.forEach(category => {
    const matchedKeywords: string[] = [];
    let confidence = 0;

    // Check for keyword matches
    category.keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        confidence += 0.2; // Base confidence per keyword
      }
    });

    // Check for partial matches and related terms
    const partialMatches = findPartialMatches(lowerText, category.keywords);
    matchedKeywords.push(...partialMatches);
    confidence += partialMatches.length * 0.1;

    // Check for sentiment and context clues
    const sentimentScore = analyzeSentiment(lowerText, category.name);
    confidence += sentimentScore;

    // Normalize confidence to 0-1 range
    confidence = Math.min(confidence, 1);

    if (confidence > 0.1) { // Only suggest if confidence is above threshold
      suggestions.push({
        category: category.name,
        confidence,
        keywords: matchedKeywords
      });

      // Convert confidence to score (1-5 scale)
      const score = Math.max(1, Math.min(5, Math.round(confidence * 5)));
      
      categoryScores.push({
        category: category.name,
        score,
        isAutoSuggested: true
      });
    }
  });

  return { suggestions, categoryScores };
}

function findPartialMatches(text: string, keywords: string[]): string[] {
  const partialMatches: string[] = [];
  
  keywords.forEach(keyword => {
    const words = keyword.split(' ');
    words.forEach(word => {
      if (word.length > 3 && text.includes(word.toLowerCase())) {
        partialMatches.push(word);
      }
    });
  });

  return [...new Set(partialMatches)]; // Remove duplicates
}

function analyzeSentiment(text: string, categoryName: string): number {
  let sentimentScore = 0;

  // Positive indicators
  const positiveWords = [
    'excellent', 'great', 'good', 'well', 'strong', 'improved', 'progress',
    'confident', 'engaged', 'motivated', 'creative', 'collaborative', 'helpful'
  ];

  // Negative indicators
  const negativeWords = [
    'struggles', 'difficult', 'challenging', 'needs help', 'poor', 'weak',
    'distracted', 'unfocused', 'reluctant', 'resistant', 'confused'
  ];

  // Count positive and negative words
  positiveWords.forEach(word => {
    if (text.includes(word)) {
      sentimentScore += 0.1;
    }
  });

  negativeWords.forEach(word => {
    if (text.includes(word)) {
      sentimentScore -= 0.1;
    }
  });

  // Category-specific sentiment analysis
  switch (categoryName) {
    case 'Cognitive Skills':
      if (text.includes('problem solving') || text.includes('critical thinking')) {
        sentimentScore += 0.2;
      }
      if (text.includes('struggles') || text.includes('confused')) {
        sentimentScore -= 0.2;
      }
      break;
    case 'Social Skills':
      if (text.includes('teamwork') || text.includes('collaboration') || text.includes('sharing')) {
        sentimentScore += 0.2;
      }
      if (text.includes('conflict') || text.includes('argument')) {
        sentimentScore -= 0.2;
      }
      break;
    case 'Emotional Readiness':
      if (text.includes('confident') || text.includes('resilient') || text.includes('self-aware')) {
        sentimentScore += 0.2;
      }
      if (text.includes('frustrated') || text.includes('upset') || text.includes('anxious')) {
        sentimentScore -= 0.2;
      }
      break;
    case 'Communication':
      if (text.includes('clear') || text.includes('articulate') || text.includes('listening')) {
        sentimentScore += 0.2;
      }
      if (text.includes('unclear') || text.includes('quiet') || text.includes('shy')) {
        sentimentScore -= 0.2;
      }
      break;
    case 'Creativity':
      if (text.includes('creative') || text.includes('imaginative') || text.includes('original')) {
        sentimentScore += 0.2;
      }
      if (text.includes('uncreative') || text.includes('unimaginative')) {
        sentimentScore -= 0.2;
      }
      break;
  }

  return sentimentScore;
}

export function getCategoryDescription(categoryName: string): string {
  const category = OBSERVATION_CATEGORIES.find(cat => cat.name === categoryName);
  return category?.description || '';
}

export function getScoringCriteria(categoryName: string) {
  const category = OBSERVATION_CATEGORIES.find(cat => cat.name === categoryName);
  return category?.scoringCriteria || [];
} 