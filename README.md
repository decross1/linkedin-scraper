# LinkedIn Job Scraper

A TypeScript-based tool for scraping job listings from LinkedIn. This tool uses Puppeteer for web automation and provides a structured way to collect job posting data.

## Features

- Automated LinkedIn job search
- Manual login support with cookie persistence
- Job details extraction including:
  - Company name
  - Job title
  - Location
  - Job description
  - Posted date
  - Industry
  - Company size
- CSV export of results
- Anti-detection measures
- Human-like scrolling behavior

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your LinkedIn credentials:
```
LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password
```

3. Create a `data` directory in the root folder for storing cookies and output:
```bash
mkdir data
```

## Usage

Run the scraper:
```bash
npx ts-node src/index.ts
```

The script will:
1. Launch a browser window
2. Handle LinkedIn login (manual or automated)
3. Search for specified job listings
4. Extract job details
5. Save results to `data/jobs.csv`

## Project Structure

```
src/
├── config/      # Configuration settings
├── scrapers/    # Main scraping logic
├── types/       # TypeScript type definitions
└── utils/       # Helper functions
```

## Dependencies

- TypeScript
- Puppeteer (Web automation)
- csv-writer (CSV export)
- dotenv (Environment variables)

## Notes

- The scraper includes anti-detection measures but may still be detected by LinkedIn
- Manual login may be required if automated login fails
- Respect LinkedIn's terms of service and rate limits 