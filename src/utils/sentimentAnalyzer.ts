import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotion: string;
  emotionalIntensity: number;
  behaviorInsights: string[];
  suggestedActions: string[];
}

export interface VoiceNoteAnalysis {
  transcription: string;
  sentiment: SentimentAnalysis;
  keyPhrases: string[];
  behaviorMarkers: BehaviorMarker[];
}

export interface BehaviorMarker {
  category: string;
  indicator: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

class SentimentAnalyzer {
  private model: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await tf.ready();
      this.model = await use.load();
      this.isInitialized = true;
      console.log('Sentiment analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sentiment analyzer:', error);
      throw error;
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get embeddings for the text
      const embeddings = await this.model.embed([text]);
      const embeddingData = await embeddings.data();
      
      // Simple sentiment analysis based on key words and patterns
      const sentimentScore = this.calculateSentimentScore(text);
      const emotionData = this.detectEmotion(text);
      const behaviorInsights = this.extractBehaviorInsights(text);
      
      embeddings.dispose();
      
      return {
        sentiment: this.scoresToSentiment(sentimentScore),
        confidence: Math.abs(sentimentScore),
        emotion: emotionData.emotion,
        emotionalIntensity: emotionData.intensity,
        behaviorInsights,
        suggestedActions: this.generateSuggestedActions(sentimentScore, emotionData.emotion, behaviorInsights)
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(text);
    }
  }

  async analyzeVoiceNote(transcription: string): Promise<VoiceNoteAnalysis> {
    const sentiment = await this.analyzeSentiment(transcription);
    const keyPhrases = this.extractKeyPhrases(transcription);
    const behaviorMarkers = this.identifyBehaviorMarkers(transcription);

    return {
      transcription,
      sentiment,
      keyPhrases,
      behaviorMarkers
    };
  }

  private calculateSentimentScore(text: string): number {
    const positiveWords = [
      'excellent', 'great', 'good', 'wonderful', 'amazing', 'outstanding', 'fantastic',
      'improved', 'progress', 'better', 'successful', 'confident', 'engaged', 'focused',
      'helpful', 'cooperative', 'respectful', 'kind', 'friendly', 'motivated'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'failing',
      'declined', 'worse', 'struggling', 'difficult', 'disruptive', 'aggressive',
      'uncooperative', 'disrespectful', 'rude', 'withdrawn', 'distracted', 'unmotivated'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });

    // Normalize score between -1 and 1
    return Math.max(-1, Math.min(1, score));
  }

  private detectEmotion(text: string): { emotion: string; intensity: number } {
    const emotionPatterns = {
      happy: ['happy', 'joy', 'excited', 'cheerful', 'delighted', 'pleased'],
      sad: ['sad', 'upset', 'disappointed', 'unhappy', 'depressed', 'down'],
      angry: ['angry', 'mad', 'frustrated', 'irritated', 'annoyed', 'furious'],
      anxious: ['nervous', 'worried', 'anxious', 'stressed', 'concerned', 'fearful'],
      calm: ['calm', 'peaceful', 'relaxed', 'content', 'serene', 'tranquil'],
      confused: ['confused', 'puzzled', 'uncertain', 'lost', 'bewildered']
    };

    const text_lower = text.toLowerCase();
    let maxScore = 0;
    let dominantEmotion = 'neutral';

    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        const matches = (text_lower.match(new RegExp(pattern, 'g')) || []).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    });

    return {
      emotion: dominantEmotion,
      intensity: Math.min(1, maxScore * 0.3)
    };
  }

  private extractBehaviorInsights(text: string): string[] {
    const insights: string[] = [];
    const text_lower = text.toLowerCase();

    // Academic behavior patterns
    if (text_lower.includes('participation') || text_lower.includes('engaged')) {
      insights.push('Shows classroom engagement patterns');
    }
    if (text_lower.includes('homework') || text_lower.includes('assignment')) {
      insights.push('Academic responsibility indicators detected');
    }
    if (text_lower.includes('help') || text_lower.includes('question')) {
      insights.push('Help-seeking behavior observed');
    }

    // Social behavior patterns
    if (text_lower.includes('friend') || text_lower.includes('peer')) {
      insights.push('Peer interaction dynamics noted');
    }
    if (text_lower.includes('respectful') || text_lower.includes('polite')) {
      insights.push('Positive social behavior demonstrated');
    }
    if (text_lower.includes('disrupt') || text_lower.includes('interrupt')) {
      insights.push('Attention to classroom disruption patterns needed');
    }

    // Emotional regulation patterns
    if (text_lower.includes('calm') || text_lower.includes('composed')) {
      insights.push('Good emotional regulation observed');
    }
    if (text_lower.includes('upset') || text_lower.includes('frustrated')) {
      insights.push('Emotional regulation support may be beneficial');
    }

    return insights.length > 0 ? insights : ['General behavioral observation recorded'];
  }

  private generateSuggestedActions(sentimentScore: number, emotion: string, insights: string[]): string[] {
    const actions: string[] = [];

    // Sentiment-based actions
    if (sentimentScore < -0.3) {
      actions.push('Consider one-on-one check-in with student');
      actions.push('Review recent academic or social stressors');
    } else if (sentimentScore > 0.3) {
      actions.push('Acknowledge positive behavior publicly');
      actions.push('Use student as peer mentor opportunity');
    }

    // Emotion-specific actions
    switch (emotion) {
      case 'anxious':
        actions.push('Provide calming strategies or quiet space');
        actions.push('Break tasks into smaller, manageable steps');
        break;
      case 'angry':
        actions.push('Implement cool-down period');
        actions.push('Discuss conflict resolution strategies');
        break;
      case 'sad':
        actions.push('Offer emotional support resources');
        actions.push('Connect with counseling services if needed');
        break;
      case 'confused':
        actions.push('Provide additional instruction or clarification');
        actions.push('Pair with study buddy for support');
        break;
    }

    // Insight-based actions
    insights.forEach(insight => {
      if (insight.includes('engagement')) {
        actions.push('Incorporate more interactive learning activities');
      }
      if (insight.includes('disruption')) {
        actions.push('Implement behavior intervention plan');
      }
      if (insight.includes('peer interaction')) {
        actions.push('Monitor social dynamics and provide guidance');
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }

  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    const text_lower = text.toLowerCase();

    // Academic phrases
    const academicPatterns = [
      /\b(struggling with|difficulty with|excelling in|improved in)\s+(\w+)/g,
      /\b(completed|finished|submitted|turned in)\s+(\w+)/g,
      /\b(understanding|grasping|mastering)\s+(\w+)/g
    ];

    // Behavioral phrases
    const behavioralPatterns = [
      /\b(showing|demonstrating|exhibiting)\s+(\w+\s+\w+)/g,
      /\b(needs to work on|should focus on|could improve)\s+(\w+)/g,
      /\b(great job with|excellent work on|outstanding)\s+(\w+)/g
    ];

    [...academicPatterns, ...behavioralPatterns].forEach(pattern => {
      const matches = [...text_lower.matchAll(pattern)];
      matches.forEach(match => {
        if (match[0] && match[0].length > 5) {
          phrases.push(match[0].trim());
        }
      });
    });

    return [...new Set(phrases)].slice(0, 5); // Top 5 unique phrases
  }

  private identifyBehaviorMarkers(text: string): BehaviorMarker[] {
    const markers: BehaviorMarker[] = [];
    const text_lower = text.toLowerCase();

    // Academic behavior markers
    if (text_lower.includes('late') || text_lower.includes('missing')) {
      markers.push({
        category: 'Academic Responsibility',
        indicator: 'Punctuality/Completion Issues',
        severity: 'medium',
        description: 'Student showing patterns of late or missing work'
      });
    }

    if (text_lower.includes('excellent work') || text_lower.includes('outstanding')) {
      markers.push({
        category: 'Academic Achievement',
        indicator: 'High Performance',
        severity: 'low',
        description: 'Student demonstrating excellent academic performance'
      });
    }

    // Social behavior markers
    if (text_lower.includes('disrupt') || text_lower.includes('interrupt')) {
      markers.push({
        category: 'Social Behavior',
        indicator: 'Classroom Disruption',
        severity: 'high',
        description: 'Student exhibiting disruptive classroom behavior'
      });
    }

    if (text_lower.includes('helpful') || text_lower.includes('cooperative')) {
      markers.push({
        category: 'Social Behavior',
        indicator: 'Positive Cooperation',
        severity: 'low',
        description: 'Student showing positive social cooperation'
      });
    }

    // Emotional markers
    if (text_lower.includes('upset') || text_lower.includes('frustrated')) {
      markers.push({
        category: 'Emotional Regulation',
        indicator: 'Emotional Distress',
        severity: 'medium',
        description: 'Student experiencing emotional challenges'
      });
    }

    return markers;
  }

  private fallbackAnalysis(text: string): SentimentAnalysis {
    const sentimentScore = this.calculateSentimentScore(text);
    const emotionData = this.detectEmotion(text);
    const behaviorInsights = this.extractBehaviorInsights(text);

    return {
      sentiment: this.scoresToSentiment(sentimentScore),
      confidence: Math.abs(sentimentScore) * 0.7, // Lower confidence for fallback
      emotion: emotionData.emotion,
      emotionalIntensity: emotionData.intensity,
      behaviorInsights,
      suggestedActions: this.generateSuggestedActions(sentimentScore, emotionData.emotion, behaviorInsights)
    };
  }

  private scoresToSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }
}

// Export singleton instance
export const sentimentAnalyzer = new SentimentAnalyzer();

// Utility function for batch analysis
export async function analyzeBatch(texts: string[]): Promise<SentimentAnalysis[]> {
  const results = await Promise.all(
    texts.map(text => sentimentAnalyzer.analyzeSentiment(text))
  );
  return results;
}

// Enhanced NLP processing that integrates with existing system
export async function enhancedNLPAnalysis(
  observation: string,
  existingTags: string[] = []
): Promise<{
  tags: string[];
  sentiment: SentimentAnalysis;
  enhancedInsights: string[];
}> {
  const sentiment = await sentimentAnalyzer.analyzeSentiment(observation);
  const keyPhrases = sentimentAnalyzer.extractKeyPhrases(observation);
  const behaviorMarkers = sentimentAnalyzer.identifyBehaviorMarkers(observation);

  // Combine existing tags with AI-generated insights
  const aiTags = [
    ...keyPhrases.map(phrase => phrase.replace(/\s+/g, '_')),
    ...behaviorMarkers.map(marker => marker.category.replace(/\s+/g, '_')),
    sentiment.emotion,
    `sentiment_${sentiment.sentiment}`
  ];

  const enhancedInsights = [
    ...sentiment.behaviorInsights,
    ...behaviorMarkers.map(marker => marker.description),
    `Emotional tone: ${sentiment.emotion} (${(sentiment.emotionalIntensity * 100).toFixed(0)}% intensity)`,
    `Overall sentiment: ${sentiment.sentiment} (${(sentiment.confidence * 100).toFixed(0)}% confidence)`
  ];

  return {
    tags: [...new Set([...existingTags, ...aiTags])],
    sentiment,
    enhancedInsights
  };
}