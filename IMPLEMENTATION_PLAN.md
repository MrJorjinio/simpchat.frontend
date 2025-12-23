# Simpchat Frontend - Complete Implementation Plan

## Current State Analysis

### Two Dashboard Implementations
1. **`Dashboard.tsx` (OLD)** - ~2000 lines, fully functional, outdated design
2. **`DashboardLayout.tsx` (NEW)** - ~340 lines, beautiful dark theme, PLACEHOLDER DATA ONLY

### Strategy
Migrate all functionality from `Dashboard.tsx` to `DashboardLayout.tsx` while preserving the new minimalist dark theme design.

---

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Connect Stores & Initialize Data
**File**: `src/components/DashboardLayout.tsx`
**Current**: Uses demo data (`demoChatItems`, `demoUsers`)
**Target**: Connect to Zustand stores and load real data

**Tasks**:
- [ ] Import all required stores (`useChatStore`, `useAuthStore`, `useThemeStore`, `useNotificationStore`)
- [ ] Import services (`chatService`, `signalRService`)
- [ ] Replace `demoChatItems` with `chats` from `useChatStore`
- [ ] Initialize: call `loadChats()` on mount
- [ ] Handle loading states (`isLoadingChats`)

**Code Changes**:
```tsx
// Replace demo data with real store connections
const { chats, currentChat, isLoadingChats, messages, onlineUsers } = useChatStore();
const { user } = useAuthStore();

useEffect(() => {
  const chatStore = useChatStore.getState();
  if (chats.length === 0) {
    chatStore.loadChats();
  }
}, []);
```

### 1.2 Chat Selection & Messages
**Current**: `activeChat` is just a string ID with no functionality
**Target**: Full chat selection with message loading

**Tasks**:
- [ ] Replace `activeChat` state with `currentChat` from store
- [ ] Implement `handleSelectChat()` function (copy from Dashboard.tsx)
- [ ] Load messages when chat changes
- [ ] Join/leave SignalR rooms on chat change
- [ ] Track `loadedChatIdRef` to prevent duplicate loads

---

## Phase 2: Chat List Panel (Left Sidebar)

### 2.1 Real Chat Items
**Current**: Hardcoded demo chat items
**Target**: Real chats with online status, unread counts, last messages

**Tasks**:
- [ ] Map real `chats` array to chat items
- [ ] Show correct avatar (image or initials)
- [ ] Show online indicator for DM chats using `onlineUsers` Map
- [ ] Show group/channel icon for non-DM chats
- [ ] Display real `lastMessage` preview
- [ ] Display real `unreadCount` badge
- [ ] Format timestamps properly using `formatTime()` helper

### 2.2 Global User Search (Already Designed)
**Current**: Demo search with `demoUsers`
**Target**: Real user search via API

**Tasks**:
- [ ] Replace `demoUsers` with API search results
- [ ] Implement debounced search using `userService.searchUsers()`
- [ ] Add chat search using `chatService.searchChats()`
- [ ] Handle search result selection (open profile or navigate to chat)
- [ ] Show loading spinner during search

### 2.3 New Chat Button
**Current**: Button exists but no functionality
**Target**: Opens modal to create new group/channel or start DM

**Tasks**:
- [ ] Create dropdown menu on click (New Group, New Channel, New DM)
- [ ] Connect to modal handlers

---

## Phase 3: Main Chat Area (Center Panel)

### 3.1 Chat Header
**Current**: Empty state only
**Target**: Full header with chat info, online status, action buttons

**New Component**: Create `ChatHeader.tsx` or inline in DashboardLayout

**Tasks**:
- [ ] Display chat avatar and name
- [ ] Show online status for DMs (from `onlineUsers` Map)
- [ ] Show member count for groups/channels
- [ ] Add "Group/Channel Profile" button for non-DMs
- [ ] Add mobile menu button

### 3.2 Messages Display
**Current**: Just empty state placeholder
**Target**: Full message list with all features

**Tasks**:
- [ ] Create messages container with scroll handling
- [ ] Display messages with sender avatar, name, content, timestamp
- [ ] Handle own messages vs other messages (different styling)
- [ ] Show file attachments (images, videos, audio, documents)
- [ ] Display reactions on messages
- [ ] Show reply previews for replies
- [ ] Implement context menu (right-click or button)
  - React with emoji
  - Reply
  - Pin/Unpin (if has permission)
  - Edit (own messages)
  - Delete (own messages or if has ManageMessages permission)
- [ ] Auto-scroll to bottom on new messages
- [ ] Show "scroll to bottom" button when scrolled up
- [ ] Implement IntersectionObserver for marking messages as seen

### 3.3 Message Input
**Current**: None
**Target**: Full input with file attachment, reply preview

**Tasks**:
- [ ] Create input container with styling matching theme
- [ ] Text input with placeholder
- [ ] File attachment button and preview
- [ ] Send button
- [ ] Reply preview bar (shows when replying)
- [ ] Handle Enter to send
- [ ] Permission check: show "no permission" if can't send
- [ ] Block status: show "blocked" message for DMs if blocked

### 3.4 Pinned Messages Panel
**Current**: None
**Target**: Collapsible panel showing pinned messages

**Tasks**:
- [ ] Import and use existing `PinnedMessagesPanel` component
- [ ] Load pinned messages when chat changes
- [ ] Handle jump to message on click

---

## Phase 4: Right Panel (Chat Details)

### 4.1 DM Details (RightPanel.tsx)
**Current**: Placeholder
**Target**: Shows other user's profile, actions

**Tasks**:
- [ ] Import existing `RightPanel` component
- [ ] Show for DM chats only
- [ ] Display user profile info
- [ ] Add action buttons (View Profile, Block/Unblock, Delete Conversation)

### 4.2 Group/Channel Profile Modal
**Current**: None
**Target**: Full profile modal with members, settings

**Tasks**:
- [ ] Import existing `GroupProfileModal` component
- [ ] Trigger from "Group Profile" button in header
- [ ] Show group info, members list
- [ ] Admin actions: Edit, Delete, Kick/Ban members, Manage Permissions
- [ ] Member actions: Leave group

---

## Phase 5: Settings & Modals

### 5.1 Settings Menu
**Current**: None (button exists in old Dashboard)
**Target**: Full settings dropdown

**Tasks**:
- [ ] Add settings button (gear icon) to sidebar header
- [ ] Import existing `SettingsMenu` component
- [ ] Connect all menu items:
  - Create Group
  - Create Channel
  - Custom Reaction
  - Edit Profile
  - Notifications
  - Blocked Users
  - Admin Panel
  - Theme Toggle
  - Logout

### 5.2 Profile Modal
**Current**: None
**Target**: Edit current user profile

**Tasks**:
- [ ] Create `UserProfileModal` (copy from Dashboard.tsx)
- [ ] Edit username, bio, avatar
- [ ] Change "Add Me" policy
- [ ] Save via `userService.updateProfile()`

### 5.3 Create Group/Channel Modals
**Tasks**:
- [ ] Create `CreateGroupModal` (copy from Dashboard.tsx)
- [ ] Name, description, privacy, avatar upload
- [ ] Create via `chatService.createGroup()` / `createChannel()`

### 5.4 Notifications Modal
**Tasks**:
- [ ] Create `NotificationsModal` (copy from Dashboard.tsx)
- [ ] Load notifications from API
- [ ] Mark as seen on click
- [ ] Navigate to chat on notification click

### 5.5 Admin Panel
**Tasks**:
- [ ] Import existing `AdminPanel` component
- [ ] Show only if user has admin privileges

### 5.6 Blocked Users Modal
**Tasks**:
- [ ] Import existing `BlockedUsersModal` component
- [ ] List blocked users
- [ ] Unblock functionality

### 5.7 Custom Reaction Modal
**Tasks**:
- [ ] Create `CustomReactionModal` (copy from Dashboard.tsx)
- [ ] Create custom reactions via `reactionService`

---

## Phase 6: Real-Time Features

### 6.1 SignalR Integration
**Current**: None in DashboardLayout
**Target**: Full real-time support

**Tasks**:
- [ ] Event handlers are already set in `App.tsx` - verify they work
- [ ] Typing indicators display
- [ ] Online/offline status updates
- [ ] Real-time message updates
- [ ] Reaction updates
- [ ] Permission changes
- [ ] Block/unblock events

### 6.2 Typing Indicators
**Tasks**:
- [ ] Show typing indicator in chat header or messages area
- [ ] Send typing events via SignalR when user types
- [ ] Auto-stop typing after 3 seconds

### 6.3 Read Receipts
**Tasks**:
- [ ] Mark messages as seen when scrolled into view
- [ ] Display seen status on messages (checkmarks)

---

## Phase 7: Responsive Design

### 7.1 Mobile Sidebar
**Current**: Basic toggle exists
**Target**: Smooth mobile experience

**Tasks**:
- [ ] Mobile overlay when sidebar open
- [ ] Close sidebar when chat selected
- [ ] Hamburger menu in mobile header

### 7.2 Mobile Chat View
**Tasks**:
- [ ] Full-width chat on mobile
- [ ] Touch-friendly context menus
- [ ] Responsive message input

---

## Phase 8: Styling & Polish

### 8.1 CSS Module Updates
**File**: `src/styles/DashboardLayout.module.css`

**Tasks**:
- [ ] Message bubbles (own vs other styling)
- [ ] Message reactions
- [ ] Context menus
- [ ] Loading states
- [ ] Empty states
- [ ] Pinned messages panel
- [ ] Typing indicators
- [ ] File attachment previews
- [ ] All modals (use consistent dark theme)

### 8.2 Theme Consistency
**Design Tokens**:
```css
--dash-bg: #050505;
--dash-surface: #0a0a0a;
--dash-surface-elevated: #0f0f0f;
--dash-surface-hover: #151515;
--dash-border: #1a1a1a;
--dash-primary: #10b981;
--dash-primary-soft: rgba(16, 185, 129, 0.1);
--dash-text-primary: #ffffff;
--dash-text-secondary: #a1a1aa;
--dash-text-muted: #71717a;
```

---

## Implementation Order (Recommended)

### Sprint 1: Core Chat Functionality
1. Connect stores and load real chats (Phase 1)
2. Display real chat list (Phase 2.1)
3. Chat selection and message loading (Phase 1.2)
4. Basic message display (Phase 3.2 partial)
5. Message input (Phase 3.3)

### Sprint 2: Full Messaging
1. Complete message display with reactions, replies, files (Phase 3.2)
2. Context menu actions (Phase 3.2)
3. Pinned messages panel (Phase 3.4)
4. Chat header with status (Phase 3.1)

### Sprint 3: Search & Creation
1. Real user search (Phase 2.2)
2. Create group/channel modals (Phase 5.3)
3. New chat button dropdown (Phase 2.3)

### Sprint 4: Profiles & Details
1. Group/Channel profile modal (Phase 4.2)
2. DM right panel (Phase 4.1)
3. User profile modal (Phase 5.2)
4. User profile viewer modal

### Sprint 5: Settings & Admin
1. Settings menu (Phase 5.1)
2. Notifications modal (Phase 5.4)
3. Blocked users modal (Phase 5.6)
4. Admin panel (Phase 5.5)
5. Custom reactions (Phase 5.7)

### Sprint 6: Real-Time & Polish
1. Typing indicators (Phase 6.2)
2. Read receipts (Phase 6.3)
3. Verify SignalR integration (Phase 6.1)
4. Responsive polish (Phase 7)
5. Final styling (Phase 8)

---

## Files to Create/Modify

### New Files (Optional - can be inline)
- `src/components/new/ChatHeader.tsx`
- `src/components/new/MessageList.tsx`
- `src/components/new/MessageInput.tsx`
- `src/components/new/NewChatDropdown.tsx`

### Files to Modify
- `src/components/DashboardLayout.tsx` (MAJOR - most work here)
- `src/styles/DashboardLayout.module.css` (MAJOR - add many new styles)

### Files to Import/Reuse
- `src/components/SettingsMenu.tsx`
- `src/components/RightPanel.tsx`
- `src/components/PinnedMessagesPanel.tsx`
- `src/components/modals/GroupProfileModal.tsx`
- `src/components/modals/UserProfileViewerModal.tsx`
- `src/components/modals/BlockedUsersModal.tsx`
- `src/components/modals/PermissionModal.tsx`
- `src/components/AdminPanel.tsx`
- `src/components/common/Avatar.tsx`
- `src/components/common/OnlineStatusIndicator.tsx`
- `src/components/common/Toast.tsx`
- `src/components/common/ConfirmModal.tsx`
- `src/components/common/FileDropzone.tsx`

---

## Testing Checklist

### Functionality Tests
- [ ] Load chats on login
- [ ] Select chat and load messages
- [ ] Send text message
- [ ] Send message with file
- [ ] Edit own message
- [ ] Delete own message
- [ ] Add/remove reaction
- [ ] Reply to message
- [ ] Pin/unpin message
- [ ] Search users globally
- [ ] Create new group
- [ ] Create new channel
- [ ] Start new DM
- [ ] Join public group/channel
- [ ] Leave group/channel
- [ ] Delete group/channel (admin)
- [ ] Kick/ban member (admin)
- [ ] Update profile
- [ ] Block/unblock user
- [ ] View notifications
- [ ] Mark notifications as read
- [ ] Theme toggle works
- [ ] Logout works

### Real-Time Tests
- [ ] Receive message in real-time
- [ ] See message edited in real-time
- [ ] See message deleted in real-time
- [ ] See reactions update in real-time
- [ ] See online/offline status changes
- [ ] See typing indicators
- [ ] Get notifications for new messages

### UI/UX Tests
- [ ] Mobile responsive at 375px width
- [ ] Tablet responsive at 768px width
- [ ] Desktop at 1920px width
- [ ] Dark theme consistent throughout
- [ ] No ugly borders or visual glitches
- [ ] All icons render correctly
- [ ] Smooth animations
- [ ] Loading states shown appropriately
- [ ] Error states handled gracefully

---

## Backend API Endpoints Summary

### Auth
- POST `/auth/login`
- POST `/auth/register`
- POST `/otp/send-to-email`

### Chats
- GET `/chats/me` - Get all user's chats
- GET `/chats/{chatId}` - Get chat with messages
- GET `/chats/{chatId}/profile` - Get chat profile with members
- POST `/chats/search` - Search chats

### Groups & Channels
- POST `/groups` - Create group
- POST `/channels` - Create channel
- PUT `/groups` - Update group
- DELETE `/groups` - Delete group
- POST `/groups/join` - Join group
- POST `/groups/leave` - Leave group
- POST `/groups/add-member` - Add member
- POST `/groups/remove-member` - Remove member

### Messages
- POST `/messages` - Send message (multipart)
- PUT `/messages/{id}` - Edit message
- DELETE `/messages/{id}` - Delete message
- POST `/messages/{id}/reactions/{type}` - Toggle reaction
- POST `/messages/{id}/pin` - Pin message
- POST `/messages/{id}/unpin` - Unpin message
- GET `/messages/pinned/{chatId}` - Get pinned messages

### Users
- GET `/users/me` - Get current user
- PUT `/users/me` - Update profile
- GET `/users/{id}` - Get user profile
- GET `/users/search/{query}` - Search users
- POST `/users/blocks/{id}` - Block user
- DELETE `/users/blocks/{id}` - Unblock user
- GET `/users/blocks` - Get blocked users

### Notifications
- GET `/notifications` - Get all notifications
- PUT `/notifications/seen` - Mark as seen

### Permissions
- GET `/permissions/{chatId}/user/{userId}` - Get user permissions
- POST `/permissions/grant` - Grant permission
- POST `/permissions/revoke` - Revoke permission

### SignalR Hub
- URL: `/hubs/chat`
- Events: UserOnline, UserOffline, ReceiveMessage, MessageEdited, MessageDeleted, ReactionAdded, ReactionRemoved, UserTyping, etc.

---

## Notes

1. **Preserve Design**: The new dark theme is good. Don't change colors/styling unless necessary.

2. **Copy Don't Rewrite**: Most functionality already exists in `Dashboard.tsx`. Copy and adapt, don't rewrite from scratch.

3. **Incremental Testing**: Test each feature after implementation before moving to the next.

4. **Component Reuse**: Maximize reuse of existing components (modals, panels, common components).

5. **Performance**: Use `useMemo` and `useCallback` where appropriate to prevent unnecessary re-renders.
