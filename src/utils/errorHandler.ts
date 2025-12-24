/**
 * Maps backend error codes to user-friendly messages
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // User/Auth errors
  'User.WrongPasswordOrEmail': 'Invalid email or password. Please check your credentials and try again.',
  'User.WrongPasswordOrUsername': 'Invalid username or password. Please check your credentials and try again.',
  'User.WrongPassword': 'Incorrect password. Please try again.',
  'User.IdNotFound': 'User not found.',
  'User.UsernameNotFound': 'No account found with this username.',
  'User.EmailNotFound': 'No account found with this email address.',
  'User.UsernameAlreadyExists': 'This username is already taken. Please choose a different one.',
  'User.EmailAlreadyExists': 'An account with this email already exists. Try signing in instead.',
  'User.NotParticipatedInChat': 'You are not a member of this chat.',
  'User.CanNotDeleteAdmin': 'Cannot remove an admin from this chat.',

  // OTP errors
  'Otp.Wrong': 'Invalid verification code. Please check and try again.',
  'Otp.Expired': 'Verification code has expired. Please request a new one.',

  // Chat ban errors
  'Chat.Ban.UserBanned': 'You are banned from this chat and cannot perform this action.',
  'Chat.Ban.AlreadyBanned': 'This user is already banned from this chat.',
  'Chat.Ban.CannotBanSelf': 'You cannot ban yourself.',
  'Chat.Ban.CannotBanOwner': 'You cannot ban the owner of this chat.',

  // User block errors
  'UserBan.UserBanned': 'This user has blocked you. You cannot send them messages.',
  'UserBan.CannotMessageBannedUser': 'You have blocked this user. Unblock them to send messages.',
  'UserBan.AlreadyBanned': 'You have already blocked this user.',
  'UserBan.CannotBanSelf': 'You cannot block yourself.',
  'UserBan.NotFound': 'Block record not found.',

  // File errors
  'File.TooLarge': 'File size exceeds maximum allowed size of 50MB.',
  'File.InvalidType': 'File type is not allowed. Allowed types: images, PDF, Office documents.',
};

/**
 * Maps backend validation messages to user-friendly messages
 */
const VALIDATION_MESSAGE_MAPPINGS: Record<string, string> = {
  // Login validation
  'Credential is required.': 'Please enter your email or username.',
  'Credential must be a valid email or username (5-30 characters, allowed: letters, digits, ., _, -).': 'Please enter a valid email or username (5-30 characters).',
  'Password is required.': 'Please enter your password.',
  'Password min length is 5': 'Password must be at least 5 characters.',
  'Password max length is 128': 'Password is too long (max 128 characters).',

  // Registration validation
  'Username is required.': 'Please enter a username.',
  'Username max length is 30': 'Username is too long (max 30 characters).',
  'Username min length is 5': 'Username must be at least 5 characters.',
  'Username may contain letters, digits, dots, underscores and hyphens only.': 'Username can only contain letters, numbers, dots, underscores and hyphens.',
  'Email is required.': 'Please enter your email address.',
  'Email must be a valid email address.': 'Please enter a valid email address.',
  'Password must be at least 5 characters': 'Password must be at least 5 characters.',
  'OTP code is required.': 'Please enter the verification code sent to your email.',

  // Update user validation
  'Username cannot be empty': 'Username cannot be empty.',
  'Username must be at least 3 characters long': 'Username must be at least 3 characters.',
  'Username cannot exceed 50 characters': 'Username is too long (max 50 characters).',
  'Description cannot exceed 200 characters': 'Bio is too long (max 200 characters).',

  // Password update validation
  'New Password is required.': 'Please enter a new password.',
  'Current Password is required.': 'Please enter your current password.',

  // Message validation
  'Message content must be at least 1 character': 'Message cannot be empty.',
  'Message content max length is 1000 characters': 'Message is too long (max 1000 characters).',
  'Message content cannot be empty': 'Message cannot be empty.',
  'Message content mac length is 1000 characters': 'Message is too long (max 1000 characters).',

  // Chat validation
  'Name max length is 100': 'Name is too long (max 100 characters).',
  'Name min length is 1': 'Name cannot be empty.',
  'Description max length is 500': 'Description is too long (max 500 characters).',
  'Description min length is 1': 'Description cannot be empty.',
  'Chat name cannot be empty': 'Chat name cannot be empty.',
  'Chat name must be at least 1 character': 'Chat name cannot be empty.',
  'Chat name cannot exceed 100 characters': 'Chat name is too long (max 100 characters).',
  'Chat description cannot exceed 500 characters': 'Description is too long (max 500 characters).',
};

/**
 * Converts a backend validation message to a user-friendly message
 */
export function getUserFriendlyValidationMessage(message: string): string {
  return VALIDATION_MESSAGE_MAPPINGS[message] || message;
}

/**
 * Gets a user-friendly message for an error code
 */
export function getErrorMessageForCode(code: string): string | null {
  return ERROR_CODE_MESSAGES[code] || null;
}

/**
 * Extracts error message from API error response
 * Handles both old and new error formats for backwards compatibility
 * Converts backend error codes to user-friendly messages
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
  // First, try to get a user-friendly message from the error code
  const errorCode = error.response?.data?.error?.code;
  if (errorCode) {
    const friendlyMessage = getErrorMessageForCode(errorCode);
    if (friendlyMessage) {
      return friendlyMessage;
    }
  }

  // Check for validation errors first (these are most specific)
  if (error.response?.data?.validationErrors) {
    const validationErrors = error.response.data.validationErrors;
    const allErrors: string[] = [];

    // Collect all validation errors
    for (const field of Object.keys(validationErrors)) {
      const fieldErrors = validationErrors[field];
      if (Array.isArray(fieldErrors)) {
        for (const err of fieldErrors) {
          // Convert to user-friendly message
          const friendlyMsg = getUserFriendlyValidationMessage(err);
          allErrors.push(friendlyMsg);
        }
      }
    }

    if (allErrors.length > 0) {
      // Return first error (or join them)
      return allErrors[0];
    }
  }

  // Check for API error response format (error.response.data.error.message)
  if (error.response?.data?.error?.message) {
    const msg = error.response.data.error.message;
    return getUserFriendlyValidationMessage(msg);
  }

  // Check for legacy format (error.response.data.message)
  if (error.response?.data?.message) {
    const msg = error.response.data.message;
    return getUserFriendlyValidationMessage(msg);
  }

  // Check for direct error message
  if (error.message) {
    return error.message;
  }

  // Fallback
  return fallbackMessage;
}

/**
 * Extracts all validation errors from API response with user-friendly messages
 * Returns a map of field names to arrays of error messages
 */
export function extractValidationErrors(error: any): Record<string, string[]> | null {
  if (error.response?.data?.validationErrors) {
    const rawErrors = error.response.data.validationErrors;
    const friendlyErrors: Record<string, string[]> = {};

    for (const field of Object.keys(rawErrors)) {
      const fieldErrors = rawErrors[field];
      if (Array.isArray(fieldErrors)) {
        friendlyErrors[field] = fieldErrors.map(err => getUserFriendlyValidationMessage(err));
      }
    }

    return friendlyErrors;
  }
  return null;
}

/**
 * Extracts all validation errors as a single string (all errors joined)
 */
export function extractAllValidationErrorsAsString(error: any): string | null {
  const errors = extractValidationErrors(error);
  if (!errors) return null;

  const allMessages: string[] = [];
  for (const field of Object.keys(errors)) {
    allMessages.push(...errors[field]);
  }

  return allMessages.length > 0 ? allMessages.join(' ') : null;
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
  if (code) {
    const friendlyMessage = getErrorMessageForCode(code);
    if (friendlyMessage) {
      return friendlyMessage;
    }
  }
  return extractErrorMessage(error, 'An error occurred');
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
  if (code) {
    const friendlyMessage = getErrorMessageForCode(code);
    if (friendlyMessage) {
      return friendlyMessage;
    }
  }
  return extractErrorMessage(error, 'An error occurred');
}
