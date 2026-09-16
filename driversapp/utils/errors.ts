/** Map technical fetch/API failures to short copy drivers can understand. */
export function toUserFriendlyError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as { message?: unknown })?.message === 'string'
          ? String((error as { message: string }).message)
          : '';

  const message = raw.trim();
  const lower = message.toLowerCase();

  if (
    lower.includes('could not connect') ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('network error') ||
    lower.includes('network busy') ||
    lower.includes('fetch failed') ||
    lower.includes('unexpectedexception') ||
    lower.includes("property 'response'") ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('socket') ||
    lower.includes('offline')
  ) {
    return 'Network busy. Check your connection and try again.';
  }

  if (lower.includes('unauthorized') || (error as { status?: number })?.status === 401) {
    return 'Please sign in again.';
  }

  if ((error as { status?: number })?.status === 403) {
    return 'You do not have permission for this action.';
  }

  if ((error as { status?: number })?.status === 404) {
    return 'Not found. Please try again.';
  }

  if ((error as { status?: number })?.status === 409) {
    return message || 'This action is no longer available.';
  }

  if ((error as { status?: number })?.status && (error as { status: number }).status >= 500) {
    return 'Server is busy. Please try again in a moment.';
  }

  // Hide long native / stack-style messages from the UI.
  if (
    !message ||
    message.length > 120 ||
    lower.includes('exception') ||
    lower.includes('at expomodules') ||
    lower.includes('promise.swift') ||
    lower.includes('stack')
  ) {
    return fallback;
  }

  return message;
}
