import { config } from 'dotenv';
import { LinkedInScraper } from './scrapers/LinkedInScraper';
import { DEFAULT_CONFIG } from './config/config';

// Load environment variables
config();

async function main() {
    const scraper = new LinkedInScraper(DEFAULT_CONFIG);

    try {
        await scraper.init();

        // Login using environment variables
        const email = process.env.LINKEDIN_EMAIL;
        const password = process.env.LINKEDIN_PASSWORD;

        if (!email || !password) {
            throw new Error('LinkedIn credentials not found in environment variables');
        }

        await scraper.login(email, password);
        console.log('Successfully logged in to LinkedIn');

        // Search for jobs
        const jobs = await scraper.searchJobs('Product Manager', 'San Francisco Bay Area, CA');
        console.log(`Found ${jobs.length} jobs`);

        // Save to CSV
        await scraper.saveToCSV(jobs);
        console.log('Jobs saved to CSV file');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await scraper.close();
    }
}

main().catch(console.error); 