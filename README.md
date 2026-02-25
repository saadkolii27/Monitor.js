# Etalib Results Monitor

Automated monitoring system for [Etalib portal](https://etalib.fdc.ma/) results using Playwright and GitHub Actions.

## Features

- Logs in to the Etalib portal automatically.
- Navigates to the results page and extracts results text.
- Compares with previously stored results to detect changes.
- Takes a full-page screenshot (`latest_result.png`).
- Sends an HTML email with screenshot attachment when new results are detected.
- Appends a timestamped entry to `monitor.log`.
- Runs every 30 minutes via GitHub Actions and commits updated files back to the repo.

## Repository Structure

```
etalib-monitor/
├── monitor.js                    # Main monitoring script
├── package.json                  # Node.js dependencies
├── .github/
│   └── workflows/
│       └── monitor.yml           # GitHub Actions workflow
├── results.txt                   # Latest extracted results (auto-updated)
├── latest_result.png             # Latest screenshot (auto-updated)
└── monitor.log                   # Run history log (auto-updated)
```

## Setup

### 1. Fork / Clone this repository

```bash
git clone https://github.com/<your-username>/Monitor.js.git
cd Monitor.js
```

### 2. Configure GitHub Secrets

Go to your repository on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, and add the following secrets:

| Secret Name       | Value                         |
|-------------------|-------------------------------|
| `ETALIB_USERNAME` | Your Etalib student ID        |
| `ETALIB_PASSWORD` | Your Etalib password          |
| `EMAIL_USER`      | Gmail address to send from    |
| `EMAIL_PASS`      | Gmail App Password (16 chars) |
| `EMAIL_TO`        | Email address to notify       |

> **Note:** For `EMAIL_PASS`, use a [Gmail App Password](https://myaccount.google.com/apppasswords), not your regular Gmail password. 2-Step Verification must be enabled on the sending account.

### 3. Trigger the workflow

The workflow runs automatically every 30 minutes. To trigger it manually:

1. Go to the **Actions** tab in your repository.
2. Select **Etalib Results Monitor**.
3. Click **Run workflow** → **Run workflow**.

## Running Locally

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Set environment variables and run
ETALIB_USERNAME=<your_id> \
ETALIB_PASSWORD=<your_password> \
EMAIL_USER=<your_gmail> \
EMAIL_PASS=<app_password> \
EMAIL_TO=<recipient_email> \
node monitor.js
```

## How It Works

1. The GitHub Actions workflow triggers on schedule (every 30 min) or manually.
2. `monitor.js` launches a headless Chromium browser via Playwright.
3. It logs in using credentials from environment variables / GitHub Secrets.
4. It navigates to the results page and extracts the text content.
5. New lines are compared against `results.txt` from the previous run.
6. If changes are detected, an email is sent with the new results and a screenshot.
7. `results.txt`, `latest_result.png`, and `monitor.log` are committed back to the repo.
