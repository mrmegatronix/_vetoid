/**
 * Reads the venue staff unlock PIN from Expo public environment variables (.env).
 * Fallback defaults to 3528 if EXPO_PUBLIC_STAFF_PIN is unset.
 */
const rawPin = process.env.EXPO_PUBLIC_STAFF_PIN?.replace(/\D/g, '') ?? '';

export const ENV_STAFF_PIN: string = rawPin.length >= 4 ? rawPin : '3528';
