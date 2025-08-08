import { offlineStorage } from './offlineStorage';
import axios from 'axios';

export interface ParentContact {
  id: string;
  studentId: string;
  parentName: string;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  preferredCommunication: 'email' | 'whatsapp' | 'both';
  language: string;
  timezone: string;
}

export interface ProgressSummary {
  id: string;
  studentId: string;
  studentName: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  startDate: string;
  endDate: string;
  overallProgress: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  keyAchievements: string[];
  areasForImprovement: string[];
  recommendations: string[];
  behaviorHighlights: string[];
  academicSummary: {
    strengths: string[];
    challenges: string[];
    nextSteps: string[];
  };
  sentimentTrend: 'positive' | 'stable' | 'concerning';
  teacherNotes: string;
  generatedAt: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'weekly_summary' | 'monthly_report' | 'alert' | 'achievement' | 'concern';
  language: string;
  template: string;
  variables: string[];
}

class ParentCommunicationManager {
  private templates: Map<string, CommunicationTemplate> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await offlineStorage.initialize();
    await this.loadTemplates();
    
    this.isInitialized = true;
    console.log('Parent communication manager initialized');
  }

  // Progress Summary Generation
  async generateProgressSummary(
    studentId: string, 
    period: ProgressSummary['period'],
    dateRange?: { start: Date; end: Date }
  ): Promise<ProgressSummary> {
    const student = await offlineStorage.getStudent(studentId);
    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    const observations = await offlineStorage.getObservationsByStudent(studentId);
    
    // Filter observations by date range
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || this.getStartDateForPeriod(period, endDate);
    
    const periodObservations = observations.filter(obs => {
      const obsDate = new Date(obs.timestamp);
      return obsDate >= startDate && obsDate <= endDate;
    });

    if (periodObservations.length === 0) {
      throw new Error(`No observations found for student ${student.name} in the specified period`);
    }

    // Analyze observations
    const analysis = await this.analyzeObservations(periodObservations);
    
    const summary: ProgressSummary = {
      id: `summary_${studentId}_${Date.now()}`,
      studentId,
      studentName: student.name,
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      overallProgress: this.determineOverallProgress(analysis),
      keyAchievements: analysis.achievements,
      areasForImprovement: analysis.improvements,
      recommendations: analysis.recommendations,
      behaviorHighlights: analysis.behaviorHighlights,
      academicSummary: analysis.academicSummary,
      sentimentTrend: analysis.sentimentTrend,
      teacherNotes: analysis.teacherNotes,
      generatedAt: new Date().toISOString(),
    };

    return summary;
  }

  private async analyzeObservations(observations: any[]): Promise<{
    achievements: string[];
    improvements: string[];
    recommendations: string[];
    behaviorHighlights: string[];
    academicSummary: any;
    sentimentTrend: 'positive' | 'stable' | 'concerning';
    teacherNotes: string;
  }> {
    const achievements: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];
    const behaviorHighlights: string[] = [];

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    // Analyze each observation
    for (const obs of observations) {
      const avgScore = Object.values(obs.scores).reduce((a, b) => (a as number) + (b as number), 0) / Object.keys(obs.scores).length;
      
      // Determine achievements vs areas for improvement
      if (avgScore >= 4) {
        achievements.push(`Excellent performance in ${this.getTopCategory(obs.scores)}`);
      } else if (avgScore <= 2) {
        improvements.push(`Needs support in ${this.getBottomCategory(obs.scores)}`);
      }

      // Analyze sentiment if available
      if (obs.sentiment) {
        if (obs.sentiment.sentiment === 'positive') positiveCount++;
        else if (obs.sentiment.sentiment === 'negative') negativeCount++;
        else neutralCount++;

        if (obs.sentiment.behaviorInsights) {
          behaviorHighlights.push(...obs.sentiment.behaviorInsights);
        }

        if (obs.sentiment.suggestedActions) {
          recommendations.push(...obs.sentiment.suggestedActions);
        }
      }

      // Extract key behavior highlights from tags
      if (obs.tags) {
        const behaviorTags = obs.tags.filter((tag: string) => 
          tag.includes('behavior') || tag.includes('social') || tag.includes('emotional')
        );
        behaviorHighlights.push(...behaviorTags.map((tag: string) => 
          this.formatTagForParents(tag)
        ));
      }
    }

    // Determine sentiment trend
    const total = positiveCount + neutralCount + negativeCount;
    const sentimentTrend: 'positive' | 'stable' | 'concerning' = 
      positiveCount > total * 0.6 ? 'positive' :
      negativeCount > total * 0.4 ? 'concerning' : 'stable';

    // Generate academic summary
    const academicSummary = {
      strengths: [...new Set(achievements)].slice(0, 3),
      challenges: [...new Set(improvements)].slice(0, 3),
      nextSteps: [...new Set(recommendations)].slice(0, 3),
    };

    return {
      achievements: [...new Set(achievements)],
      improvements: [...new Set(improvements)],
      recommendations: [...new Set(recommendations)],
      behaviorHighlights: [...new Set(behaviorHighlights)],
      academicSummary,
      sentimentTrend,
      teacherNotes: this.generateTeacherNotes(observations),
    };
  }

  private getTopCategory(scores: Record<string, number>): string {
    return Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
  }

  private getBottomCategory(scores: Record<string, number>): string {
    return Object.entries(scores).reduce((a, b) => scores[a[0]] < scores[b[0]] ? a : b)[0];
  }

  private formatTagForParents(tag: string): string {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private generateTeacherNotes(observations: any[]): string {
    const recentObs = observations.slice(-3);
    const notes = recentObs.map(obs => obs.observation).join(' ');
    return this.summarizeForParents(notes);
  }

  private summarizeForParents(text: string): string {
    // Simple summarization - in production, use AI summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private determineOverallProgress(analysis: any): ProgressSummary['overallProgress'] {
    const achievementsCount = analysis.achievements.length;
    const improvementsCount = analysis.improvements.length;
    
    if (achievementsCount > improvementsCount * 2) return 'excellent';
    if (achievementsCount > improvementsCount) return 'good';
    if (improvementsCount <= 2) return 'satisfactory';
    return 'needs_improvement';
  }

  private getStartDateForPeriod(period: ProgressSummary['period'], endDate: Date): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
    }
    
    return start;
  }

  // Message Generation
  async generateParentMessage(
    summary: ProgressSummary,
    parentContact: ParentContact,
    templateType: CommunicationTemplate['type'] = 'weekly_summary'
  ): Promise<string> {
    const template = this.getTemplate(templateType, parentContact.language);
    if (!template) {
      throw new Error(`Template not found for type ${templateType} in language ${parentContact.language}`);
    }

    return this.populateTemplate(template, summary, parentContact);
  }

  private getTemplate(type: CommunicationTemplate['type'], language: string): CommunicationTemplate | undefined {
    const key = `${type}_${language}`;
    return this.templates.get(key) || this.templates.get(`${type}_en`);
  }

  private populateTemplate(
    template: CommunicationTemplate,
    summary: ProgressSummary,
    parentContact: ParentContact
  ): string {
    let message = template.template;

    // Replace template variables
    const replacements: Record<string, string> = {
      '{parent_name}': parentContact.parentName,
      '{student_name}': summary.studentName,
      '{period}': summary.period,
      '{start_date}': this.formatDateForParent(summary.startDate),
      '{end_date}': this.formatDateForParent(summary.endDate),
      '{overall_progress}': this.formatProgressForParent(summary.overallProgress),
      '{achievements}': summary.keyAchievements.join('\n• '),
      '{improvements}': summary.areasForImprovement.join('\n• '),
      '{recommendations}': summary.recommendations.slice(0, 3).join('\n• '),
      '{teacher_notes}': summary.teacherNotes,
      '{sentiment_trend}': this.formatSentimentForParent(summary.sentimentTrend),
    };

    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(new RegExp(key, 'g'), value);
    });

    return message;
  }

  private formatDateForParent(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatProgressForParent(progress: ProgressSummary['overallProgress']): string {
    const progressMap = {
      excellent: 'Excellent',
      good: 'Good',
      satisfactory: 'Satisfactory',
      needs_improvement: 'Needs Improvement',
    };
    return progressMap[progress];
  }

  private formatSentimentForParent(sentiment: ProgressSummary['sentimentTrend']): string {
    const sentimentMap = {
      positive: 'very positive',
      stable: 'stable and consistent',
      concerning: 'showing some challenges',
    };
    return sentimentMap[sentiment];
  }

  // Communication Methods
  async sendWhatsAppMessage(
    parentContact: ParentContact,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!parentContact.whatsappNumber) {
      return { success: false, error: 'No WhatsApp number provided' };
    }

    try {
      // This would integrate with WhatsApp Business API
      const response = await axios.post('/api/whatsapp/send', {
        to: parentContact.whatsappNumber,
        message: message,
        type: 'text',
      });

      return {
        success: true,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendEmailSummary(
    parentContact: ParentContact,
    summary: ProgressSummary,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!parentContact.email) {
      return { success: false, error: 'No email address provided' };
    }

    try {
      const response = await axios.post('/api/email/send', {
        to: parentContact.email,
        subject: `${summary.studentName} - ${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)} Progress Summary`,
        htmlContent: this.formatEmailContent(message, summary),
        textContent: message,
      });

      return {
        success: true,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatEmailContent(message: string, summary: ProgressSummary): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${summary.studentName} - Progress Summary</h2>
        <div style="white-space: pre-line; line-height: 1.6;">
          ${message}
        </div>
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This message was generated automatically by your school's teacher assessment system.
          Period: ${summary.startDate} to ${summary.endDate}
        </p>
      </div>
    `;
  }

  // Template Management
  private async loadTemplates(): Promise<void> {
    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: 'weekly_summary_en',
        name: 'Weekly Summary - English',
        type: 'weekly_summary',
        language: 'en',
        template: `Dear {parent_name},

I hope this message finds you well. I wanted to share {student_name}'s progress from {start_date} to {end_date}.

📊 Overall Progress: {overall_progress}

🌟 Key Achievements:
• {achievements}

🎯 Areas for Growth:
• {improvements}

💡 Recommendations:
• {recommendations}

📝 Teacher Notes:
{teacher_notes}

{student_name} has been {sentiment_trend} this week. Please feel free to reach out if you have any questions.

Best regards,
Your Teacher`,
        variables: ['{parent_name}', '{student_name}', '{period}', '{start_date}', '{end_date}', '{overall_progress}', '{achievements}', '{improvements}', '{recommendations}', '{teacher_notes}', '{sentiment_trend}'],
      },
      {
        id: 'monthly_report_en',
        name: 'Monthly Report - English',
        type: 'monthly_report',
        language: 'en',
        template: `Dear {parent_name},

I'm pleased to share {student_name}'s comprehensive monthly progress report for the period from {start_date} to {end_date}.

📈 Overall Assessment: {overall_progress}

🏆 Notable Achievements:
• {achievements}

🚀 Growth Opportunities:
• {improvements}

📋 Action Plan:
• {recommendations}

🔍 Detailed Observations:
{teacher_notes}

This month, {student_name}'s attitude and engagement has been {sentiment_trend}. I'm here to support both you and {student_name} in continuing this progress.

Please don't hesitate to schedule a meeting if you'd like to discuss any aspect of this report.

Warm regards,
Your Teacher`,
        variables: ['{parent_name}', '{student_name}', '{period}', '{start_date}', '{end_date}', '{overall_progress}', '{achievements}', '{improvements}', '{recommendations}', '{teacher_notes}', '{sentiment_trend}'],
      },
      {
        id: 'alert_en',
        name: 'Alert - English',
        type: 'alert',
        language: 'en',
        template: `Dear {parent_name},

I wanted to reach out regarding {student_name} and share some observations from recent classes.

🚨 Areas of Concern:
• {improvements}

💡 Immediate Actions We Can Take:
• {recommendations}

I believe that with the right support, {student_name} can overcome these challenges. Let's work together to help them succeed.

Please let me know when you're available for a brief conversation.

Best regards,
Your Teacher`,
        variables: ['{parent_name}', '{student_name}', '{improvements}', '{recommendations}'],
      },
    ];

    // Store templates
    for (const template of defaultTemplates) {
      this.templates.set(`${template.type}_${template.language}`, template);
    }

    // Load custom templates from storage if any
    const customTemplates = await offlineStorage.getSetting('customTemplates') || [];
    for (const template of customTemplates) {
      this.templates.set(`${template.type}_${template.language}`, template);
    }
  }

  // Batch Communication
  async sendBatchSummaries(
    studentIds: string[],
    period: ProgressSummary['period'],
    templateType: CommunicationTemplate['type'] = 'weekly_summary'
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{
      studentId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const studentId of studentIds) {
      try {
        // Get parent contacts for student
        const parentContacts = await this.getParentContacts(studentId);
        if (parentContacts.length === 0) {
          results.push({ studentId, success: false, error: 'No parent contacts found' });
          failed++;
          continue;
        }

        // Generate summary
        const summary = await this.generateProgressSummary(studentId, period);

        // Send to all parent contacts
        for (const contact of parentContacts) {
          const message = await this.generateParentMessage(summary, contact, templateType);

          if (contact.preferredCommunication === 'whatsapp' || contact.preferredCommunication === 'both') {
            await this.sendWhatsAppMessage(contact, message);
          }

          if (contact.preferredCommunication === 'email' || contact.preferredCommunication === 'both') {
            await this.sendEmailSummary(contact, summary, message);
          }
        }

        results.push({ studentId, success: true });
        successful++;
      } catch (error) {
        results.push({ 
          studentId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    return { successful, failed, results };
  }

  private async getParentContacts(studentId: string): Promise<ParentContact[]> {
    // This would fetch from storage or API
    const contacts = await offlineStorage.getSetting(`parentContacts_${studentId}`) || [];
    return contacts;
  }
}

// Export singleton instance
export const parentCommunicationManager = new ParentCommunicationManager();

// Utility functions
export async function sendWeeklySummaries(classId: string): Promise<void> {
  const students = await offlineStorage.getStudentsByClass(classId);
  const studentIds = students.map(s => s.id);
  
  await parentCommunicationManager.sendBatchSummaries(studentIds, 'weekly');
}

export async function sendMonthlySummaries(classId: string): Promise<void> {
  const students = await offlineStorage.getStudentsByClass(classId);
  const studentIds = students.map(s => s.id);
  
  await parentCommunicationManager.sendBatchSummaries(studentIds, 'monthly');
}