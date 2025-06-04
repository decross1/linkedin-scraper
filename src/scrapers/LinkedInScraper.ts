import type { Browser, Page, ElementHandle } from 'puppeteer';
import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import type { JobListing, ScraperConfig } from '../types/job';
import { LINKEDIN_URLS } from '../config/config';
import { randomDelay, getRandomUserAgent, cleanText, formatDate } from '../utils/helpers';
import { readFile, writeFile } from 'fs/promises';

export class LinkedInScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private config: ScraperConfig;

    constructor(config: ScraperConfig) {
        this.config = config;
    }

    async init(): Promise<void> {
        console.log('Initializing scraper...');
        // Launch browser with anti-detection measures
        this.browser = await puppeteer.launch({
            headless: this.config.headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        console.log(`Browser launched in ${this.config.headless ? 'headless' : 'visible'} mode`);

        this.page = await this.browser.newPage();
        console.log('New page created');
        
        // Set up anti-detection measures
        await this.page.setUserAgent(getRandomUserAgent());
        await this.page.setDefaultNavigationTimeout(this.config.navigationTimeout);
        await this.page.evaluateOnNewDocument(() => {
            // Overwrite the 'navigator.webdriver' property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });
        console.log('Anti-detection measures configured');

        // Try to load saved cookies
        try {
            console.log('Attempting to load saved cookies...');
            const cookiesString = await readFile(this.config.cookiesPath, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await this.page.setCookie(...cookies);
            console.log('Successfully loaded saved cookies');
        } catch (error) {
            console.log('No saved cookies found. Will need to perform fresh login.');
        }
    }

    private async waitForSuccessfulLogin(): Promise<void> {
        console.log('\n=== Manual Login Required ===');
        console.log('1. Please log in manually in the browser window');
        console.log('2. Once you are logged in, the script will continue automatically');
        console.log('3. You have 2 minutes to complete the login\n');

        try {
            // Wait for login modal or page to disappear
            await this.page?.waitForFunction(
                () => {
                    // Check if login modal is present
                    const loginModal = document.querySelector('.authentication-modal');
                    const loginForm = document.querySelector('.login__form');
                    const joinNow = document.querySelector('.join-now');
                    
                    // If any of these elements exist, we're still on the login page
                    return !loginModal && !loginForm && !joinNow;
                },
                { timeout: 120000, polling: 1000 } // 2 minutes timeout, check every second
            );

            // Additional verification - wait for some elements that indicate we're logged in
            await this.page?.waitForFunction(
                () => {
                    // Check for elements that are typically present when logged in
                    const navBar = document.querySelector('.global-nav');
                    const profileIcon = document.querySelector('.global-nav__me-menu');
                    
                    // Consider logged in if we find these elements
                    return navBar !== null || profileIcon !== null;
                },
                { timeout: 30000, polling: 1000 } // 30 seconds additional timeout
            );

            console.log('Manual login successful');
            
            // Save cookies for future sessions
            const cookies = await this.page?.cookies();
            if (cookies) {
                await writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
                console.log('Cookies saved for future sessions');
            }
        } catch (error) {
            throw new Error('Login timeout or verification failed. Please try again and ensure you complete the login process.');
        }
    }

    async login(email: string, password: string): Promise<void> {
        if (!this.page) throw new Error('Browser not initialized');

        // First check if we're already logged in
        console.log('Checking login status...');
        await this.page.goto(LINKEDIN_URLS.jobs);
        await randomDelay(2000, 3000);

        // Check if we're on the login page or already logged in
        const currentUrl = await this.page.url();
        if (!currentUrl.includes('/login')) {
            // Double check we're really logged in by looking for nav elements
            try {
                await this.page.waitForSelector('.global-nav', { timeout: 5000 });
                console.log('Already logged in, proceeding with search');
                return;
            } catch {
                console.log('Login state unclear, requesting manual login...');
                await this.waitForSuccessfulLogin();
            }
        } else {
            await this.waitForSuccessfulLogin();
        }
    }

    async searchJobs(keywords: string, location: string): Promise<JobListing[]> {
        if (!this.page) throw new Error('Browser not initialized');

        const jobs: JobListing[] = [];
        console.log(`\nStarting job search for "${keywords}" in "${location}"...`);
        
        // First verify we're still logged in by visiting the jobs page
        console.log('Verifying login status...');
        await this.page.goto(LINKEDIN_URLS.jobs);
        await randomDelay(2000, 3000);

        // Check if we got redirected to login
        const currentUrl = await this.page.url();
        if (currentUrl.includes('/login')) {
            await this.waitForSuccessfulLogin();
        }

        // Now proceed with the search
        const searchUrl = `${LINKEDIN_URLS.jobs}/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
        console.log(`\nNavigating to search URL: ${searchUrl}`);
        
        await this.page.goto(searchUrl);
        console.log('Waiting for job listings to load...');
        
        // Wait longer for the page to load completely
        await randomDelay(5000, 8000);
        
        // Verify we're on the correct page and still logged in
        const searchPageUrl = await this.page.url();
        console.log('Current URL:', searchPageUrl);
        
        if (searchPageUrl.includes('/login')) {
            await this.waitForSuccessfulLogin();
            // Try the search again
            await this.page.goto(searchUrl);
            await randomDelay(5000, 8000);
        }

        // Try to find any job-related elements on the page
        const selectors = [
            '.jobs-search__results-list',
            '.job-card-container',
            '.jobs-search-results__list-item',
            '[data-job-id]',
            '.jobs-search-results-list',
            '.jobs-search-results__list'
        ];

        let foundSelector = null;
        for (const selector of selectors) {
            console.log(`Checking for selector: ${selector}`);
            const elements = await this.page.$$(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                foundSelector = selector;
                break;
            }
        }

        if (!foundSelector) {
            console.log('Could not find any job listing elements. Checking page content...');
            
            // Log the page title
            const title = await this.page.title();
            console.log('Page title:', title);

            // Check if we're being blocked or redirected
            const content = await this.page.content();
            if (content.includes('captcha') || content.includes('verify')) {
                console.log('Detected potential security check or captcha');
                return jobs;
            }

            // Try to get any text content to see what's on the page
            const bodyText = await this.page.evaluate(() => document.body.innerText);
            console.log('Page text preview:', bodyText.substring(0, 200) + '...');
            
            // Save a screenshot for debugging
            await this.page.screenshot({ path: 'debug-screenshot.png' });
            console.log('Saved debug screenshot to debug-screenshot.png');
            
            return jobs;
        }

        console.log('Starting infinite scroll to load all job listings...');
        await this.autoScroll();
        console.log('Finished loading job listings');

        // Get all job cards with the found selector
        const jobCards = await this.page.$$(foundSelector);
        console.log(`Found ${jobCards.length} job listings`);

        for (let i = 0; i < jobCards.length; i++) {
            try {
                console.log(`\nProcessing job ${i + 1} of ${jobCards.length}`);
                
                // Try to get some information before clicking
                const cardText = await this.page.evaluate(el => {
                    return {
                        text: el.textContent,
                        html: el.innerHTML,
                        classes: el.className,
                        id: el.id
                    };
                }, jobCards[i]);
                
                console.log('Job card details:');
                console.log('- Classes:', cardText.classes);
                console.log('- ID:', cardText.id);
                console.log('- Text preview:', (cardText.text || '').substring(0, 100) + '...');
                console.log('- HTML preview:', (cardText.html || '').substring(0, 100) + '...');

                // Try to find clickable elements within the card
                const clickableElements = await jobCards[i].$$('a, button');
                console.log(`Found ${clickableElements.length} clickable elements in the card`);

                if (clickableElements.length > 0) {
                    // Try to click the first clickable element
                    console.log('Attempting to click first clickable element...');
                    await clickableElements[0].click();
                } else {
                    // Fallback to clicking the card itself
                    console.log('No clickable elements found, attempting to click the card...');
                    await jobCards[i].click();
                }

                await randomDelay(2000, 3000);

                // Wait for job details to load with debugging
                const detailSelectors = [
                    '.jobs-unified-top-card__job-title',
                    '.job-details-jobs-unified-top-card__job-title',
                    '[data-job-title]',
                    '.jobs-unified-top-card__content',
                    '.jobs-search__job-details'
                ];

                let detailsLoaded = false;
                for (const selector of detailSelectors) {
                    try {
                        console.log(`Trying to find job details with selector: ${selector}`);
                        const element = await this.page.waitForSelector(selector, { timeout: 5000 });
                        if (element) {
                            const text = await element.evaluate(el => el.textContent);
                            console.log(`Found element with text: ${text}`);
                            detailsLoaded = true;
                            break;
                        }
                    } catch (error) {
                        console.log(`Could not find job details with selector: ${selector}`);
                    }
                }

                if (!detailsLoaded) {
                    // Take a screenshot of the current state
                    await this.page.screenshot({ path: `debug-job-${i + 1}.png` });
                    console.log(`Saved debug screenshot to debug-job-${i + 1}.png`);
                    console.log('Could not load job details, skipping this job');
                    continue;
                }

                const jobListing = await this.extractJobDetails();
                if (jobListing) {
                    console.log(`Successfully extracted details for: ${jobListing.jobTitle} at ${jobListing.companyName}`);
                    jobs.push(jobListing);
                }
            } catch (error) {
                console.error('Error extracting job details:', error);
                continue;
            }
        }

        console.log(`\nCompleted processing ${jobs.length} job listings`);
        return jobs;
    }

    private async extractJobDetails(): Promise<JobListing | null> {
        if (!this.page) return null;

        try {
            // Wait for the job details pane to load
            await this.page.waitForSelector('.jobs-search__job-details', { timeout: 5000 });

            // Try different selectors for job title
            const titleSelectors = [
                '.jobs-unified-top-card__job-title',
                '.job-details-jobs-unified-top-card__job-title',
                '[data-job-title]',
                '.jobs-unified-top-card h1',
                '.job-details-jobs-unified-top-card h1'
            ];

            let jobTitle = '';
            for (const selector of titleSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        jobTitle = await element.evaluate(el => el.textContent?.trim() || '');
                        if (jobTitle) break;
                    }
                } catch (error) {
                    console.log(`Could not find job title with selector: ${selector}`);
                }
            }

            // Try different selectors for company name
            const companySelectors = [
                '.jobs-unified-top-card__company-name',
                '.job-details-jobs-unified-top-card__company-name',
                '.jobs-company__name',
                '[data-test-job-card-company-name]'
            ];

            let companyName = '';
            for (const selector of companySelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        companyName = await element.evaluate(el => el.textContent?.trim() || '');
                        if (companyName) break;
                    }
                } catch (error) {
                    console.log(`Could not find company name with selector: ${selector}`);
                }
            }

            // Try different selectors for location
            const locationSelectors = [
                '.jobs-unified-top-card__bullet',
                '.job-details-jobs-unified-top-card__bullet',
                '.jobs-unified-top-card__workplace-type',
                '[data-test-job-card-location]'
            ];

            let location = '';
            for (const selector of locationSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        location = await element.evaluate(el => el.textContent?.trim() || '');
                        if (location) break;
                    }
                } catch (error) {
                    console.log(`Could not find location with selector: ${selector}`);
                }
            }

            // Try different selectors for description
            const descriptionSelectors = [
                '.jobs-description-content__text',
                '.jobs-box__html-content',
                '.jobs-description__content',
                '[data-test-job-description]'
            ];

            let description = '';
            for (const selector of descriptionSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        description = await element.evaluate(el => el.textContent?.trim() || '');
                        if (description) break;
                    }
                } catch (error) {
                    console.log(`Could not find description with selector: ${selector}`);
                }
            }

            const jobListing: JobListing = {
                companyName: companyName || 'Unknown Company',
                jobTitle: jobTitle || 'Unknown Title',
                location: location || 'Unknown Location',
                url: await this.page.url(),
                description: description || 'No description available',
                postedDate: await this.getText('.jobs-unified-top-card__posted-date') || 'Unknown',
                industry: await this.getText('.jobs-company__industry') || 'Unknown',
                companySize: await this.getText('.jobs-company-size') || 'Unknown'
            };

            return jobListing;
        } catch (error) {
            console.error('Error extracting job details:', error);
            return null;
        }
    }

    private async getText(selector: string): Promise<string> {
        if (!this.page) return '';

        try {
            const element = await this.page.$(selector);
            if (!element) {
                console.log(`Element not found for selector: ${selector}`);
                return '';
            }

            const text = await this.page.evaluate((el: Element) => el.textContent, element);
            return cleanText(text || '');
        } catch (error) {
            console.log(`Error getting text for selector ${selector}:`, error);
            return '';
        }
    }

    private async autoScroll(): Promise<void> {
        if (!this.page) return;

        console.log('Starting auto-scroll process...');
        
        // Scroll in smaller chunks with random delays
        let lastHeight = 0;
        let sameHeightCount = 0;
        const maxSameHeight = 3; // Stop if height doesn't change after 3 attempts

        while (sameHeightCount < maxSameHeight) {
            const currentHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
            
            if (currentHeight === lastHeight) {
                sameHeightCount++;
            } else {
                sameHeightCount = 0;
            }

            lastHeight = currentHeight;

            // Scroll a random amount (between 100 and 500 pixels)
            const scrollAmount = Math.floor(Math.random() * 400) + 100;
            
            try {
                await this.page.evaluate((scrollAmount) => {
                    window.scrollBy(0, scrollAmount);
                }, scrollAmount);

                // Add a random delay between scrolls (500ms to 1.5s)
                await randomDelay(500, 1500);

                // Occasionally pause for longer (simulating human behavior)
                if (Math.random() < 0.2) { // 20% chance
                    console.log('Taking a brief pause in scrolling...');
                    await randomDelay(1000, 2000);
                }
            } catch (error: any) {
                console.log('Error during scrolling, but continuing:', error.message || 'Unknown error');
                await randomDelay(1000, 2000);
            }
        }

        console.log('Auto-scroll completed');
        
        // Wait a moment after scrolling
        await randomDelay(2000, 3000);
    }

    async saveToCSV(jobs: JobListing[]): Promise<void> {
        console.log(`\nSaving ${jobs.length} jobs to CSV file: ${this.config.outputPath}`);
        const csvWriter = createObjectCsvWriter({
            path: this.config.outputPath,
            header: [
                { id: 'companyName', title: 'Company Name' },
                { id: 'jobTitle', title: 'Job Title' },
                { id: 'location', title: 'Location' },
                { id: 'url', title: 'URL' },
                { id: 'description', title: 'Description' },
                { id: 'postedDate', title: 'Posted Date' },
                { id: 'industry', title: 'Industry' },
                { id: 'companySize', title: 'Company Size' }
            ]
        });

        await csvWriter.writeRecords(jobs);
        console.log('Successfully saved jobs to CSV file');
    }

    async close(): Promise<void> {
        if (this.browser) {
            console.log('Closing browser...');
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('Browser closed');
        }
    }
} 