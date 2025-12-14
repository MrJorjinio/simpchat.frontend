import * as signalR from '@microsoft/signalr';

interface UserStatusDto {
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
}

interface ReceiveMessageDto {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  replyId: string | null;
  sentAt: string;
}

interface MessageEditedDto {
  messageId: string;
  chatId: string;
  content: string;
  editedAt: string;
}

interface MessageDeletedDto {
  messageId: string;
  chatId: string;
  deletedAt: string;
}

interface ReactionDto {
  messageId: string;
  reactionId: string;
  userId: string;
  chatId: string;
}

interface TypingDto {
  userId: string;
  chatId: string;
  timestamp?: string;
}

interface NewNotificationDto {
  messageId: string;
  chatId: string;
  chatName: string;
  chatAvatar: string;
  senderName: string;
  content: string;
  fileUrl: string | null;
  sentTime: string;
}

export type SignalREventHandlers = {
  onUserOnline?: (status: UserStatusDto) => void;
  onUserOffline?: (status: UserStatusDto) => void;
  onReceiveMessage?: (message: ReceiveMessageDto) => void;
  onMessageEdited?: (data: MessageEditedDto) => void;
  onMessageDeleted?: (data: MessageDeletedDto) => void;
  onReactionAdded?: (data: ReactionDto) => void;
  onReactionRemoved?: (data: ReactionDto) => void;
  onUserTyping?: (data: TypingDto) => void;
  onUserStoppedTyping?: (data: TypingDto) => void;
  onNewNotification?: (notification: NewNotificationDto) => void;
  onNotificationsMarkedSeen?: (data: { notificationIds: string[] }) => void;
  onError?: (error: { error: string }) => void;
};

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private eventHandlers: SignalREventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isManualDisconnect = false;

  constructor() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const hubUrl = apiUrl.replace('/api', '/hubs/chat');

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('token');
          return token || '';
        },
        skipNegotiation: false,
        withCredentials: true,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null; // Stop reconnecting
          }
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 32000);
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupConnectionHandlers();
    this.setupEventListeners();
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      console.warn('SignalR reconnecting...', error);
      this.reconnectAttempts++;
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.reconnectAttempts = 0;
      // Re-join chats after reconnection
      this.rejoinChats();
    });

    this.connection.onclose((error) => {
      console.error('SignalR connection closed:', error);
      if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        // Attempt manual reconnection
        setTimeout(() => this.start(), 5000);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.connection) return;

    // Presence events
    this.connection.on('UserOnline', (status: UserStatusDto) => {
      this.eventHandlers.onUserOnline?.(status);
    });

    this.connection.on('UserOffline', (status: UserStatusDto) => {
      this.eventHandlers.onUserOffline?.(status);
    });

    // Message events
    this.connection.on('ReceiveMessage', (message: ReceiveMessageDto) => {
      this.eventHandlers.onReceiveMessage?.(message);
    });

    this.connection.on('MessageEdited', (data: MessageEditedDto) => {
      this.eventHandlers.onMessageEdited?.(data);
    });

    this.connection.on('MessageDeleted', (data: MessageDeletedDto) => {
      this.eventHandlers.onMessageDeleted?.(data);
    });

    // Reaction events
    this.connection.on('ReactionAdded', (data: ReactionDto) => {
      this.eventHandlers.onReactionAdded?.(data);
    });

    this.connection.on('ReactionRemoved', (data: ReactionDto) => {
      this.eventHandlers.onReactionRemoved?.(data);
    });

    // Typing events
    this.connection.on('UserTyping', (data: TypingDto) => {
      this.eventHandlers.onUserTyping?.(data);
    });

    this.connection.on('UserStoppedTyping', (data: TypingDto) => {
      this.eventHandlers.onUserStoppedTyping?.(data);
    });

    // Notification events
    this.connection.on('NewNotification', (notification: NewNotificationDto) => {
      this.eventHandlers.onNewNotification?.(notification);
    });

    this.connection.on('NotificationsMarkedSeen', (data: { notificationIds: string[] }) => {
      this.eventHandlers.onNotificationsMarkedSeen?.(data);
    });

    // Error events
    this.connection.on('Error', (error: { error: string }) => {
      console.error('SignalR Error:', error);
      this.eventHandlers.onError?.(error);
    });
  }

  public setEventHandlers(handlers: SignalREventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public async start(): Promise<void> {
    if (!this.connection) return;

    try {
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        this.isManualDisconnect = false;
        await this.connection.start();
        console.log('SignalR Connected:', this.connection.connectionId);
      }
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      throw error;
    }
  }

  public async getPresenceStates(userIds: string[]): Promise<Record<string, boolean>> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn('Cannot fetch presence states: not connected');
      return {};
    }

    try {
      const presenceStates = await this.connection.invoke<Record<string, boolean>>('GetPresenceStates', userIds);
      console.log(`Fetched initial presence states for ${userIds.length} users`);
      return presenceStates;
    } catch (error) {
      console.error('Error fetching presence states:', error);
      return {};
    }
  }

  public async stop(): Promise<void> {
    if (!this.connection) return;

    try {
      this.isManualDisconnect = true;
      await this.connection.stop();
      console.log('SignalR Disconnected');
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
    }
  }

  public getConnectionState(): signalR.HubConnectionState {
    return this.connection?.state || signalR.HubConnectionState.Disconnected;
  }

  public isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  // Chat room management
  private activeChats: Set<string> = new Set();

  public async joinChat(chatId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('JoinChat', chatId);
      this.activeChats.add(chatId);
      console.log('Joined chat:', chatId);
    } catch (error) {
      console.error('Error joining chat:', error);
      throw error;
    }
  }

  public async leaveChat(chatId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) return;

    try {
      await this.connection.invoke('LeaveChat', chatId);
      this.activeChats.delete(chatId);
      console.log('Left chat:', chatId);
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  }

  private async rejoinChats(): Promise<void> {
    // Re-join all chats after reconnection
    const chats = Array.from(this.activeChats);
    for (const chatId of chats) {
      try {
        await this.connection?.invoke('JoinChat', chatId);
      } catch (error) {
        console.error('Error rejoining chat:', chatId, error);
      }
    }
  }

  // Message operations
  public async sendMessage(
    chatId: string | null,
    content: string,
    receiverId: string | null = null,
    replyId: string | null = null
  ): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('SendMessage', {
        chatId,
        content,
        receiverId,
        replyId,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  public async editMessage(chatId: string, messageId: string, content: string): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('EditMessage', chatId, messageId, content);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  public async deleteMessage(chatId: string, messageId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('DeleteMessage', chatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Reaction operations
  public async addReaction(chatId: string, messageId: string, reactionId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('AddReaction', chatId, messageId, reactionId);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  public async removeReaction(chatId: string, messageId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('RemoveReaction', chatId, messageId);
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Typing indicators
  public async sendTyping(chatId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) return;

    try {
      await this.connection.invoke('Typing', chatId);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  public async sendStopTyping(chatId: string): Promise<void> {
    if (!this.connection || !this.isConnected()) return;

    try {
      await this.connection.invoke('StopTyping', chatId);
    } catch (error) {
      console.error('Error sending stop typing indicator:', error);
    }
  }

  // Notification operations
  public async markNotificationsAsSeen(notificationIds: string[]): Promise<void> {
    if (!this.connection || !this.isConnected()) {
      throw new Error('SignalR not connected');
    }

    try {
      await this.connection.invoke('MarkAsSeen', notificationIds);
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();
