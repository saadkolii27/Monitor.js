const { chromium } = require("playwright");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

console.log("🔹 monitor2.js started");

const username = process.env.UNIVH2C_USERNAME;
const password = process.env.UNIVH2C_PASSWORD;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailTo = process.env.EMAIL_TO;

console.log("Env check:", { username, password: !!password, emailUser, emailPass: !!emailPass, emailTo });

if (!username || !password || !emailUser || !emailPass || !emailTo) {
    console.error("❌ Missing environment variables for UnivH2C monitor");
    process.exit(1);
}

(async () => {
    console.log("🔹 Launching browser...");
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setDefaultTimeout(180000);
    page.setDefaultNavigationTimeout(180000);

    try {
        console.log("🔹 Going to login page...");
        await page.goto("https://auth.univh2c.ma/cas5/login?service=https%3A%2F%2Fentv26.univh2c.ma%2FdossierPedago%2Flogin");
        console.log("🔹 Login page loaded");

        // Fill login form (adjust selectors)
        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");
        await page.waitForLoadState("networkidle");
        console.log("✅ Logged in / waiting for grades page...");

        await page.goto("https://entv26.univh2c.ma/dossierPedago/notes");
        await page.waitForSelector("body"); // or a more specific selector
        console.log("✅ Grades page loaded");

        const resultsText = await page.locator("body").innerText();
        console.log("🔹 Page text length:", resultsText.length);

    } catch (err) {
        console.error("❌ Error in monitor2.js:", err);
    } finally {
        await browser.close();
        console.log("🔹 Browser closed. Monitor finished.");
    }
})();
