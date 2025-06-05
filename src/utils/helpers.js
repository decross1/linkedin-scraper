"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanText = exports.formatDate = exports.getRandomUserAgent = exports.randomDelay = void 0;
const config_1 = require("../config/config");
/**
 * Sleep for a random duration between min and max milliseconds
 */
const randomDelay = (min, max) => __awaiter(void 0, void 0, void 0, function* () {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    yield new Promise(resolve => setTimeout(resolve, delay));
});
exports.randomDelay = randomDelay;
/**
 * Get a random user agent from the list
 */
const getRandomUserAgent = () => {
    const index = Math.floor(Math.random() * config_1.USER_AGENTS.length);
    return config_1.USER_AGENTS[index];
};
exports.getRandomUserAgent = getRandomUserAgent;
/**
 * Format a date string to a consistent format
 */
const formatDate = (dateStr) => {
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    }
    catch (_a) {
        return dateStr; // Return original string if parsing fails
    }
};
exports.formatDate = formatDate;
/**
 * Clean text by removing extra whitespace and special characters
 */
const cleanText = (text) => {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .trim();
};
exports.cleanText = cleanText;
