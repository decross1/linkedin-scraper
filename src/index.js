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
const dotenv_1 = require("dotenv");
const LinkedInScraper_1 = require("./scrapers/LinkedInScraper");
const config_1 = require("./config/config");
// Load environment variables
(0, dotenv_1.config)();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const scraper = new LinkedInScraper_1.LinkedInScraper(config_1.DEFAULT_CONFIG);
        try {
            yield scraper.init();
            // Login using environment variables
            const email = process.env.LINKEDIN_EMAIL;
            const password = process.env.LINKEDIN_PASSWORD;
            if (!email || !password) {
                throw new Error('LinkedIn credentials not found in environment variables');
            }
            yield scraper.login(email, password);
            console.log('Successfully logged in to LinkedIn');
            // Search for jobs
            const jobs = yield scraper.searchJobs('Product Manager', 'San Francisco Bay Area, CA');
            console.log(`Found ${jobs.length} jobs`);
            // Save to CSV
            yield scraper.saveToCSV(jobs);
            console.log('Jobs saved to CSV file');
        }
        catch (error) {
            console.error('An error occurred:', error);
        }
        finally {
            yield scraper.close();
        }
    });
}
main().catch(console.error);
