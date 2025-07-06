import { db, users, notifications } from '../models/db.js';
import { redisService } from '../services/redis.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class EmailProcessor {
  constructor() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      sent: 0,
      startTime: new Date()
    };
    
    // Email configuration (would be loaded from environment)
    this.emailConfig = {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.EMAIL_FROM || 'noreply@chatapp.com',
      templates: {
        welcome: 'welcome',
        messageNotification: 'message-notification',
        groupInvite: 'group-invite',
        passwordReset: 'password-reset'
      }
    };
  }

  async processEmail(emailData, rabbitMsg) {
    try {
      const { type = 'SEND_EMAIL', ...data } = emailData;
      
      console.log(`📧 Processing email type: ${type}`);
      
      if (!this.emailConfig.enabled) {
        console.log('📧 Email service is disabled, skipping email processing');
        return;
      }
      
      switch (type) {
        case 'SEND_EMAIL':
          await this.handleSendEmail(data);
          break;
        case 'WELCOME_EMAIL':
          await this.handleWelcomeEmail(data);
          break;
        case 'MESSAGE_NOTIFICATION':
          await this.handleMessageNotificationEmail(data);
          break;
        case 'GROUP_INVITE':
          await this.handleGroupInviteEmail(data);
          break;
        case 'PASSWORD_RESET':
          await this.handlePasswordResetEmail(data);
          break;
        case 'BULK_EMAIL':
          await this.handleBulkEmail(data);
          break;
        default:
          console.warn(`⚠️ Unknown email type: ${type}`);
      }
      
      this.processingStats.processed++;
    } catch (error) {
      this.processingStats.failed++;
      console.error('❌ Error processing email:', error);
      throw error;
    }
  }

  async handleSendEmail(data) {
    const {
      to,
      subject,
      template,
      templateData = {},
      priority = 'normal',
      userId = null
    } = data;

    try {
      // Validate required fields
      if (!to || !subject) {
        throw new Error('Missing required fields: to, subject');
      }

      // Check if user has email preferences (if userId provided)
      if (userId) {
        const emailAllowed = await this.checkEmailPreferences(userId);
        if (!emailAllowed) {
          console.log(`📧 Email notifications disabled for user: ${userId}`);
          return;
        }
      }

      // Rate limiting check
      const rateLimitKey = `email_rate_limit:${to}`;
      const emailCount = await redisService.client.get(rateLimitKey);
      
      if (emailCount && parseInt(emailCount) >= 10) { // Max 10 emails per hour
        console.log(`📧 Rate limit exceeded for email: ${to}`);
        return;
      }

      // Generate email content
      const emailContent = await this.generateEmailContent(template, templateData, subject);
      
      // Send email (mock implementation - replace with actual email service)
      const emailResult = await this.sendEmailViaProvider({
        to,
        subject,
        html: emailContent.html,
        text: emailContent.text,
        priority
      });

      // Update rate limiting
      await redisService.client.incr(rateLimitKey);
      await redisService.client.expire(rateLimitKey, 3600); // 1 hour

      // Log email sent
      await this.logEmailSent({
        to,
        subject,
        template,
        userId,
        messageId: emailResult.messageId,
        status: 'sent'
      });

      this.processingStats.sent++;
      console.log(`✅ Email sent successfully to: ${to}`);
      return emailResult;

    } catch (error) {
      console.error('❌ Error handling send email:', error);
      
      // Log failed email
      await this.logEmailSent({
        to: data.to,
        subject: data.subject,
        template: data.template,
        userId: data.userId,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  async handleWelcomeEmail(data) {
    const { userId, email, username } = data;

    try {
      await this.handleSendEmail({
        to: email,
        subject: 'Welcome to ChatApp!',
        template: this.emailConfig.templates.welcome,
        templateData: {
          username,
          appName: 'ChatApp',
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
        },
        userId,
        priority: 'high'
      });

      console.log(`✅ Welcome email sent to: ${email}`);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      throw error;
    }
  }

  async handleMessageNotificationEmail(data) {
    const { userId, senderName, messagePreview, isGroupMessage, groupName } = data;

    try {
      // Get user email and preferences
      const user = await db.select({
        email: users.email,
        username: users.username,
        emailNotifications: users.emailNotifications
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

      if (user.length === 0 || !user[0].emailNotifications) {
        console.log(`📧 Email notifications disabled for user: ${userId}`);
        return;
      }

      const subject = isGroupMessage 
        ? `New message in ${groupName}`
        : `New message from ${senderName}`;

      await this.handleSendEmail({
        to: user[0].email,
        subject,
        template: this.emailConfig.templates.messageNotification,
        templateData: {
          username: user[0].username,
          senderName,
          messagePreview,
          isGroupMessage,
          groupName,
          chatUrl: `${process.env.FRONTEND_URL}/chat`
        },
        userId,
        priority: 'normal'
      });

      console.log(`✅ Message notification email sent to: ${user[0].email}`);
    } catch (error) {
      console.error('❌ Error sending message notification email:', error);
      throw error;
    }
  }

  async handleGroupInviteEmail(data) {
    const { userId, inviterName, groupName, inviteCode } = data;

    try {
      // Get user email
      const user = await db.select({
        email: users.email,
        username: users.username
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

      if (user.length === 0) {
        throw new Error('User not found');
      }

      await this.handleSendEmail({
        to: user[0].email,
        subject: `You've been invited to join ${groupName}`,
        template: this.emailConfig.templates.groupInvite,
        templateData: {
          username: user[0].username,
          inviterName,
          groupName,
          inviteCode,
          joinUrl: `${process.env.FRONTEND_URL}/join/${inviteCode}`
        },
        userId,
        priority: 'high'
      });

      console.log(`✅ Group invite email sent to: ${user[0].email}`);
    } catch (error) {
      console.error('❌ Error sending group invite email:', error);
      throw error;
    }
  }

  async handlePasswordResetEmail(data) {
    const { email, resetToken, username } = data;

    try {
      await this.handleSendEmail({
        to: email,
        subject: 'Password Reset Request',
        template: this.emailConfig.templates.passwordReset,
        templateData: {
          username,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
          expiryTime: '1 hour'
        },
        priority: 'high'
      });

      console.log(`✅ Password reset email sent to: ${email}`);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }

  async handleBulkEmail(data) {
    const { userIds, subject, template, templateData, priority = 'low' } = data;

    try {
      // Get user emails
      const users = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        emailNotifications: users.emailNotifications
      })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.emailNotifications, true)
      ));

      const filteredUsers = userIds 
        ? users.filter(user => userIds.includes(user.id))
        : users;

      console.log(`📧 Sending bulk email to ${filteredUsers.length} users`);

      // Send emails in batches to avoid overwhelming the email service
      const batchSize = 10;
      for (let i = 0; i < filteredUsers.length; i += batchSize) {
        const batch = filteredUsers.slice(i, i + batchSize);
        
        const emailPromises = batch.map(user => 
          this.handleSendEmail({
            to: user.email,
            subject,
            template,
            templateData: {
              ...templateData,
              username: user.username
            },
            userId: user.id,
            priority
          }).catch(error => {
            console.error(`Failed to send email to ${user.email}:`, error);
            return null;
          })
        );

        await Promise.all(emailPromises);
        
        // Small delay between batches
        if (i + batchSize < filteredUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Bulk email processing completed`);
    } catch (error) {
      console.error('❌ Error sending bulk email:', error);
      throw error;
    }
  }

  // Check user email preferences
  async checkEmailPreferences(userId) {
    try {
      const user = await db.select({
        emailNotifications: users.emailNotifications,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

      return user.length > 0 && user[0].isActive && user[0].emailNotifications;
    } catch (error) {
      console.error('Error checking email preferences:', error);
      return false;
    }
  }

  // Generate email content from template
  async generateEmailContent(template, templateData, subject) {
    // This is a simplified template system
    // In production, you'd use a proper template engine like Handlebars or Mustache
    
    const templates = {
      welcome: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to {{appName}}, {{username}}!</h1>
            <p>Thank you for joining our chat application. You can now start connecting with friends and colleagues.</p>
            <a href="{{loginUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Chatting</a>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">If you have any questions, feel free to contact our support team.</p>
          </div>
        `,
        text: `Welcome to {{appName}}, {{username}}! Thank you for joining our chat application. Visit {{loginUrl}} to start chatting.`
      },
      'message-notification': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">{{#if isGroupMessage}}New message in {{groupName}}{{else}}New message from {{senderName}}{{/if}}</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 0;">{{messagePreview}}</p>
            </div>
            <a href="{{chatUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Message</a>
          </div>
        `,
        text: `{{#if isGroupMessage}}New message in {{groupName}}{{else}}New message from {{senderName}}{{/if}}: {{messagePreview}}. Visit {{chatUrl}} to view.`
      },
      'group-invite': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">You've been invited to join {{groupName}}</h2>
            <p>{{inviterName}} has invited you to join the group "{{groupName}}".</p>
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Invite Code:</strong> {{inviteCode}}</p>
            </div>
            <a href="{{joinUrl}}" style="background-color: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Group</a>
          </div>
        `,
        text: `You've been invited to join {{groupName}} by {{inviterName}}. Use invite code: {{inviteCode}} or visit {{joinUrl}}`
      },
      'password-reset': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi {{username}}, you requested a password reset for your account.</p>
            <p>Click the button below to reset your password. This link will expire in {{expiryTime}}.</p>
            <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `Hi {{username}}, you requested a password reset. Visit {{resetUrl}} to reset your password. Link expires in {{expiryTime}}.`
      }
    };

    const templateContent = templates[template] || templates.welcome;
    
    // Simple template replacement (in production, use a proper template engine)
    let html = templateContent.html;
    let text = templateContent.text;
    
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, templateData[key] || '');
      text = text.replace(regex, templateData[key] || '');
    });

    return { html, text };
  }

  // Mock email sending (replace with actual email service)
  async sendEmailViaProvider(emailData) {
    const { to, subject, html, text, priority } = emailData;
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, integrate with actual email service:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - SMTP
    
    console.log(`📧 [MOCK] Sending email to: ${to}, Subject: ${subject}`);
    
    return {
      messageId: uuidv4(),
      status: 'sent',
      timestamp: new Date()
    };
  }

  // Log email activity
  async logEmailSent(emailLog) {
    try {
      const logKey = `email_log:${new Date().toISOString().split('T')[0]}`;
      const logEntry = {
        ...emailLog,
        timestamp: new Date().toISOString()
      };
      
      await redisService.client.lPush(logKey, JSON.stringify(logEntry));
      await redisService.client.expire(logKey, 7 * 24 * 3600); // Keep logs for 7 days
      
      // Trim list to keep only last 1000 entries
      await redisService.client.lTrim(logKey, 0, 999);
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  // Get processing statistics
  getStats() {
    const uptime = new Date() - this.processingStats.startTime;
    return {
      ...this.processingStats,
      uptime: Math.floor(uptime / 1000), // in seconds
      rate: this.processingStats.processed / (uptime / 1000 / 60), // emails per minute
      successRate: this.processingStats.processed > 0 
        ? (this.processingStats.sent / this.processingStats.processed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Reset statistics
  resetStats() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      sent: 0,
      startTime: new Date()
    };
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.emailConfig.enabled) {
        return { status: 'disabled', message: 'Email service is disabled' };
      }
      
      // Test email configuration
      // In production, you'd test the actual email service connection
      return { 
        status: 'healthy', 
        provider: this.emailConfig.provider,
        stats: this.getStats()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message 
      };
    }
  }
}

export const emailProcessor = new EmailProcessor();