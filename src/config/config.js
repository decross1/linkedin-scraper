"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LINKEDIN_URLS = exports.USER_AGENTS = exports.DEFAULT_CONFIG = void 0;
const path_1 = require("path");
exports.DEFAULT_CONFIG = {
    headless: false, // Run in non-headless mode to see what's happening
    cookiesPath: (0, path_1.join)(process.cwd(), 'data/cookies.json'),
    outputPath: (0, path_1.join)(process.cwd(), 'data/jobs.csv'),
    searchDelay: {
        min: 2000, // Minimum delay between requests (2 seconds)
        max: 5000 // Maximum delay between requests (5 seconds)
    },
    maxRetries: 3,
    navigationTimeout: 60000 // 60 seconds timeout
};
exports.USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
];
// LinkedIn base URLs
exports.LINKEDIN_URLS = {
    login: 'https://www.linkedin.com/login',
    jobs: 'https://www.linkedin.com/jobs'
};
