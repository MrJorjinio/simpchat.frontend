import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardLayout } from './components/DashboardLayout';
import { useAuthStore } from './stores/authStore';
import { signalRService } from './services/signalr.service';
import { useChatStore } from './stores/chatStore';
import { useNotificationStore } from './stores/notificationStore';
import { ToastContainer, toastStore } from './components/common/Toast';
import type { ToastMessage } from './components/common/Toast';
import { ConfirmModalContainer } from './components/common/ConfirmModal';

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  console.log('[AppRoutes] Rendering with isAuthenticated:', isAuthenticated);

  return (
    <Routes>
      {/* Landing Page */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />

      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />}
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to landing or dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Subscribe to toast store
  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const handleToastClose = (id: string) => {
    toastStore.remove(id);
  };

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('[App] Initializing auth from localStorage...');
      await useAuthStore.getState().initializeAuth();
      console.log('[App] Auth initialization complete');
    };
    initAuth();
  }, []);

  // Initialize SignalR when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[App] Not authenticated, skipping SignalR initialization');
      return;
    }

    console.log('[App] Setting up SignalR event handlers...');

    // Get store methods
    const chatStore = useChatStore.getState();
    const notificationStore = useNotificationStore.getState();

    // Set up event handlers
    signalRService.setEventHandlers({
      onUserOnline: (status) => {
        chatStore.handleUserOnline(status);
      },
      onUserOffline: (status) => {
        chatStore.handleUserOffline({
          ...status,
          lastSeen: status.lastSeen || new Date().toISOString(),
        });
      },
      onReceiveMessage: (message) => {
        chatStore.handleReceiveMessage(message);
      },
      onMessageEdited: (data) => {
        chatStore.handleMessageEdited(data);
      },
      onMessageDeleted: (data) => {
        chatStore.handleMessageDeleted(data);
      },
      onReactionAdded: (data) => {
        chatStore.handleReactionAdded(data);
      },
      onReactionRemoved: (data) => {
        chatStore.handleReactionRemoved(data);
      },
      onUserTyping: (data) => {
        chatStore.handleUserTyping(data);
      },
      onUserStoppedTyping: (data) => {
        chatStore.handleUserStoppedTyping(data);
      },
      onNewNotification: (notification) => {
        notificationStore.handleNewNotification(notification);
      },
      onMessagePinned: (data) => {
        chatStore.handleMessagePinned(data);
      },
      onMessageUnpinned: (data) => {
        chatStore.handleMessageUnpinned(data);
      },
      onAddedToChat: (data) => {
        chatStore.handleAddedToChat(data);
      },
      onNewConversation: (data) => {
        chatStore.handleNewConversation(data);
      },
      onConversationCreated: (data) => {
        chatStore.handleConversationCreated(data);
      },
      // Permission events
      onPermissionGranted: (data) => {
        chatStore.handlePermissionGranted(data);
      },
      onPermissionRevoked: (data) => {
        chatStore.handlePermissionRevoked(data);
      },
      onAllPermissionsRevoked: (data) => {
        chatStore.handleAllPermissionsRevoked(data);
      },
      // Block events
      onUserBlockedYou: (data) => {
        chatStore.handleUserBlockedYou(data);
      },
      onYouBlockedUser: (data) => {
        chatStore.handleYouBlockedUser(data);
      },
      onUserUnblockedYou: (data) => {
        chatStore.handleUserUnblockedYou(data);
      },
      onYouUnblockedUser: (data) => {
        chatStore.handleYouUnblockedUser(data);
      },
      // Chat deletion events
      onChatDeleted: (data) => {
        chatStore.handleChatDeleted(data);
      },
      onRemovedFromChat: (data) => {
        chatStore.handleRemovedFromChat(data);
      },
      // Read receipt events
      onMessagesMarkedSeen: (data) => {
        chatStore.handleMessagesMarkedSeen(data);
      },
      onError: (error) => {
        console.error('[App] SignalR Error:', error);
      },
    });

    // Start SignalR connection
    const startSignalR = async () => {
      try {
        console.log('[App] Starting SignalR connection...');
        await signalRService.start();
        console.log('[App] SignalR connected successfully');

        // Initialize presence states for all users
        const chatStore = useChatStore.getState();

        // Ensure chats are loaded first
        if (chatStore.chats.length === 0) {
          console.log('[App] Loading chats before fetching presence states...');
          await chatStore.loadChats();
        }

        // Collect all unique user IDs from all chats
        // Note: Chat list may not include member details, so we also extract from DM chat names
        const allUserIds = new Set<string>();

        // Try to get user IDs from members array (when available)
        chatStore.chats.forEach(chat => {
          if (chat.members) {
            chat.members.forEach(m => {
              const userId = m.userId || m.id || m.user?.id;
              if (userId) allUserIds.add(userId);
            });
          }
        });

        // For DM chats, we may need to fetch the profile to get the other user's ID
        // This will be handled when the user clicks on a chat

        const userIdArray = Array.from(allUserIds);
        if (userIdArray.length > 0) {
          console.log('[App] Fetching presence states for', userIdArray.length, 'users:', userIdArray);
          try {
            const presenceStates = await signalRService.getPresenceStates(userIdArray);
            console.log('[App] Received presence states:', presenceStates);
            console.log('[App] Presence states type check:', typeof presenceStates, Object.keys(presenceStates).length, 'keys');
            chatStore.setInitialPresenceStates(presenceStates);
            console.log('[App] Presence states initialized successfully');
            console.log('[App] OnlineUsers map after init:', chatStore.onlineUsers);
          } catch (error) {
            console.error('[App] Failed to fetch initial presence states:', error);
          }
        } else {
          console.log('[App] No user IDs available from chat list - presence will be fetched when chats are opened');
        }
      } catch (error) {
        console.error('[App] Failed to start SignalR:', error);
      }
    };

    startSignalR();

    // Cleanup on unmount or when authentication changes
    return () => {
      console.log('[App] Stopping SignalR connection...');
      signalRService.stop();
    };
  }, [isAuthenticated]);

  try {
    return (
      <>
        <Router>
          <AppRoutes />
        </Router>
        <ToastContainer toasts={toasts} onClose={handleToastClose} />
        <ConfirmModalContainer />
      </>
    );
  } catch (error) {
    console.error('App Error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error Loading Application</h1>
        <p>Check browser console for details</p>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default App;
