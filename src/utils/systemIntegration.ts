import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { offlineStorage } from './offlineStorage';

export interface ExamResult {
  id: string;
  studentId: string;
  examId: string;
  examName: string;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  dateAdministered: string;
  teacher: string;
  feedback?: string;
  skillAreas: {
    area: string;
    score: number;
    comments?: string;
  }[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  markedBy: string;
}

export interface LearningPlatformProgress {
  id: string;
  studentId: string;
  platformName: string;
  courseId: string;
  courseName: string;
  completionPercentage: number;
  timeSpent: number; // in minutes
  lastAccessed: string;
  skillsProgress: {
    skillId: string;
    skillName: string;
    level: string;
    progress: number;
    masteryDate?: string;
  }[];
  achievements: {
    id: string;
    name: string;
    dateEarned: string;
    description: string;
  }[];
}

export interface IntegratedStudentData {
  studentId: string;
  observations: any[];
  examResults: ExamResult[];
  attendanceRecords: AttendanceRecord[];
  learningPlatformProgress: LearningPlatformProgress[];
  lastUpdated: string;
}

export interface SystemIntegrationConfig {
  examSystem: {
    baseUrl: string;
    apiKey?: string;
    authToken?: string;
    enabled: boolean;
  };
  attendanceSystem: {
    baseUrl: string;
    apiKey?: string;
    authToken?: string;
    enabled: boolean;
  };
  learningPlatform: {
    baseUrl: string;
    apiKey?: string;
    authToken?: string;
    enabled: boolean;
  };
  syncInterval: number; // in minutes
  retryAttempts: number;
  timeout: number; // in milliseconds
}

class SystemIntegrationManager {
  private config: SystemIntegrationConfig;
  private isInitialized = false;
  private syncIntervals: Map<string, number> = new Map();

  constructor(config?: Partial<SystemIntegrationConfig>) {
    this.config = {
      examSystem: {
        baseUrl: '/api/exam-system',
        enabled: false,
      },
      attendanceSystem: {
        baseUrl: '/api/attendance-system',
        enabled: false,
      },
      learningPlatform: {
        baseUrl: '/api/learning-platform',
        enabled: false,
      },
      syncInterval: 60, // 1 hour
      retryAttempts: 3,
      timeout: 30000,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await offlineStorage.initialize();
    
    // Load configuration from storage
    const storedConfig = await offlineStorage.getSetting('systemIntegrationConfig');
    if (storedConfig) {
      this.config = { ...this.config, ...storedConfig };
    }

    this.setupAutoSync();
    this.isInitialized = true;
    
    console.log('System integration manager initialized');
  }

  // Configuration Management
  async updateConfig(config: Partial<SystemIntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await offlineStorage.setSetting('systemIntegrationConfig', this.config);
    
    // Restart auto-sync with new intervals
    this.setupAutoSync();
  }

  getConfig(): SystemIntegrationConfig {
    return { ...this.config };
  }

  // Exam System Integration
  async fetchExamResults(studentId: string, dateFrom?: string, dateTo?: string): Promise<ExamResult[]> {
    if (!this.config.examSystem.enabled) {
      console.log('Exam system integration is disabled');
      return [];
    }

    try {
      const params: any = { studentId };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await this.makeAuthenticatedRequest(
        'examSystem',
        'GET',
        '/exam-results',
        { params }
      );

      return this.transformExamResults(response.data);
    } catch (error) {
      console.error('Failed to fetch exam results:', error);
      return [];
    }
  }

  async fetchAllExamResults(studentIds: string[]): Promise<Map<string, ExamResult[]>> {
    const results = new Map<string, ExamResult[]>();

    for (const studentId of studentIds) {
      try {
        const examResults = await this.fetchExamResults(studentId);
        results.set(studentId, examResults);
      } catch (error) {
        console.error(`Failed to fetch exam results for student ${studentId}:`, error);
        results.set(studentId, []);
      }
    }

    return results;
  }

  private transformExamResults(data: any[]): ExamResult[] {
    return data.map(exam => ({
      id: exam.id || `exam_${exam.examId}_${exam.studentId}`,
      studentId: exam.studentId,
      examId: exam.examId,
      examName: exam.examName || exam.name,
      subject: exam.subject,
      score: Number(exam.score),
      maxScore: Number(exam.maxScore || exam.totalMarks),
      percentage: Number(exam.percentage || ((exam.score / exam.maxScore) * 100)),
      grade: exam.grade || this.calculateGrade(exam.percentage),
      dateAdministered: exam.dateAdministered || exam.examDate,
      teacher: exam.teacher || exam.examiner,
      feedback: exam.feedback,
      skillAreas: this.transformSkillAreas(exam.skillAreas || exam.breakdown),
    }));
  }

  private calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  private transformSkillAreas(skillAreas: any[] = []): ExamResult['skillAreas'] {
    return skillAreas.map(area => ({
      area: area.area || area.skill || area.name,
      score: Number(area.score || area.marks),
      comments: area.comments || area.feedback,
    }));
  }

  // Attendance System Integration
  async fetchAttendanceRecords(
    studentId: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<AttendanceRecord[]> {
    if (!this.config.attendanceSystem.enabled) {
      console.log('Attendance system integration is disabled');
      return [];
    }

    try {
      const params: any = { studentId };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await this.makeAuthenticatedRequest(
        'attendanceSystem',
        'GET',
        '/attendance',
        { params }
      );

      return this.transformAttendanceRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      return [];
    }
  }

  async calculateAttendanceStats(studentId: string, period: 'week' | 'month' | 'term'): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendancePercentage: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'term':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
    }

    const records = await this.fetchAttendanceRecords(
      studentId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage,
    };
  }

  private transformAttendanceRecords(data: any[]): AttendanceRecord[] {
    return data.map(record => ({
      id: record.id || `attendance_${record.studentId}_${record.date}`,
      studentId: record.studentId,
      date: record.date,
      status: record.status || record.attendanceStatus,
      arrivalTime: record.arrivalTime || record.timeIn,
      departureTime: record.departureTime || record.timeOut,
      notes: record.notes || record.remarks,
      markedBy: record.markedBy || record.teacher,
    }));
  }

  // Learning Platform Integration
  async fetchLearningPlatformProgress(studentId: string): Promise<LearningPlatformProgress[]> {
    if (!this.config.learningPlatform.enabled) {
      console.log('Learning platform integration is disabled');
      return [];
    }

    try {
      const response = await this.makeAuthenticatedRequest(
        'learningPlatform',
        'GET',
        `/students/${studentId}/progress`
      );

      return this.transformLearningProgress(response.data);
    } catch (error) {
      console.error('Failed to fetch learning platform progress:', error);
      return [];
    }
  }

  private transformLearningProgress(data: any[]): LearningPlatformProgress[] {
    return data.map(progress => ({
      id: progress.id || `lp_${progress.studentId}_${progress.courseId}`,
      studentId: progress.studentId,
      platformName: progress.platformName || 'Learning Platform',
      courseId: progress.courseId,
      courseName: progress.courseName || progress.title,
      completionPercentage: Number(progress.completionPercentage || progress.progress),
      timeSpent: Number(progress.timeSpent || progress.minutesSpent),
      lastAccessed: progress.lastAccessed || progress.lastActivity,
      skillsProgress: this.transformSkillsProgress(progress.skills || progress.skillsProgress),
      achievements: this.transformAchievements(progress.achievements || progress.badges),
    }));
  }

  private transformSkillsProgress(skills: any[] = []): LearningPlatformProgress['skillsProgress'] {
    return skills.map(skill => ({
      skillId: skill.skillId || skill.id,
      skillName: skill.skillName || skill.name,
      level: skill.level || skill.currentLevel,
      progress: Number(skill.progress || skill.completion),
      masteryDate: skill.masteryDate || skill.completedAt,
    }));
  }

  private transformAchievements(achievements: any[] = []): LearningPlatformProgress['achievements'] {
    return achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name || achievement.title,
      dateEarned: achievement.dateEarned || achievement.earnedAt,
      description: achievement.description,
    }));
  }

  // Comprehensive Student Data Integration
  async getIntegratedStudentData(studentId: string): Promise<IntegratedStudentData> {
    const [observations, examResults, attendanceRecords, learningPlatformProgress] = await Promise.all([
      offlineStorage.getObservationsByStudent(studentId),
      this.fetchExamResults(studentId),
      this.fetchAttendanceRecords(studentId),
      this.fetchLearningPlatformProgress(studentId),
    ]);

    const integratedData: IntegratedStudentData = {
      studentId,
      observations,
      examResults,
      attendanceRecords,
      learningPlatformProgress,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the integrated data
    await offlineStorage.setSetting(`integratedData_${studentId}`, integratedData);

    return integratedData;
  }

  async getBatchIntegratedData(studentIds: string[]): Promise<Map<string, IntegratedStudentData>> {
    const results = new Map<string, IntegratedStudentData>();

    // Process in batches to avoid overwhelming the APIs
    const batchSize = 5;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getIntegratedStudentData(id));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batch.forEach((studentId, index) => {
          const result = batchResults[index];
          if (result.status === 'fulfilled') {
            results.set(studentId, result.value);
          } else {
            console.error(`Failed to get integrated data for student ${studentId}:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }

    return results;
  }

  // Helper Methods
  private async makeAuthenticatedRequest(
    system: 'examSystem' | 'attendanceSystem' | 'learningPlatform',
    method: string,
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    const systemConfig = this.config[system];
    
    const requestConfig: AxiosRequestConfig = {
      method: method as any,
      url: `${systemConfig.baseUrl}${endpoint}`,
      timeout: this.config.timeout,
      ...config,
    };

    // Add authentication headers
    if (systemConfig.apiKey) {
      requestConfig.headers = {
        ...requestConfig.headers,
        'X-API-Key': systemConfig.apiKey,
      };
    }

    if (systemConfig.authToken) {
      requestConfig.headers = {
        ...requestConfig.headers,
        'Authorization': `Bearer ${systemConfig.authToken}`,
      };
    }

    return await axios(requestConfig);
  }

  private setupAutoSync(): void {
    // Clear existing intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();

    if (this.config.syncInterval > 0) {
      const interval = setInterval(() => {
        this.performAutoSync();
      }, this.config.syncInterval * 60 * 1000); // Convert minutes to milliseconds

      this.syncIntervals.set('main', interval);
    }
  }

  private async performAutoSync(): Promise<void> {
    console.log('Performing automatic system integration sync...');

    try {
      // Get all students
      const students = await offlineStorage.getAllStudents();
      const studentIds = students.map(s => s.id);

      // Sync data for all students
      await this.getBatchIntegratedData(studentIds);
      
      console.log('Auto-sync completed successfully');
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  // Analytics and Insights
  async generateCorrelationInsights(studentId: string): Promise<{
    examObservationCorrelation: number;
    attendancePerformanceCorrelation: number;
    digitalLearningClassroomCorrelation: number;
    insights: string[];
  }> {
    const integratedData = await this.getIntegratedStudentData(studentId);
    
    const insights: string[] = [];
    
    // Calculate correlations (simplified)
    const examObservationCorrelation = this.calculateExamObservationCorrelation(
      integratedData.examResults,
      integratedData.observations
    );

    const attendancePerformanceCorrelation = this.calculateAttendancePerformanceCorrelation(
      integratedData.attendanceRecords,
      integratedData.observations
    );

    const digitalLearningClassroomCorrelation = this.calculateDigitalClassroomCorrelation(
      integratedData.learningPlatformProgress,
      integratedData.observations
    );

    // Generate insights based on correlations
    if (examObservationCorrelation > 0.7) {
      insights.push('Strong correlation between exam performance and classroom observations');
    }

    if (attendancePerformanceCorrelation < -0.5) {
      insights.push('Attendance issues may be impacting classroom performance');
    }

    if (digitalLearningClassroomCorrelation > 0.6) {
      insights.push('Digital learning progress aligns well with classroom behavior');
    }

    return {
      examObservationCorrelation,
      attendancePerformanceCorrelation,
      digitalLearningClassroomCorrelation,
      insights,
    };
  }

  private calculateExamObservationCorrelation(examResults: ExamResult[], observations: any[]): number {
    // Simplified correlation calculation
    if (examResults.length === 0 || observations.length === 0) return 0;

    const avgExamScore = examResults.reduce((sum, exam) => sum + exam.percentage, 0) / examResults.length;
    const avgObservationScore = observations.reduce((sum, obs) => {
      const scores = Object.values(obs.scores) as number[];
      const avgScore = scores.reduce((s, score) => s + score, 0) / scores.length;
      return sum + avgScore;
    }, 0) / observations.length;

    // Simple correlation approximation
    return (avgExamScore - 75) * (avgObservationScore - 3) > 0 ? 0.75 : -0.25;
  }

  private calculateAttendancePerformanceCorrelation(attendanceRecords: AttendanceRecord[], observations: any[]): number {
    if (attendanceRecords.length === 0 || observations.length === 0) return 0;

    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const attendanceRate = presentDays / attendanceRecords.length;

    const avgObservationScore = observations.reduce((sum, obs) => {
      const scores = Object.values(obs.scores) as number[];
      const avgScore = scores.reduce((s, score) => s + score, 0) / scores.length;
      return sum + avgScore;
    }, 0) / observations.length;

    // Correlation between attendance rate and performance
    return attendanceRate > 0.9 && avgObservationScore > 3.5 ? 0.8 : -0.3;
  }

  private calculateDigitalClassroomCorrelation(learningProgress: LearningPlatformProgress[], observations: any[]): number {
    if (learningProgress.length === 0 || observations.length === 0) return 0;

    const avgCompletion = learningProgress.reduce((sum, lp) => sum + lp.completionPercentage, 0) / learningProgress.length;
    const avgObservationScore = observations.reduce((sum, obs) => {
      const scores = Object.values(obs.scores) as number[];
      const avgScore = scores.reduce((s, score) => s + score, 0) / scores.length;
      return sum + avgScore;
    }, 0) / observations.length;

    return avgCompletion > 80 && avgObservationScore > 3.5 ? 0.7 : 0.2;
  }

  // Cleanup
  destroy(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const systemIntegration = new SystemIntegrationManager();

// Utility functions
export async function initializeSystemIntegration(config?: Partial<SystemIntegrationConfig>): Promise<void> {
  if (config) {
    await systemIntegration.updateConfig(config);
  }
  await systemIntegration.initialize();
}

export async function get360StudentProfile(studentId: string): Promise<IntegratedStudentData & {
  correlationInsights: any;
  summary: {
    academicTrend: 'improving' | 'stable' | 'declining';
    behaviorTrend: 'positive' | 'stable' | 'concerning';
    attendanceTrend: 'excellent' | 'good' | 'concerning';
    overallRisk: 'low' | 'medium' | 'high';
  };
}> {
  const [integratedData, correlationInsights] = await Promise.all([
    systemIntegration.getIntegratedStudentData(studentId),
    systemIntegration.generateCorrelationInsights(studentId),
  ]);

  // Generate summary
  const summary = {
    academicTrend: determineAcademicTrend(integratedData.examResults),
    behaviorTrend: determineBehaviorTrend(integratedData.observations),
    attendanceTrend: determineAttendanceTrend(integratedData.attendanceRecords),
    overallRisk: 'low' as 'low' | 'medium' | 'high',
  };

  // Calculate overall risk
  const riskFactors = [
    summary.academicTrend === 'declining' ? 1 : 0,
    summary.behaviorTrend === 'concerning' ? 1 : 0,
    summary.attendanceTrend === 'concerning' ? 1 : 0,
  ].reduce((sum, factor) => sum + factor, 0);

  summary.overallRisk = riskFactors >= 2 ? 'high' : riskFactors === 1 ? 'medium' : 'low';

  return {
    ...integratedData,
    correlationInsights,
    summary,
  };
}

function determineAcademicTrend(examResults: ExamResult[]): 'improving' | 'stable' | 'declining' {
  if (examResults.length < 2) return 'stable';

  const recent = examResults.slice(-3);
  const older = examResults.slice(-6, -3);

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, exam) => sum + exam.percentage, 0) / recent.length;
  const olderAvg = older.reduce((sum, exam) => sum + exam.percentage, 0) / older.length;

  const diff = recentAvg - olderAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function determineBehaviorTrend(observations: any[]): 'positive' | 'stable' | 'concerning' {
  if (observations.length < 2) return 'stable';

  const recent = observations.slice(-5);
  const recentAvg = recent.reduce((sum, obs) => {
    const scores = Object.values(obs.scores) as number[];
    return sum + scores.reduce((s, score) => s + score, 0) / scores.length;
  }, 0) / recent.length;

  if (recentAvg >= 4) return 'positive';
  if (recentAvg <= 2.5) return 'concerning';
  return 'stable';
}

function determineAttendanceTrend(attendanceRecords: AttendanceRecord[]): 'excellent' | 'good' | 'concerning' {
  if (attendanceRecords.length === 0) return 'good';

  const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
  const attendanceRate = presentDays / attendanceRecords.length;

  if (attendanceRate >= 0.95) return 'excellent';
  if (attendanceRate >= 0.85) return 'good';
  return 'concerning';
}