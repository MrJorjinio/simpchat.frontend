# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SimpChat frontend is a React TypeScript real-time chat application. It communicates with an ASP.NET Core backend (separate repository at `simpchat.backend`) via REST API and SignalR WebSocket for real-time features.

**Project Status**: This is an incomplete/in-development project.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server on port 5173

# Build
npm run build        # TypeScript compile + Vite production build

# Linting
npm run lint         # ESLint check

# Preview production build
npm run preview
```

## Architecture

### State Management
- **Zustand stores** in `src/stores/`:
  - `authStore.ts` - Authentication state, login/register/logout, JWT token management
  - `chatStore.ts` - Chats, messages, typing indicators, online presence tracking
  - `notificationStore.ts` - Notification management
  - `themeStore.ts` - Theme (dark/light mode) preferences

### Real-time Communication
- **SignalR service** (`src/services/signalr.service.ts`) - Singleton class handling WebSocket connection
- Hub URL derived from `VITE_API_URL` environment variable (defaults to `http://localhost:5000/api`)
- Events: presence (online/offline), messages, typing indicators, reactions, notifications
- Event handlers wired up in `App.tsx` connecting SignalR events to Zustand stores

### API Layer
- **Axios instance** (`src/services/api.ts`) - Configured with JWT interceptor, auto-logout on 401
- Service modules in `src/services/`:
  - `auth.service.ts` - Login, register, OTP
  - `chat.service.ts` - Chat CRUD operations
  - `message.service.ts` - Message operations (send with file upload, edit, delete, reactions)
  - `user.service.ts` - User profile operations
  - `notification.service.ts`, `permission.service.ts`, `reaction.service.ts`

### Component Structure
- **Pages**: `src/pages/` - LoginPage, RegisterPage
- **Dashboard** (`src/components/Dashboard.tsx`) - Main authenticated view, orchestrates chat UI
- **Core Components** in `src/components/`:
  - `Sidebar.tsx` - Chat list navigation
  - `ChatView.tsx` - Message display area
  - `ChatArea.tsx` - Message input and actions
  - `RightPanel.tsx` - Chat/user details panel
  - `AdminPanel.tsx` - Admin functionality
- **Common Components** (`src/components/common/`) - Avatar, Toast, ConfirmModal, FileDropzone
- **Modals** (`src/components/modals/`) - GroupProfileModal, ChannelProfileModal, UserProfileViewerModal

### Types
- `src/types/api.types.ts` - All TypeScript interfaces for API data (User, Chat, Message, etc.)

### Utilities
- `src/utils/helpers.ts` - Helper functions (getInitials, fixMinioUrl, etc.)
- `src/utils/errorHandler.ts` - Error extraction and ban error handling
- `src/utils/normalizers.ts` - Data normalization for API responses
- `src/utils/fileValidation.ts` - File upload validation
- `src/utils/constants.ts` - App constants

### Styling
- **TailwindCSS** with CSS Modules (`.module.css` files)
- Global styles in `src/styles/` (animations.css, utilities.css, components.css)
- Theme variables support dark/light mode

## Environment Variables

```
VITE_API_URL=http://localhost:5000/api  # Backend API URL
```

## Backend Integration

The frontend expects the backend to be running at the URL specified by `VITE_API_URL`. Key backend endpoints:
- REST API at `/api/*`
- SignalR Hub at `/hubs/chat`

The backend uses:
- JWT authentication
- PostgreSQL database
- MinIO for file storage (URLs may need fixing via `fixMinioUrl` helper)

## Key Patterns

1. **Message sending**: Text-only messages use SignalR for real-time delivery; file messages use HTTP multipart/form-data
2. **Presence tracking**: Online/offline status tracked in `chatStore.onlineUsers` Map, populated via SignalR
3. **Protected routes**: `ProtectedRoute` component in `src/components/auth/` guards authenticated routes
4. **Toast notifications**: Use `toast.success()`, `toast.error()`, etc. from `src/components/common/Toast.tsx`
5. **Confirmation dialogs**: Use `confirm()` from `src/components/common/ConfirmModal.tsx`
