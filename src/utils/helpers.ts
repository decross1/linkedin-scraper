import { USER_AGENTS } from '../config/config';

/**
 * Sleep for a random duration between min and max milliseconds
 */
export const randomDelay = async (min: number, max: number): Promise<void> => {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Get a random user agent from the list
 */
export const getRandomUserAgent = (): string => {
    const index = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[index];
};

/**
 * Format a date string to a consistent format
 */
export const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    } catch {
        return dateStr; // Return original string if parsing fails
    }
};

/**
 * Clean text by removing extra whitespace and special characters
 */
export const cleanText = (text: string): string => {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .trim();
}; 