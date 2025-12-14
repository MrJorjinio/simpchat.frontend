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
