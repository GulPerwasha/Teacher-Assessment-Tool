import axios, { AxiosResponse } from 'axios';
import { offlineStorage } from './offlineStorage';

export interface WhatsAppConfig {
  apiUrl: string;
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  businessAccountId: string;
  version: string;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'document' | 'template';
  content: {
    text?: string;
    image?: {
      url: string;
      caption?: string;
    };
    document?: {
      url: string;
      filename: string;
      caption?: string;
    };
    template?: {
      name: string;
      language: string;
      components?: any[];
    };
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
    text?: string;
    example?: any;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }[];
}

export interface WhatsAppContact {
  wa_id: string;
  input: string;
  status: 'valid' | 'invalid' | 'processing';
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  error?: {
    code: number;
    title: string;
    message: string;
  };
}

class WhatsAppAPIManager {
  private config: WhatsAppConfig | null = null;
  private isInitialized = false;
  private messageQueue: Array<{
    message: WhatsAppMessage;
    resolve: Function;
    reject: Function;
    retries: number;
  }> = [];
  private processingQueue = false;

  async initialize(config: WhatsAppConfig): Promise<void> {
    this.config = config;
    
    // Store config securely
    await offlineStorage.setSetting('whatsappConfig', config);
    
    // Validate configuration
    const isValid = await this.validateConfiguration();
    if (!isValid) {
      throw new Error('Invalid WhatsApp API configuration');
    }
    
    this.isInitialized = true;
    console.log('WhatsApp API manager initialized');
    
    // Start processing queued messages
    this.processMessageQueue();
  }

  private async validateConfiguration(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      // Test API connection
      const response = await this.makeAPIRequest('GET', `/${this.config.phoneNumberId}`);
      return response.status === 200;
    } catch (error) {
      console.error('WhatsApp API validation failed:', error);
      return false;
    }
  }

  // Message Sending
  async sendMessage(message: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isInitialized || !this.config) {
      return { success: false, error: 'WhatsApp API not initialized' };
    }

    return new Promise((resolve, reject) => {
      this.messageQueue.push({
        message,
        resolve,
        reject,
        retries: 0,
      });

      if (!this.processingQueue) {
        this.processMessageQueue();
      }
    });
  }

  private async processMessageQueue(): Promise<void> {
    if (this.processingQueue || this.messageQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const queueItem = this.messageQueue.shift()!;
      
      try {
        const result = await this.sendSingleMessage(queueItem.message);
        queueItem.resolve(result);
      } catch (error) {
        queueItem.retries++;
        
        if (queueItem.retries < 3) {
          // Retry after delay
          setTimeout(() => {
            this.messageQueue.unshift(queueItem);
          }, 5000 * queueItem.retries);
        } else {
          queueItem.reject(error);
        }
      }
      
      // Rate limiting: Wait between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.processingQueue = false;
  }

  private async sendSingleMessage(message: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const payload = this.buildMessagePayload(message);
      
      const response = await this.makeAPIRequest(
        'POST',
        `/${this.config!.phoneNumberId}/messages`,
        payload
      );

      if (response.data?.messages?.[0]?.id) {
        const messageId = response.data.messages[0].id;
        
        // Store message for tracking
        await this.storeMessage(messageId, message);
        
        return {
          success: true,
          messageId,
        };
      } else {
        throw new Error('Invalid response from WhatsApp API');
      }
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error);
      
      let errorMessage = 'Failed to send message';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildMessagePayload(message: WhatsAppMessage): any {
    const basePayload = {
      messaging_product: 'whatsapp',
      to: message.to,
      type: message.type,
    };

    switch (message.type) {
      case 'text':
        return {
          ...basePayload,
          text: {
            body: message.content.text,
          },
        };

      case 'image':
        return {
          ...basePayload,
          image: {
            link: message.content.image?.url,
            caption: message.content.image?.caption,
          },
        };

      case 'document':
        return {
          ...basePayload,
          document: {
            link: message.content.document?.url,
            filename: message.content.document?.filename,
            caption: message.content.document?.caption,
          },
        };

      case 'template':
        return {
          ...basePayload,
          template: {
            name: message.content.template?.name,
            language: {
              code: message.content.template?.language || 'en_US',
            },
            components: message.content.template?.components || [],
          },
        };

      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
  }

  // Template Management
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    if (!this.isInitialized || !this.config) {
      throw new Error('WhatsApp API not initialized');
    }

    try {
      const response = await this.makeAPIRequest(
        'GET',
        `/${this.config.businessAccountId}/message_templates`
      );

      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch WhatsApp templates:', error);
      return [];
    }
  }

  async createTemplate(template: Omit<WhatsAppTemplate, 'id' | 'status'>): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    if (!this.isInitialized || !this.config) {
      return { success: false, error: 'WhatsApp API not initialized' };
    }

    try {
      const response = await this.makeAPIRequest(
        'POST',
        `/${this.config.businessAccountId}/message_templates`,
        template
      );

      if (response.data?.id) {
        return {
          success: true,
          templateId: response.data.id,
        };
      } else {
        throw new Error('Invalid response from WhatsApp API');
      }
    } catch (error: any) {
      console.error('Failed to create WhatsApp template:', error);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to create template',
      };
    }
  }

  // Contact Management
  async validatePhoneNumbers(phoneNumbers: string[]): Promise<WhatsAppContact[]> {
    if (!this.isInitialized || !this.config) {
      throw new Error('WhatsApp API not initialized');
    }

    try {
      const response = await this.makeAPIRequest(
        'POST',
        `/${this.config.phoneNumberId}/contacts`,
        {
          contacts: phoneNumbers.map(number => ({ input: number })),
        }
      );

      return response.data?.contacts || [];
    } catch (error) {
      console.error('Failed to validate phone numbers:', error);
      return [];
    }
  }

  // Message Status Tracking
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    try {
      // In a real implementation, this would query the WhatsApp API
      // For now, we'll check our local storage
      const storedMessage = await offlineStorage.getSetting(`whatsapp_message_${messageId}`);
      return storedMessage?.status || null;
    } catch (error) {
      console.error('Failed to get message status:', error);
      return null;
    }
  }

  private async storeMessage(messageId: string, message: WhatsAppMessage): Promise<void> {
    const messageRecord = {
      id: messageId,
      message,
      timestamp: Date.now(),
      status: 'sent' as MessageStatus['status'],
    };

    await offlineStorage.setSetting(`whatsapp_message_${messageId}`, messageRecord);
  }

  // Webhook Handling
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (!this.config) return null;
    
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    
    return null;
  }

  async handleWebhookEvent(body: any): Promise<void> {
    try {
      if (body?.entry?.[0]?.changes?.[0]?.value?.statuses) {
        // Handle message status updates
        const statuses = body.entry[0].changes[0].value.statuses;
        
        for (const status of statuses) {
          await this.updateMessageStatus(status.id, status.status, status.timestamp);
        }
      }

      if (body?.entry?.[0]?.changes?.[0]?.value?.messages) {
        // Handle incoming messages (if needed)
        const messages = body.entry[0].changes[0].value.messages;
        console.log('Received incoming messages:', messages);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
    }
  }

  private async updateMessageStatus(
    messageId: string, 
    status: MessageStatus['status'], 
    timestamp: number
  ): Promise<void> {
    const messageRecord = await offlineStorage.getSetting(`whatsapp_message_${messageId}`);
    
    if (messageRecord) {
      messageRecord.status.status = status;
      messageRecord.status.timestamp = timestamp;
      
      await offlineStorage.setSetting(`whatsapp_message_${messageId}`, messageRecord);
    }
  }

  // Utility Methods
  formatPhoneNumber(phoneNumber: string, countryCode = '+1'): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!digits.startsWith(countryCode.replace('+', ''))) {
      return `${countryCode}${digits}`;
    }
    
    return `+${digits}`;
  }

  async getMediaUrl(mediaId: string): Promise<string | null> {
    if (!this.isInitialized || !this.config) {
      return null;
    }

    try {
      const response = await this.makeAPIRequest('GET', `/${mediaId}`);
      return response.data?.url || null;
    } catch (error) {
      console.error('Failed to get media URL:', error);
      return null;
    }
  }

  private async makeAPIRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<AxiosResponse> {
    if (!this.config) {
      throw new Error('WhatsApp API not configured');
    }

    const url = `${this.config.apiUrl}/${this.config.version}${endpoint}`;
    
    const config: any = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    return await axios(config);
  }

  // Pre-built Templates for Education
  getEducationTemplates(): Array<Omit<WhatsAppTemplate, 'id' | 'status'>> {
    return [
      {
        name: 'weekly_progress_update',
        category: 'UTILITY',
        language: 'en_US',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Weekly Progress Update',
          },
          {
            type: 'BODY',
            text: 'Dear {{1}}, here is {{2}}\'s progress for the week of {{3}}:\n\n📊 Overall Progress: {{4}}\n🌟 Key Achievements:\n{{5}}\n🎯 Areas for Growth:\n{{6}}\n\nPlease feel free to reach out if you have any questions.',
          },
          {
            type: 'FOOTER',
            text: 'Sent from your school\'s teacher assessment system',
          },
        ],
      },
      {
        name: 'behavior_alert',
        category: 'UTILITY',
        language: 'en_US',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: '⚠️ Behavior Alert',
          },
          {
            type: 'BODY',
            text: 'Dear {{1}}, I wanted to inform you about {{2}}\'s behavior today:\n\n{{3}}\n\nLet\'s work together to support {{2}}. Please let me know when you\'re available for a brief conversation.',
          },
          {
            type: 'FOOTER',
            text: 'Your child\'s teacher',
          },
        ],
      },
      {
        name: 'achievement_celebration',
        category: 'UTILITY',
        language: 'en_US',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: '🎉 Great News!',
          },
          {
            type: 'BODY',
            text: 'Dear {{1}}, I\'m excited to share that {{2}} has achieved something wonderful:\n\n{{3}}\n\nPlease celebrate this achievement with {{2}} at home!',
          },
          {
            type: 'FOOTER',
            text: 'Proud teacher',
          },
        ],
      },
    ];
  }

  // Batch Messaging
  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{
      to: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (message) => {
        const result = await this.sendMessage(message);
        return {
          to: message.to,
          ...result,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Count successful/failed
      batchResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      // Rate limiting delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { successful, failed, results };
  }

  // Configuration Management
  async updateConfig(config: Partial<WhatsAppConfig>): Promise<void> {
    if (this.config) {
      this.config = { ...this.config, ...config };
      await offlineStorage.setSetting('whatsappConfig', this.config);
    }
  }

  getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.isInitialized && !!this.config;
  }
}

// Export singleton instance
export const whatsAppAPI = new WhatsAppAPIManager();

// Utility functions
export async function initializeWhatsApp(config: WhatsAppConfig): Promise<void> {
  await whatsAppAPI.initialize(config);
}

export async function sendParentNotification(
  parentPhone: string,
  studentName: string,
  parentName: string,
  message: string,
  type: 'progress' | 'alert' | 'achievement' = 'progress'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = whatsAppAPI.formatPhoneNumber(parentPhone);
  
  const whatsAppMessage: WhatsAppMessage = {
    to: formattedPhone,
    type: 'text',
    content: {
      text: message,
    },
  };

  return await whatsAppAPI.sendMessage(whatsAppMessage);
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  parameters: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message: WhatsAppMessage = {
    to: whatsAppAPI.formatPhoneNumber(to),
    type: 'template',
    content: {
      template: {
        name: templateName,
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: parameters.map((param, index) => ({
              type: 'text',
              text: param,
            })),
          },
        ],
      },
    },
  };

  return await whatsAppAPI.sendMessage(message);
}