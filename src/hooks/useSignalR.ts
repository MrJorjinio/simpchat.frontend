import { useEffect, useState } from 'react';
import { signalRService, type SignalREventHandlers } from '../services/signalr.service';
import { HubConnectionState } from '@microsoft/signalr';

export const useSignalR = (handlers?: SignalREventHandlers) => {
  const [connectionState, setConnectionState] = useState<HubConnectionState>(
    signalRService.getConnectionState()
  );
  const [isConnected, setIsConnected] = useState(signalRService.isConnected());

  useEffect(() => {
    // Set event handlers if provided
    if (handlers) {
      signalRService.setEventHandlers(handlers);
    }

    // Update connection state periodically
    const interval = setInterval(() => {
      setConnectionState(signalRService.getConnectionState());
      setIsConnected(signalRService.isConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, [handlers]);

  return {
    connectionState,
    isConnected,
    joinChat: signalRService.joinChat.bind(signalRService),
    leaveChat: signalRService.leaveChat.bind(signalRService),
    sendMessage: signalRService.sendMessage.bind(signalRService),
    editMessage: signalRService.editMessage.bind(signalRService),
    deleteMessage: signalRService.deleteMessage.bind(signalRService),
    addReaction: signalRService.addReaction.bind(signalRService),
    removeReaction: signalRService.removeReaction.bind(signalRService),
    sendTyping: signalRService.sendTyping.bind(signalRService),
    sendStopTyping: signalRService.sendStopTyping.bind(signalRService),
    markNotificationsAsSeen: signalRService.markNotificationsAsSeen.bind(signalRService),
    getPresenceStates: signalRService.getPresenceStates.bind(signalRService),
  };
};
