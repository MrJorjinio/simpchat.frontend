import { useChatStore } from '../stores/chatStore';

export const useChat = () => {
  const chats = useChatStore((state) => state.chats);
  const currentChat = useChatStore((state) => state.currentChat);
  const messages = useChatStore((state) => state.messages);
  const isLoadingChats = useChatStore((state) => state.isLoadingChats);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const error = useChatStore((state) => state.error);
  const loadChats = useChatStore((state) => state.loadChats);
  const setCurrentChat = useChatStore((state) => state.setCurrentChat);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const editMessage = useChatStore((state) => state.editMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const clearError = useChatStore((state) => state.clearError);

  return {
    chats,
    currentChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    error,
    loadChats,
    setCurrentChat,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    clearError,
  };
};
