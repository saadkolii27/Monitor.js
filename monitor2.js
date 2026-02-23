const { chromium } = require("playwright");
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");

module.exports = async function monitorUnivH2C() {
  // ===== ENV VARIABLES =====
  const username = process.env.UNIVH2C_USERNAME;
  const password = process.env.UNIVH2C_PASSWORD;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailTo = process.env.EMAIL_TO;

  if (!username || !password || !emailUser || !emailPass || !emailTo) {
    console.log("❌ Missing environment variables for UnivH2C monitor");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  console.log(`[${timestamp}] Starting UnivH2C Monitor...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);

  try {
    // ===== LOGIN =====
    await page.goto("https://auth.univh2c.ma/cas5/login?service=https%3A%2F%2Fentv26.univh2c.ma%2FdossierPedago%2Flogin");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[name="submit"]');
    await page.waitForLoadState("networkidle");
    console.log("✅ Login submitted");

    // ===== GRADES PAGE =====
    await page.goto("https://entv26.univh2c.ma/dossierPedago/notes");
    const selector = "body"; // monitor the full page content
    await page.waitForSelector(selector);
    const pageText = await page.locator(selector).innerText();

    // ===== COMPARE PREVIOUS RESULTS =====
    const resultsFile = path.join(__dirname, "univh2c_results.txt");
    const previousResults = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const newLines = pageText.split("\n").filter(line => !previousResults.includes(line));

    // ===== SCREENSHOT =====
    const screenshotPath = path.join(__dirname, "univh2c_latest.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // ===== EMAIL NOTIFICATION =====
    if (newLines.length > 0) {
      console.log(`⚠️ ${newLines.length} new entries detected`);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass }
      });

      const html = `
      <div style="font-family:Arial;padding:20px">
        <h2 style="color:#1a73e8">📢 New Grades Detected</h2>
        <p>Detected at <b>${timestamp}</b></p>
        <pre>${newLines.join("\n")}</pre>
        <p><a href="https://entv26.univh2c.ma/dossierPedago/notes">Open Portal</a></p>
        <hr>
        <small>UnivH2C Monitor</small>
      </div>
      `;

      await transporter.sendMail({
        from: emailUser,
        to: emailTo,
        subject: "📸 UnivH2C Grades Updated",
        html: html,
        attachments: [{ filename: "grades.png", path: screenshotPath }]
      });

      fs.writeFileSync(resultsFile, pageText);
      console.log("✅ Email sent and results saved");

    } else {
      console.log("No new grades detected");
    }

    // ===== LOG =====
    const logPath = path.join(__dirname, "univh2c_monitor.log");
    const logLine = newLines.length > 0
      ? `${timestamp} → ${newLines.length} new entries`
      : `${timestamp} → checked → no change`;
    fs.appendFileSync(logPath, logLine + "\n");

  } catch (err) {
    console.log("❌ Error during UnivH2C monitor:", err);
  } finally {
    await browser.close();
    console.log("✅ Browser closed. UnivH2C monitor finished.");
  }
};
