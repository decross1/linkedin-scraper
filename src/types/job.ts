export interface JobListing {
    companyName: string;
    jobTitle: string;
    location: string;
    url: string;
    description: string;
    postedDate?: string;  // Optional
    industry?: string;    // Optional
    companySize?: string; // Optional
}

export interface ScraperConfig {
    headless: boolean;
    cookiesPath: string;
    outputPath: string;
    searchDelay: {
        min: number;
        max: number;
    };
    maxRetries: number;
    navigationTimeout: number;  // Timeout for page navigation in milliseconds
} 