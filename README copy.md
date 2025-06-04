# LinkedIn Job Scraper

A TypeScript-based LinkedIn job scraper that extracts detailed job listings and saves them to CSV format.

## Features

- Extracts comprehensive job details:
  - Company Name
  - Job Title
  - Job Location
  - Job Description
  - Posted Date
  - Industry
  - Company Size
  - LinkedIn Job URL
- Implements anti-detection measures
- Saves session cookies for faster subsequent runs
- Exports data to CSV format
- Built with TypeScript for type safety

## Prerequisites

- Node.js (v14 or higher)
- npm
- A LinkedIn account

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linkedin-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your LinkedIn credentials:
```env
LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password
```

## Usage

1. Configure your search parameters in `src/index.ts`:
```typescript
const jobs = await scraper.searchJobs('Product Manager', 'San Francisco Bay Area, CA');
```

2. Run the scraper:
```bash
npx ts-node src/index.ts
```

The scraper will:
1. Log in to LinkedIn using your credentials
2. Search for jobs based on the specified parameters
3. Save the results to `data/jobs.csv`

## Configuration

You can modify the scraper's behavior in `src/config/config.ts`:

- `headless`: Run browser in headless mode (default: true)
- `searchDelay`: Delay between requests (min: 2s, max: 5s)
- `maxRetries`: Number of retry attempts for failed requests

## Output

The scraper creates two files:
- `data/cookies.json`: Saved session cookies
- `data/jobs.csv`: Scraped job listings

## Notes

- The scraper implements delays and anti-detection measures to avoid being blocked
- Always ensure you comply with LinkedIn's terms of service and rate limits
- Consider adding appropriate delays between runs to avoid excessive requests

## Error Handling

The scraper includes error handling for common issues:
- Invalid credentials
- Network errors
- Missing job details
- Session expiration

If you encounter any issues, check the console output for error messages.
