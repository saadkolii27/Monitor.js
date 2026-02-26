const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");

(async () => {
  const username = process.env.ETALIB_USERNAME;
  const password = process.env.ETALIB_PASSWORD;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailTo = process.env.EMAIL_TO;

  if (!username || !password || !emailUser || !emailPass || !emailTo) {
    console.log("❌ Missing environment variables.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  console.log(`[${timestamp}] Starting University Monitor...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);

  try {
    // ===== LOGIN =====
    await page.goto("https://etalib.fdc.ma/etalib/login");
    await page.fill("input[name='j_username']", username);
    await page.fill("input[name='j_password']", password);
    await page.click("button[type='submit']");
    await page.waitForLoadState("networkidle");
    console.log("✅ Login submitted.");

    // ===== RESULTS PAGE =====
    await page.goto("https://etalib.fdc.ma/etalib/ent/resultat");
    const selector = "div.content-wrapper div.content";
    await page.waitForSelector(selector);
    const resultsText = await page.locator(selector).innerText();

    const resultsFile = path.join(__dirname, "results.txt");
    const previousResults = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const newLines = resultsText.split("\n").filter(line => !previousResults.includes(line)).filter(line => line.trim() !== "");

    // ===== SCREENSHOT =====
    const screenshotPath = path.join(__dirname, "latest_result.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // ===== SEND EMAIL =====
    if (newLines.length > 0) {
      console.log(`⚠️ ${newLines.length} new grade(s) detected`);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass }
      });

      const htmlContent = `
        <div style="font-family:Arial;padding:20px">
          <h2 style="color:#1a73e8">📢 New Etalib Results</h2>
          <p>Detected at <b>${timestamp}</b></p>
          <ul>
            ${newLines.map(line => `<li>${line}</li>`).join("")}
          </ul>
          <p><a href='https://etalib.fdc.ma/etalib/ent/resultat'>Open Etalib Portal</a></p>
        </div>
      `;

      await transporter.sendMail({
        from: emailUser,
        to: emailTo,
        subject: "📸 Etalib Results Updated",
        html: htmlContent,
        attachments: [{ filename: "results.png", path: screenshotPath }]
      });

      console.log("✅ Email sent");
    } else {
      console.log("No new grades detected");
    }

    // ===== SAVE RESULTS =====
    fs.writeFileSync(resultsFile, resultsText);

    // ===== LOG =====
    const logPath = path.join(__dirname, "monitor.log");
    const logLine = newLines.length > 0
      ? `${timestamp} → ${newLines.length} new grades`
      : `${timestamp} → checked → no change`;
    fs.appendFileSync(logPath, logLine + "\n");

  } catch (err) {
    console.log("❌ Error during monitoring:", err);
  } finally {
    await browser.close();
    console.log("✅ Browser closed.");
  }
})();
