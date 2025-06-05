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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInScraper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const csv_writer_1 = require("csv-writer");
const config_1 = require("../config/config");
const helpers_1 = require("../utils/helpers");
const promises_1 = require("fs/promises");
// Selector constants
const SELECTORS = {
    JOB_CONTAINERS: [
        '.jobs-search__results-list',
        '.scaffold-layout__list-container',
        '.jobs-search-results-list',
        '.jobs-search-results',
        '.jobs-search-results__list',
        'div[data-view-name="job-search-results"]',
        '.jobs-search-results-grid',
        '.jobs-search__results-grid',
        '.jobs-search-results__list-item',
        '.job-card-container',
        '.jobs-search-two-pane__wrapper',
        '.jobs-search-results-list__wrapper',
        '.jobs-search-results__container',
        '.jobs-search-results__list-item--active',
        '.jobs-search-results__list-item--visited',
        '.jobs-search-results__list-item--applied'
    ],
    JOB_CARDS: [
        '.job-card-container',
        '.jobs-search-results__list-item',
        '.jobs-search-two-pane__job-card-container',
        '[data-job-id]',
        '.job-card-list',
        '.jobs-search-results__list-item--active'
    ],
    JOB_TITLE: [
        'h3.base-search-card__title',
        '.job-card-list__title',
        '.job-card-container__link',
        '.jobs-search-results__list-item-title',
        'a[data-control-name="job_card_title"]',
        '.job-card-container__link span',
        '.jobs-unified-top-card__job-title',
        '.job-details-jobs-unified-top-card__job-title'
    ],
    COMPANY_NAME: [
        'h4.base-search-card__subtitle',
        'h4.job-card-container__company-name',
        '.job-card-container__company-name',
        '.job-card-container__primary-description',
        '.base-search-card__subtitle',
        '.job-card-container__company-link',
        '.artdeco-entity-lockup__subtitle',
        '.jobs-unified-top-card__company-name',
        '.job-details-jobs-unified-top-card__company-name',
        'a[data-control-name="company_link"]'
    ],
    JOB_LINK: [
        'a.job-card-container__link',
        'a.base-card__full-link',
        'a.job-card-list__title',
        'a[data-control-name="job_card_title"]',
        '.job-card-list__title',
        'a.job-card-container__company-name'
    ],
    DESCRIPTION: [
        '.jobs-description__content',
        '.jobs-box__html-content',
        '.jobs-description',
        '.jobs-unified-description__content',
        '.jobs-search__job-details--container',
        '.job-card-container__description',
        '.base-search-card__metadata',
        '.job-card-list__description',
        '.job-card-container__metadata',
        '.jobs-description-content__text',
        'article.jobs-description__container'
    ],
    POSTED_DATE: [
        'time.job-search-card__listdate',
        '.job-card-container__listed-time',
        '.posted-time-ago__text',
        '.job-search-card__listdate--new',
        '.jobs-unified-top-card__posted-date',
        '.jobs-details-job-card__time-badge',
        'time.artdeco-entity-lockup__caption',
        '.job-card-container__metadata-wrapper time',
        '[data-test-job-card-posted-date]'
    ],
    LOCATION: [
        '.job-card-container__metadata-item',
        '.job-search-card__location',
        '.artdeco-entity-lockup__caption',
        '.job-card-container__metadata-wrapper',
        '.jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__workplace-type',
        '.jobs-unified-top-card__subtitle-primary-grouping',
        '.job-card-container__metadata-wrapper span:not([class])',
        '.job-details-jobs-unified-top-card__bullet',
        '.job-card-container__metadata-wrapper div:not([class])'
    ],
    SALARY: [
        '.job-search-card__salary-info',
        '.job-card-container__salary-info',
        '.salary-information',
        '.jobs-unified-top-card__salary',
        '.jobs-unified-top-card__metadata-salary',
        '.compensation-information',
        '.jobs-unified-top-card__metadata-compensation',
        '[data-test-job-card-salary]',
        '.job-details-jobs-unified-top-card__salary-info',
        '.job-card-list__salary',
        '.jobs-unified-top-card__primary-description span[class*="salary"]',
        '.job-details-jobs-unified-top-card__primary-description span[class*="salary"]',
        'span[class*="salary"]',
        'div[class*="salary"]'
    ],
    LOGIN_CHECK: {
        NAV_BAR: '.global-nav',
        PROFILE_ICON: '.global-nav__me-menu',
        LOGIN_FORM: '.login__form',
        JOIN_NOW: '.join-now'
    },
    DESCRIPTION_SECTIONS: {
        START_HEADERS: [
            'About the job',
            'Role and Responsibilities',
            'What You\'ll Do',
            'The Role',
            'Position Summary',
            'Job Description',
            'Overview',
            'About This Role',
            'About this role',
            'The Opportunity',
            'Description'
        ],
        END_HEADERS: [
            'Qualifications',
            'Requirements',
            'Required Skills',
            'Required Experience',
            'What You\'ll Need',
            'What You Need',
            'Basic Qualifications',
            'Minimum Qualifications',
            'Skills and Experience',
            'About Us',
            'About the Company',
            'Benefits',
            'What We Offer',
            'Perks',
            'Why Join Us',
            'Equal Opportunity'
        ]
    }
};
// Utility functions
const cleanJobTitle = (title) => {
    return title
        .replace(/\s*with verification$/, '') // Remove "with verification"
        .replace(/(.+?)\s+\1/, '$1') // Remove duplicated title
        .replace(/\s+/g, ' ') // Replace multiple spaces
        .trim();
};
const parsePostedDate = (date) => {
    if (!date)
        return 'Not specified';
    // Convert relative dates to absolute dates
    const now = new Date();
    const lowerDate = date.toLowerCase();
    if (lowerDate.includes('just now') || lowerDate.includes('now')) {
        return now.toISOString().split('T')[0];
    }
    const matches = lowerDate.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/);
    if (matches) {
        const [_, amount, unit] = matches;
        const date = new Date(now);
        switch (unit) {
            case 'hour':
                date.setHours(date.getHours() - parseInt(amount));
                break;
            case 'day':
                date.setDate(date.getDate() - parseInt(amount));
                break;
            case 'week':
                date.setDate(date.getDate() - (parseInt(amount) * 7));
                break;
            case 'month':
                date.setMonth(date.getMonth() - parseInt(amount));
                break;
        }
        return date.toISOString().split('T')[0];
    }
    return date;
};
class LinkedInScraper {
    constructor(config) {
        this.browser = null;
        this.page = null;
        this.maxRetries = 3;
        this.config = config;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Initializing scraper...');
            // Launch browser with anti-detection measures
            this.browser = yield puppeteer_1.default.launch({
                headless: this.config.headless,
                devtools: !this.config.headless, // Open DevTools by default in non-headless mode
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--start-maximized', // Start with maximized window
                    '--window-size=1920,1080' // Set a specific window size
                ],
                defaultViewport: null // This allows the content to fill the window
            });
            // Add browser close handler
            this.browser.on('disconnected', () => {
                console.log('\nBrowser was closed. Exiting...');
                process.exit(1);
            });
            console.log(`Browser launched in ${this.config.headless ? 'headless' : 'visible'} mode`);
            this.page = yield this.browser.newPage();
            console.log('New page created');
            // Set the window to maximize
            if (!this.config.headless) {
                const context = this.browser.defaultBrowserContext();
                const pages = yield this.browser.pages();
                const page = pages[0];
                // Set window bounds to maximize
                yield page.evaluate(() => {
                    window.moveTo(0, 0);
                    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                });
            }
            // Set up anti-detection measures
            yield this.page.setUserAgent((0, helpers_1.getRandomUserAgent)());
            yield this.page.setDefaultNavigationTimeout(this.config.navigationTimeout);
            yield this.page.evaluateOnNewDocument(() => {
                // Overwrite the 'navigator.webdriver' property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            });
            console.log('Anti-detection measures configured');
            // Try to load saved cookies
            try {
                console.log('Attempting to load saved cookies...');
                const cookiesString = yield (0, promises_1.readFile)(this.config.cookiesPath, 'utf8');
                const cookies = JSON.parse(cookiesString);
                yield this.page.setCookie(...cookies);
                console.log('Successfully loaded saved cookies');
            }
            catch (error) {
                console.log('No saved cookies found. Will need to perform fresh login.');
            }
            // Add page error handlers
            this.page.on('error', err => {
                console.log('\nPage crashed. Error:', err);
                this.close().then(() => process.exit(1));
            });
            this.page.on('pageerror', err => {
                console.log('\nPage error occurred:', err);
            });
        });
    }
    waitForSuccessfulLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            console.log('\n=== Manual Login Required ===');
            console.log('1. Please log in manually in the browser window');
            console.log('2. Once you are logged in, the script will continue automatically');
            console.log('3. You have 2 minutes to complete the login\n');
            try {
                // Wait for login modal or page to disappear
                yield ((_a = this.page) === null || _a === void 0 ? void 0 : _a.waitForFunction((selectors) => {
                    // Check if login modal is present
                    const loginForm = document.querySelector(selectors.LOGIN_FORM);
                    const joinNow = document.querySelector(selectors.JOIN_NOW);
                    // If any of these elements exist, we're still on the login page
                    return !loginForm && !joinNow;
                }, { timeout: 120000, polling: 1000 }, // 2 minutes timeout, check every second
                SELECTORS.LOGIN_CHECK));
                // Additional verification - wait for some elements that indicate we're logged in
                yield ((_b = this.page) === null || _b === void 0 ? void 0 : _b.waitForFunction((selectors) => {
                    // Check for elements that are typically present when logged in
                    const navBar = document.querySelector(selectors.NAV_BAR);
                    const profileIcon = document.querySelector(selectors.PROFILE_ICON);
                    // Consider logged in if we find these elements
                    return navBar !== null || profileIcon !== null;
                }, { timeout: 30000, polling: 1000 }, // 30 seconds additional timeout
                SELECTORS.LOGIN_CHECK));
                console.log('Manual login successful');
                // Save cookies for future sessions
                const cookies = yield ((_c = this.page) === null || _c === void 0 ? void 0 : _c.cookies());
                if (cookies) {
                    yield (0, promises_1.writeFile)(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
                    console.log('Cookies saved for future sessions');
                }
            }
            catch (error) {
                throw new Error('Login timeout or verification failed. Please try again and ensure you complete the login process.');
            }
        });
    }
    verifyLoginStatus() {
        return __awaiter(this, arguments, void 0, function* (retryCount = 0) {
            if (!this.page)
                throw new Error('Browser not initialized');
            console.log('Verifying login status...');
            const maxRetries = 2;
            try {
                // Check for elements that indicate we're logged in
                const isLoggedIn = yield this.page.evaluate((selectors) => {
                    const navBar = document.querySelector(selectors.NAV_BAR);
                    const profileIcon = document.querySelector(selectors.PROFILE_ICON);
                    const loginForm = document.querySelector(selectors.LOGIN_FORM);
                    const joinNow = document.querySelector(selectors.JOIN_NOW);
                    return (navBar !== null || profileIcon !== null) && !loginForm && !joinNow;
                }, SELECTORS.LOGIN_CHECK);
                if (!isLoggedIn) {
                    console.log('Not logged in, attempting to restore session...');
                    if (retryCount < maxRetries) {
                        yield this.waitForSuccessfulLogin();
                        // Verify again after login
                        return this.verifyLoginStatus(retryCount + 1);
                    }
                    else {
                        console.log('Max retry attempts reached for login verification');
                        return false;
                    }
                }
                return true;
            }
            catch (error) {
                console.error('Error verifying login status:', error);
                return false;
            }
        });
    }
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Browser not initialized');
            // First check if we're already logged in
            console.log('Checking login status...');
            yield this.page.goto(config_1.LINKEDIN_URLS.jobs);
            yield (0, helpers_1.randomDelay)(2000, 3000);
            // Check if we're on the login page or already logged in
            const currentUrl = yield this.page.url();
            if (!currentUrl.includes('/login')) {
                // Double check we're really logged in by looking for nav elements
                try {
                    yield this.page.waitForSelector('.global-nav', { timeout: 5000 });
                    console.log('Already logged in, proceeding with search');
                    return;
                }
                catch (_a) {
                    console.log('Login state unclear, requesting manual login...');
                    yield this.waitForSuccessfulLogin();
                }
            }
            else {
                yield this.waitForSuccessfulLogin();
            }
        });
    }
    searchJobs(keywords, location) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page || !this.browser)
                throw new Error('Browser not initialized');
            // Check if browser is still connected
            if (!this.browser.isConnected()) {
                console.log('\nBrowser is no longer connected. Exiting...');
                process.exit(1);
            }
            const allJobs = [];
            console.log(`\nStarting job search for "${keywords}" in "${location}"...`);
            try {
                // Navigate to search URL
                const searchUrl = `${config_1.LINKEDIN_URLS.jobs}/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
                console.log(`\nNavigating to search URL: ${searchUrl}`);
                try {
                    yield this.page.goto(searchUrl, {
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    });
                }
                catch (error) {
                    console.log('Initial navigation timeout, retrying with less strict conditions...');
                    yield this.page.goto(searchUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                }
                // Wait for any of these selectors to appear with increased timeout
                const jobSelectors = [
                    '.job-card-container',
                    '.jobs-search-results-list',
                    '.jobs-search__results-list',
                    '.jobs-search-results__list-item',
                    '.scaffold-layout__list-container',
                    '.jobs-search-results-list__wrapper',
                    '.jobs-search-results__container'
                ];
                console.log('Waiting for job listings to load...');
                let foundSelector = null;
                // Add a longer initial wait
                console.log('Waiting for page to fully load...');
                yield (0, helpers_1.randomDelay)(5000, 7000);
                // Try each selector with a longer timeout
                for (const selector of jobSelectors) {
                    try {
                        console.log(`Trying selector: ${selector}`);
                        // Increase timeout to 20 seconds per selector
                        yield this.page.waitForSelector(selector, {
                            timeout: 20000,
                            visible: true
                        });
                        foundSelector = selector;
                        console.log(`Found jobs with selector: ${selector}`);
                        break;
                    }
                    catch (error) {
                        console.log(`Selector ${selector} not found, trying next...`);
                    }
                }
                if (!foundSelector) {
                    // Try one last time with a scroll
                    console.log('No selectors found, trying with page scroll...');
                    yield this.page.evaluate(() => {
                        window.scrollTo(0, 500);
                    });
                    yield (0, helpers_1.randomDelay)(3000, 5000);
                    // Try selectors again after scroll
                    for (const selector of jobSelectors) {
                        try {
                            yield this.page.waitForSelector(selector, {
                                timeout: 10000,
                                visible: true
                            });
                            foundSelector = selector;
                            console.log(`Found jobs with selector after scroll: ${selector}`);
                            break;
                        }
                        catch (error) {
                            continue;
                        }
                    }
                    if (!foundSelector) {
                        throw new Error('Could not find any job listings after trying all selectors');
                    }
                }
                // Wait for initial render and any dynamic content
                yield (0, helpers_1.randomDelay)(5000, 7000);
                let hasMorePages = true;
                let currentPage = 1;
                while (hasMorePages) {
                    // Check browser connection at the start of each page
                    if (!this.browser.isConnected()) {
                        console.log('\nBrowser connection lost. Exiting...');
                        process.exit(1);
                    }
                    console.log(`\n=== Processing Page ${currentPage} ===`);
                    const pageJobs = [];
                    // Add instruction banner for current page
                    yield this.page.evaluate((pageNum) => {
                        // Remove any existing banner
                        const existingBanner = document.querySelector('div[data-banner="scraper-instructions"]');
                        if (existingBanner)
                            existingBanner.remove();
                        const div = document.createElement('div');
                        div.setAttribute('data-banner', 'scraper-instructions');
                        div.style.position = 'fixed';
                        div.style.top = '0';
                        div.style.left = '0';
                        div.style.right = '0';
                        div.style.backgroundColor = '#4CAF50';
                        div.style.color = 'white';
                        div.style.padding = '10px';
                        div.style.zIndex = '9999';
                        div.style.textAlign = 'center';
                        div.style.fontSize = '14px';
                        div.style.fontFamily = 'Arial, sans-serif';
                        div.innerHTML = `
                        <div style="margin-bottom: 5px">Currently on Page ${pageNum}</div>
                        <div>1. Scroll down to load all jobs on this page</div>
                        <div>2. Press Enter in the PowerShell/Terminal window when all jobs are visible</div>
                        <div>3. The script will click through each job to get descriptions</div>
                    `;
                        document.body.appendChild(div);
                    }, currentPage);
                    // Wait for user input in the terminal
                    console.log('\n=== WAITING FOR USER INPUT ===');
                    console.log(`Currently processing page ${currentPage}`);
                    console.log('1. Scroll down to load all jobs on the current page');
                    console.log('2. Press Enter HERE in this PowerShell/Terminal window when ready');
                    console.log('===============================\n');
                    process.stdout.write('Press Enter when all jobs are visible...');
                    yield new Promise(resolve => process.stdin.once('data', resolve));
                    console.log('\nStarting job extraction for this page...');
                    // Get all job cards on the current page
                    const jobCards = yield this.page.$$(foundSelector);
                    console.log(`\nFound ${jobCards.length} jobs on page ${currentPage}`);
                    // Add progress bar
                    console.log('\nProcessing jobs:');
                    console.log('=====================================');
                    // Process each job card
                    for (let i = 0; i < jobCards.length; i++) {
                        // Check browser connection before processing each job
                        if (!this.browser.isConnected()) {
                            console.log('\nBrowser connection lost. Exiting...');
                            process.exit(1);
                        }
                        try {
                            // Show progress
                            const progress = Math.round((i / jobCards.length) * 100);
                            process.stdout.write(`\rProgress: ${progress}% (${i + 1}/${jobCards.length} jobs)`);
                            // Get the job link first
                            const jobUrl = yield this.page.evaluate((card) => {
                                const link = card.querySelector('a.job-card-container__link');
                                return (link === null || link === void 0 ? void 0 : link.getAttribute('href')) || '';
                            }, jobCards[i]);
                            if (!jobUrl) {
                                console.log(`\nWarning: No job URL found for job ${i + 1}`);
                                continue;
                            }
                            try {
                                // Get basic info before clicking
                                const basicInfo = yield this.page.evaluate((selectors, card) => {
                                    const getTextContent = (selector) => {
                                        var _a;
                                        const elements = card.querySelectorAll(selector);
                                        for (const element of elements) {
                                            const text = ((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                                            if (text)
                                                return text;
                                        }
                                        return '';
                                    };
                                    // Clean text by removing extra whitespace and verification text
                                    const cleanText = (text) => {
                                        return text
                                            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                            .replace(/\s*with verification$/, '') // Remove "with verification"
                                            .replace(/(.+?)\s+\1/, '$1') // Remove duplicated text
                                            .trim();
                                    };
                                    let jobTitle = '';
                                    for (const selector of selectors.JOB_TITLE) {
                                        const text = getTextContent(selector);
                                        if (text) {
                                            jobTitle = cleanText(text);
                                            break;
                                        }
                                    }
                                    let companyName = '';
                                    for (const selector of selectors.COMPANY_NAME) {
                                        const text = getTextContent(selector);
                                        if (text) {
                                            companyName = cleanText(text);
                                            break;
                                        }
                                    }
                                    let location = '';
                                    for (const selector of selectors.LOCATION) {
                                        const text = getTextContent(selector);
                                        if (text) {
                                            location = cleanText(text);
                                            break;
                                        }
                                    }
                                    let postedDate = '';
                                    for (const selector of selectors.POSTED_DATE) {
                                        const text = getTextContent(selector);
                                        if (text) {
                                            postedDate = text;
                                            break;
                                        }
                                    }
                                    let salary = '';
                                    for (const selector of selectors.SALARY) {
                                        const text = getTextContent(selector);
                                        if (text) {
                                            // Try different salary patterns
                                            const patterns = [
                                                // Range with K format: 166K-195K or $166K-$195K
                                                /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K\b/i,
                                                // Range with full numbers: $166,000-$195,000
                                                /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
                                                // Single value with K: 150K
                                                /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K\b/i,
                                                // Single full number: $150,000
                                                /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i
                                            ];
                                            for (const pattern of patterns) {
                                                const match = text.match(pattern);
                                                if (match) {
                                                    const [_, first, second] = match;
                                                    if (second) {
                                                        // Handle range format
                                                        let min = first.replace(/,/g, '');
                                                        let max = second.replace(/,/g, '');
                                                        // Convert K to full numbers
                                                        if (text.toLowerCase().includes('k')) {
                                                            min = (parseFloat(min) * 1000).toString();
                                                            max = (parseFloat(max) * 1000).toString();
                                                        }
                                                        salary = `$${parseInt(min).toLocaleString()} - $${parseInt(max).toLocaleString()}`;
                                                        break;
                                                    }
                                                    else {
                                                        // Handle single value format
                                                        let amount = first.replace(/,/g, '');
                                                        // Convert K to full number
                                                        if (text.toLowerCase().includes('k')) {
                                                            amount = (parseFloat(amount) * 1000).toString();
                                                        }
                                                        salary = `$${parseInt(amount).toLocaleString()}`;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (salary)
                                                break;
                                        }
                                    }
                                    // If no salary found in dedicated fields, try to find it in the description
                                    if (!salary) {
                                        const descriptionText = card.textContent || '';
                                        const salaryPatterns = [
                                            // Salary range with K format
                                            /(?:salary range|compensation|pay range|range|pay):\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K\b/i,
                                            // Single salary with K format
                                            /(?:salary|compensation|pay):\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K\b/i,
                                            // Full number range format
                                            /(?:salary range|compensation|pay range|range|pay):\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
                                            // Target annual salary format
                                            /target annual salary.*?\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\b/i,
                                            // Base salary format
                                            /base salary.*?\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\b/i,
                                            // Salary range in USD format
                                            /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*(?:-|to|–)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*K?\s*USD/i
                                        ];
                                        for (const pattern of salaryPatterns) {
                                            const match = descriptionText.match(pattern);
                                            if (match) {
                                                const [_, first, second] = match;
                                                if (second) {
                                                    // Handle range format
                                                    let min = first.replace(/,/g, '');
                                                    let max = second.replace(/,/g, '');
                                                    // Convert K to full numbers
                                                    if (descriptionText.toLowerCase().includes('k')) {
                                                        min = (parseFloat(min) * 1000).toString();
                                                        max = (parseFloat(max) * 1000).toString();
                                                    }
                                                    salary = `$${parseInt(min).toLocaleString()} - $${parseInt(max).toLocaleString()}`;
                                                    break;
                                                }
                                                else {
                                                    // Handle single value format
                                                    let amount = first.replace(/,/g, '');
                                                    // Convert K to full number
                                                    if (descriptionText.toLowerCase().includes('k')) {
                                                        amount = (parseFloat(amount) * 1000).toString();
                                                    }
                                                    salary = `$${parseInt(amount).toLocaleString()}`;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    return {
                                        jobTitle,
                                        companyName,
                                        location,
                                        postedDate: postedDate || 'Not specified',
                                        salary: salary || undefined
                                    };
                                }, SELECTORS, jobCards[i]);
                                // Click the job card to load description in the right panel
                                yield jobCards[i].click();
                                yield (0, helpers_1.randomDelay)(2000, 3000);
                                // Try to get description from the right panel
                                const description = yield this.page.evaluate((selectors) => {
                                    var _a;
                                    // Clean text function
                                    const cleanText = (text) => {
                                        return text
                                            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                            .replace(/[\r\n]+/g, '\n') // Replace multiple newlines with single newline
                                            .replace(/[^\S\r\n]+/g, ' ') // Replace multiple spaces (but not newlines) with single space
                                            .split('\n') // Split into lines
                                            .map(line => line.trim()) // Trim each line
                                            .filter(line => line) // Remove empty lines
                                            .join('\n') // Join back with newlines
                                            .trim(); // Final trim
                                    };
                                    // Try multiple description selectors
                                    for (const selector of selectors.DESCRIPTION) {
                                        const element = document.querySelector(selector);
                                        if (element) {
                                            // Get raw text content preserving structure
                                            const rawText = Array.from(element.querySelectorAll('*'))
                                                .map(el => {
                                                // Add newlines for certain elements
                                                if (el.tagName === 'BR' ||
                                                    el.tagName === 'P' ||
                                                    el.tagName === 'DIV' ||
                                                    el.tagName === 'LI') {
                                                    return '\n' + el.textContent;
                                                }
                                                return el.textContent;
                                            })
                                                .filter(text => text)
                                                .join(' ');
                                            // Clean the text first
                                            const cleanedText = cleanText(rawText);
                                            // Try to find the start of the role description
                                            let roleDescription = cleanedText;
                                            for (const header of selectors.DESCRIPTION_SECTIONS.START_HEADERS) {
                                                const startIndex = cleanedText.indexOf(header);
                                                if (startIndex !== -1) {
                                                    roleDescription = cleanedText.substring(startIndex);
                                                    break;
                                                }
                                            }
                                            // Try to find where to end the description
                                            for (const endHeader of selectors.DESCRIPTION_SECTIONS.END_HEADERS) {
                                                const endIndex = roleDescription.indexOf(endHeader);
                                                if (endIndex !== -1) {
                                                    roleDescription = roleDescription.substring(0, endIndex).trim();
                                                }
                                            }
                                            // If we couldn't find clear sections, take first 1000 characters
                                            if (roleDescription === cleanedText) {
                                                roleDescription = cleanedText.substring(0, 1000) + '...';
                                            }
                                            // Final cleanup
                                            roleDescription = roleDescription
                                                .split('\n')
                                                .filter(line => line.trim().length > 0) // Remove empty lines
                                                .map(line => line.trim()) // Trim each line
                                                .join('\n');
                                            if (roleDescription)
                                                return roleDescription;
                                        }
                                    }
                                    // If no description found, try getting any text content from the right panel
                                    const panel = document.querySelector('.jobs-search__right-rail');
                                    if (panel) {
                                        const text = (_a = panel.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                                        if (text)
                                            return cleanText(text).substring(0, 1000) + '...';
                                    }
                                    return '';
                                }, SELECTORS);
                                if (basicInfo.jobTitle && (description || basicInfo.companyName)) {
                                    // Store the complete job info
                                    const jobInfo = Object.assign(Object.assign({}, basicInfo), { description: description || 'No description available', url: new URL(jobUrl, 'https://www.linkedin.com').href });
                                    // Clean up any remaining issues in the job info
                                    Object.keys(jobInfo).forEach(key => {
                                        if (typeof jobInfo[key] === 'string') {
                                            jobInfo[key] = jobInfo[key]
                                                .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                                                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                                .trim();
                                        }
                                    });
                                    pageJobs.push(jobInfo);
                                    allJobs.push(jobInfo);
                                    // Log success
                                    console.log(`\nExtracted job ${i + 1}/${jobCards.length}: ${jobInfo.jobTitle}`);
                                    console.log(`Company: ${jobInfo.companyName}`);
                                    console.log(`Location: ${jobInfo.location}`);
                                    if (jobInfo.salary)
                                        console.log(`Salary: ${jobInfo.salary}`);
                                    // Save progress after each successful job
                                    const progressFileName = `linkedin_jobs_progress_page${currentPage}.csv`;
                                    const progressWriter = (0, csv_writer_1.createObjectCsvWriter)({
                                        path: progressFileName,
                                        header: [
                                            { id: 'jobTitle', title: 'Job Title' },
                                            { id: 'companyName', title: 'Company Name' },
                                            { id: 'location', title: 'Location' },
                                            { id: 'salary', title: 'Salary' },
                                            { id: 'url', title: 'URL' },
                                            { id: 'description', title: 'Description' },
                                            { id: 'postedDate', title: 'Posted Date' }
                                        ]
                                    });
                                    yield progressWriter.writeRecords(pageJobs);
                                }
                                else {
                                    console.log(`\nWarning: Incomplete job details for job ${i + 1}`);
                                }
                            }
                            catch (error) {
                                console.log(`\nError processing job ${i + 1}:`, error);
                                // Continue with next job
                                continue;
                            }
                            // Add a delay before next job
                            yield (0, helpers_1.randomDelay)(2000, 3000);
                        }
                        catch (error) {
                            console.log(`\nError processing job ${i + 1}:`, error);
                            // Continue with next job instead of failing completely
                            continue;
                        }
                    }
                    // Complete the progress bar
                    console.log('\n=====================================');
                    console.log(`Completed processing ${pageJobs.length} jobs on page ${currentPage}`);
                    // Save this page's results to a CSV
                    const pageFileName = `linkedin_jobs_page${currentPage}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
                    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                        path: pageFileName,
                        header: [
                            { id: 'jobTitle', title: 'Job Title' },
                            { id: 'companyName', title: 'Company Name' },
                            { id: 'location', title: 'Location' },
                            { id: 'salary', title: 'Salary' },
                            { id: 'url', title: 'URL' },
                            { id: 'description', title: 'Description' },
                            { id: 'postedDate', title: 'Posted Date' }
                        ]
                    });
                    yield csvWriter.writeRecords(pageJobs);
                    console.log(`\nSaved ${pageJobs.length} jobs from page ${currentPage} to: ${pageFileName}`);
                    // Check for next page button
                    const hasNextPage = yield this.page.evaluate(() => {
                        const nextButton = document.querySelector('button[aria-label="Next"]');
                        return nextButton && !nextButton.hasAttribute('disabled');
                    });
                    if (hasNextPage) {
                        console.log('\n=== NEXT PAGE AVAILABLE ===');
                        console.log('Would you like to proceed to the next page?');
                        process.stdout.write('Press Enter to continue to next page, or type "n" and Enter to stop here: ');
                        const response = yield new Promise(resolve => {
                            process.stdin.once('data', data => resolve(data.toString().trim().toLowerCase()));
                        });
                        if (response === 'n') {
                            console.log('\nStopping at user request.');
                            hasMorePages = false;
                        }
                        else {
                            // Click next page button
                            yield this.page.click('button[aria-label="Next"]');
                            console.log('\nNavigating to next page...');
                            yield (0, helpers_1.randomDelay)(3000, 5000);
                            currentPage++;
                        }
                    }
                    else {
                        console.log('\nNo more pages available.');
                        hasMorePages = false;
                    }
                }
                // Remove the instruction banner
                yield this.page.evaluate(() => {
                    const banner = document.querySelector('div[data-banner="scraper-instructions"]');
                    if (banner)
                        banner.remove();
                });
                // Save all jobs to a final CSV
                const finalFileName = `linkedin_jobs_all_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
                const finalCsvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                    path: finalFileName,
                    header: [
                        { id: 'jobTitle', title: 'Job Title' },
                        { id: 'companyName', title: 'Company Name' },
                        { id: 'location', title: 'Location' },
                        { id: 'salary', title: 'Salary' },
                        { id: 'url', title: 'URL' },
                        { id: 'description', title: 'Description' },
                        { id: 'postedDate', title: 'Posted Date' }
                    ]
                });
                yield finalCsvWriter.writeRecords(allJobs);
                console.log(`\nCompleted processing ${allJobs.length} total job listings`);
                console.log(`Saved all jobs to: ${finalFileName}`);
                return allJobs;
            }
            catch (error) {
                console.log('\nAn error occurred during job search:', error);
                yield this.close();
                process.exit(1);
            }
        });
    }
    waitForJobDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const detailSelectors = [
                '.jobs-unified-top-card__job-title',
                '.job-details-jobs-unified-top-card__job-title',
                '.jobs-unified-top-card__content',
                '.jobs-search__job-details',
                '[data-job-title]'
            ];
            for (const selector of detailSelectors) {
                try {
                    console.log(`Trying to find job details with selector: ${selector}`);
                    const element = yield ((_a = this.page) === null || _a === void 0 ? void 0 : _a.waitForSelector(selector, { timeout: 5000 }));
                    if (element) {
                        const text = yield element.evaluate(el => el.textContent);
                        console.log(`Found element with text: ${text}`);
                        return true;
                    }
                }
                catch (error) {
                    console.log(`Could not find job details with selector: ${selector}`);
                }
            }
            return false;
        });
    }
    extractJobDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                return null;
            try {
                // Wait for the job details pane to load
                yield this.page.waitForSelector('.jobs-unified-top-card', { timeout: 5000 });
                // Extract all job details in a single evaluate call to avoid context switching
                const jobInfo = yield this.page.evaluate(() => {
                    const getTextContent = (selector) => {
                        var _a;
                        const element = document.querySelector(selector);
                        return element ? ((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '' : '';
                    };
                    // Get job title
                    const titleSelectors = [
                        '.jobs-unified-top-card__job-title',
                        '.job-details-jobs-unified-top-card__job-title',
                        '[data-job-title]',
                        '.jobs-unified-top-card h1',
                        '.job-details-jobs-unified-top-card h1',
                        '.jobs-search-results-list__title'
                    ];
                    let jobTitle = '';
                    for (const selector of titleSelectors) {
                        jobTitle = getTextContent(selector);
                        if (jobTitle)
                            break;
                    }
                    // Get company name
                    const companySelectors = [
                        '.jobs-unified-top-card__company-name',
                        '.job-details-jobs-unified-top-card__company-name',
                        '.jobs-company__name',
                        '[data-test-job-card-company-name]',
                        '.jobs-search-results-list__subtitle'
                    ];
                    let companyName = '';
                    for (const selector of companySelectors) {
                        companyName = getTextContent(selector);
                        if (companyName)
                            break;
                    }
                    // Get location
                    const locationSelectors = [
                        '.jobs-unified-top-card__bullet',
                        '.job-details-jobs-unified-top-card__bullet',
                        '.jobs-unified-top-card__workplace-type',
                        '[data-test-job-card-location]',
                        '.jobs-search-results-list__location'
                    ];
                    let location = '';
                    for (const selector of locationSelectors) {
                        location = getTextContent(selector);
                        if (location)
                            break;
                    }
                    // Get description
                    const descriptionSelectors = [
                        '.jobs-description-content__text',
                        '.jobs-box__html-content',
                        '.jobs-description',
                        '[data-test-job-description]',
                        '.jobs-search-results-list__description',
                        '.jobs-description',
                        '.job-view-layout',
                        '.jobs-description__container',
                        '.jobs-unified-description__content'
                    ];
                    let description = '';
                    for (const selector of descriptionSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            // Get all text content, including from nested elements
                            description = Array.from(element.querySelectorAll('*'))
                                .map(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); })
                                .filter(text => text)
                                .join('\n');
                            if (description)
                                break;
                        }
                    }
                    // Get posted date
                    const dateSelectors = [
                        '.jobs-unified-top-card__posted-date',
                        '.jobs-details-job-card__time-badge',
                        '.job-card-container__listed-time',
                        'time.artdeco-entity-lockup__caption',
                        '.job-card-container__metadata-wrapper time',
                        '[data-test-job-card-posted-date]',
                        '.posted-time-ago__text',
                        '.job-search-card__listdate',
                        '.jobs-search-results-list__posted-date'
                    ];
                    let postedDate = '';
                    for (const selector of dateSelectors) {
                        postedDate = getTextContent(selector);
                        if (postedDate)
                            break;
                    }
                    // Get salary if available
                    const salarySelectors = [
                        '.jobs-unified-top-card__salary',
                        '.jobs-unified-top-card__metadata-salary',
                        '.compensation-information',
                        '.jobs-unified-top-card__metadata-compensation',
                        '[data-test-job-card-salary]',
                        '.job-card-container__salary-info',
                        '.salary-information',
                        '.jobs-search-results-list__salary'
                    ];
                    let salary = '';
                    for (const selector of salarySelectors) {
                        salary = getTextContent(selector);
                        if (salary)
                            break;
                    }
                    return {
                        jobTitle,
                        companyName,
                        location,
                        description,
                        postedDate,
                        url: window.location.href,
                        salary: salary || undefined
                    };
                });
                return jobInfo;
            }
            catch (error) {
                console.error('Error extracting job details:', error);
                return null;
            }
        });
    }
    getText(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                return '';
            try {
                return yield this.page.evaluate((sel) => {
                    var _a;
                    const element = document.querySelector(sel);
                    return element ? ((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '' : '';
                }, selector);
            }
            catch (error) {
                console.log(`Error getting text for selector ${selector}:`, error);
                return '';
            }
        });
    }
    autoScroll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                return;
            console.log('Starting auto-scroll process...');
            // Keep track of the total jobs found
            let previousJobCount = 0;
            let sameCountIterations = 0;
            const maxSameCountIterations = 10; // Increased from 5 to 10 to try to load more jobs
            // Scroll in smaller chunks with random delays
            while (sameCountIterations < maxSameCountIterations) {
                // Get current job count
                const currentJobCount = yield this.page.evaluate(() => {
                    const cards = document.querySelectorAll('.job-card-container');
                    return cards.length;
                });
                console.log(`Current job count: ${currentJobCount}`);
                if (currentJobCount === previousJobCount) {
                    sameCountIterations++;
                    console.log(`No new jobs found (attempt ${sameCountIterations}/${maxSameCountIterations})`);
                }
                else {
                    sameCountIterations = 0;
                    console.log(`Found ${currentJobCount - previousJobCount} new jobs`);
                }
                previousJobCount = currentJobCount;
                try {
                    // Scroll a larger amount (between 500 and 1000 pixels)
                    const scrollAmount = Math.floor(Math.random() * 500) + 500;
                    // Scroll and wait for network idle
                    yield this.page.evaluate((scrollAmount) => {
                        window.scrollBy(0, scrollAmount);
                    }, scrollAmount);
                    // Wait for potential new content to load
                    yield this.page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
                        // Ignore timeout errors, just continue
                    });
                    // Add a random delay between scrolls (2s to 4s)
                    yield (0, helpers_1.randomDelay)(2000, 4000);
                    // Click "Show more jobs" button if present
                    const showMoreButton = yield this.page.$('button.infinite-scroller__show-more-button, button.artdeco-button--muted');
                    if (showMoreButton) {
                        console.log('Clicking "Show more jobs" button...');
                        yield showMoreButton.click();
                        yield (0, helpers_1.randomDelay)(3000, 5000);
                    }
                    // Try to click "See more jobs" button if present
                    const seeMoreButtons = yield this.page.$$('button.see-more-jobs, button.jobs-search-results__see-more-jobs');
                    for (const button of seeMoreButtons) {
                        console.log('Clicking "See more jobs" button...');
                        yield button.click();
                        yield (0, helpers_1.randomDelay)(3000, 5000);
                    }
                }
                catch (error) {
                    console.log('Error during scrolling, but continuing:', error.message || 'Unknown error');
                    yield (0, helpers_1.randomDelay)(3000, 5000);
                }
            }
            console.log(`Auto-scroll completed. Found ${previousJobCount} total jobs`);
            // Wait a moment after scrolling
            yield (0, helpers_1.randomDelay)(3000, 5000);
        });
    }
    saveToCSV(jobs) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`\nSaving ${jobs.length} jobs to CSV file: ${this.config.outputPath}`);
            const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: this.config.outputPath,
                header: [
                    { id: 'jobTitle', title: 'Job Title' },
                    { id: 'companyName', title: 'Company Name' },
                    { id: 'location', title: 'Location' },
                    { id: 'salary', title: 'Salary' },
                    { id: 'url', title: 'URL' },
                    { id: 'description', title: 'Description' },
                    { id: 'postedDate', title: 'Posted Date' }
                ]
            });
            yield csvWriter.writeRecords(jobs);
            console.log('Successfully saved jobs to CSV file');
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.browser) {
                console.log('\nClosing browser...');
                try {
                    yield this.browser.close();
                }
                catch (error) {
                    console.log('Error while closing browser:', error);
                }
                this.browser = null;
                this.page = null;
                console.log('Browser closed');
            }
        });
    }
    // Add a new method to check browser health
    checkBrowserHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.browser || !this.page)
                return false;
            try {
                return this.browser.isConnected() && !this.page.isClosed();
            }
            catch (_a) {
                return false;
            }
        });
    }
}
exports.LinkedInScraper = LinkedInScraper;
