const { chromium } = require("playwright");
const nodemailer = require("nodemailer");
const fs = require("fs");

const LAST_RESULTS_FILE = "latest_result2.txt";

async function runMonitor() {
    const browser = await chromium.launch({
        headless: true // must be headless on GitHub Actions
        // proxy optional, remove if not needed
    });

    const page = await browser.newPage();

    try {
        // LOGIN
        await page.goto("https://auth.univh2c.ma/cas5/login?service=https%3A%2F%2Fentv26.univh2c.ma%2FdossierPedago%2Flogin");
        await page.fill("input[name='username']", process.env.UH2_USERNAME);
        await page.fill("input[name='password']", process.env.UH2_PASSWORD);
        await page.click("button[type='submit']");
        await page.waitForLoadState("networkidle");

        // CONTINUE BUTTON
        await page.waitForSelector('button[name="continue"]', { timeout: 15000 });
        await page.click('button[name="continue"]');

        // GRADES PAGE
        await page.goto("https://entv26.univh2c.ma/dossierPedago/notes");
        await page.waitForSelector("body");

        // CLICK 2ème Année Gestion
        await page.waitForSelector('text=2ème  Année Gestion', { timeout: 15000 });
        await page.click('text=2ème  Année Gestion');
        await page.waitForLoadState("networkidle");

        // GET PAGE CONTENT
        const content = await page.content();

        // CHECK FOR CHANGES
        let lastContent = "";
        if (fs.existsSync(LAST_RESULTS_FILE)) {
            lastContent = fs.readFileSync(LAST_RESULTS_FILE, "utf-8");
        }

        if (content === lastContent) {
            console.log("No new results detected.");
        } else {
            console.log("New results detected!");

            // SAVE new content
            fs.writeFileSync(LAST_RESULTS_FILE, content);

            // TAKE SCREENSHOT
            const screenshotPath = "results2.png";
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log("Screenshot saved:", screenshotPath);

            // SEND EMAIL
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_TO,
                subject: "University Results Update",
                text: "New results page screenshot attached.",
                attachments: [
                    {
                        filename: screenshotPath,
                        path: `./${screenshotPath}`
                    }
                ]
            });

            console.log("Email sent successfully");
        }

        // Append to log
        fs.appendFileSync("monitor2.log", `${new Date().toISOString()} → checked\n`);

    } catch (err) {
        console.error("Error in monitor:", err);
        fs.appendFileSync("monitor2.log", `${new Date().toISOString()} → error: ${err.message}\n`);
    } finally {
        await browser.close();
    }
}

// Run the monitor
runMonitor().catch(err => console.error("Fatal error:", err));
