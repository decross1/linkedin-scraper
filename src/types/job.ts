export interface JobListing {
    jobTitle: string;
    companyName: string;
    location: string;
    description: string;
    url: string;
    postedDate: string;
    salary?: string;
    [key: string]: string | undefined;  // Allow string indexing with optional undefined values
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