/**
 * Extracts error message from API error response
 * Handles both old and new error formats for backwards compatibility
 *
 * Backend error format:
 * {
 *   success: false,
 *   statusCode: 404,
 *   data: null,
 *   error: {
 *     code: "User.IdNotFound",
 *     message: "User with given [ID] not found"
 *   },
 *   validationErrors: {}
 * }
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'An error occurred'): string {
  // Check for API error response format (error.response.data.error.message)
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Check for legacy format (error.response.data.message)
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for validation errors
  if (error.response?.data?.validationErrors) {
    const validationErrors = error.response.data.validationErrors;
    const firstError = Object.values(validationErrors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return firstError[0];
    }
  }

  // Check for direct error message
  if (error.message) {
    return error.message;
  }

  // Fallback
  return fallbackMessage;
}

/**
 * Extracts all validation errors from API response
 */
export function extractValidationErrors(error: any): Record<string, string[]> | null {
  if (error.response?.data?.validationErrors) {
    return error.response.data.validationErrors;
  }
  return null;
}

/**
 * Extracts error code from API error response
 */
export function extractErrorCode(error: any): string | null {
  if (error.response?.data?.error?.code) {
    return error.response.data.error.code;
  }
  return null;
}

/**
 * Checks if the error is a ban-related error
 */
export function isBanError(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'Chat.Ban.UserBanned';
}

/**
 * Gets a user-friendly message for ban errors
 */
export function getBanErrorMessage(error: any): string {
  const code = extractErrorCode(error);
  switch (code) {
    case 'Chat.Ban.UserBanned':
      return 'You are banned from this chat and cannot perform this action.';
    case 'Chat.Ban.AlreadyBanned':
      return 'This user is already banned from this chat.';
    case 'Chat.Ban.CannotBanSelf':
      return 'You cannot ban yourself.';
    case 'Chat.Ban.CannotBanOwner':
      return 'You cannot ban the owner of this chat.';
    default:
      return extractErrorMessage(error, 'An error occurred');
  }
}

/**
 * Checks if the error is a user block-related error
 */
export function isUserBlockError(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'UserBan.UserBanned' || code === 'UserBan.CannotMessageBannedUser';
}

/**
 * Checks if the current user is blocked by the other user
 */
export function isBlockedByUser(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'UserBan.UserBanned';
}

/**
 * Gets a user-friendly message for user block errors
 */
export function getUserBlockErrorMessage(error: any): string {
  const code = extractErrorCode(error);
  switch (code) {
    case 'UserBan.UserBanned':
      return 'This user has blocked you. You cannot send them messages.';
    case 'UserBan.CannotMessageBannedUser':
      return 'You have blocked this user. Unblock them to send messages.';
    case 'UserBan.AlreadyBanned':
      return 'You have already blocked this user.';
    case 'UserBan.CannotBanSelf':
      return 'You cannot block yourself.';
    case 'UserBan.NotFound':
      return 'Block record not found.';
    default:
      return extractErrorMessage(error, 'An error occurred');
  }
}
