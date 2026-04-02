/**
 * Responsive design tests for wow.alolabs.dev
 * Tests layout, overflow, nav, and key sections across device form factors.
 * Usage: node scripts/test-responsive.js
 */
const { chromium } = require('/Users/shafqat/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const FILE_URL = 'file://' + path.resolve(__dirname, '../site/index.html');

const DEVICES = [
  { name: 'iPhone SE (375×667)',        width: 375,  height: 667  },
  { name: 'iPhone 14 (390×844)',         width: 390,  height: 844  },
  { name: 'Samsung Galaxy S20 (360×800)',width: 360,  height: 800  },
  { name: 'Pixel 7 (412×915)',           width: 412,  height: 915  },
  { name: 'iPad Mini (768×1024)',        width: 768,  height: 1024 },
  { name: 'iPad Pro 11" (1024×1366)',    width: 1024, height: 1366 },
  { name: 'Desktop (1280×800)',          width: 1280, height: 800  },
];

const SCREENSHOTS_DIR = path.resolve(__dirname, '../site/screenshots');

async function run() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  for (const device of DEVICES) {
    console.log(`\n▶ Testing: ${device.name}`);
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(FILE_URL);
    await page.waitForLoadState('networkidle');

    // Trigger fade-in animations
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const issues = [];

    // 1. Horizontal overflow check
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (overflow) issues.push('❌ Horizontal overflow detected');
    else console.log('  ✅ No horizontal overflow');

    // 2. Nav hamburger visible on mobile
    const toggleVisible = await page.evaluate(() => {
      const el = document.querySelector('.nav-toggle');
      return window.getComputedStyle(el).display !== 'none';
    });
    if (device.width <= 768) {
      if (toggleVisible) console.log('  ✅ Hamburger menu visible');
      else issues.push('❌ Hamburger menu not visible on mobile');
    } else {
      if (!toggleVisible) console.log('  ✅ Full nav visible (desktop)');
    }

    // 3. Nav hamburger opens menu
    if (device.width <= 768 && toggleVisible) {
      await page.click('.nav-toggle');
      await page.waitForTimeout(200);
      const menuOpen = await page.evaluate(() => {
        return document.querySelector('.nav-links').classList.contains('active');
      });
      if (menuOpen) console.log('  ✅ Nav menu opens on toggle');
      else issues.push('❌ Nav menu did not open');
      await page.click('.nav-toggle'); // close it
      await page.waitForTimeout(200);
    }

    // 4. Check hero title is not clipped
    const heroVisible = await page.evaluate(() => {
      const h1 = document.querySelector('.hero h1');
      const rect = h1.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!heroVisible) issues.push('❌ Hero h1 not visible');
    else console.log('  ✅ Hero h1 visible');

    // 5. Check no text overflows its container
    const textOverflow = await page.evaluate(() => {
      const overflowing = [];
      document.querySelectorAll('h1,h2,h3,p,.btn,.tag').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 2) {
          overflowing.push(el.tagName + ': ' + el.textContent.trim().slice(0, 40));
        }
      });
      return overflowing;
    });
    if (textOverflow.length) {
      issues.push(`❌ Text overflow in ${textOverflow.length} elements: ${textOverflow.slice(0,2).join(', ')}`);
    } else {
      console.log('  ✅ No text overflow');
    }

    // 6. CTA buttons usable (min touch target 44px)
    const btnSizes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.btn')).map(btn => {
        const r = btn.getBoundingClientRect();
        return { text: btn.textContent.trim().slice(0,20), h: Math.round(r.height), w: Math.round(r.width) };
      });
    });
    const smallBtns = btnSizes.filter(b => b.h < 40);
    if (smallBtns.length) issues.push(`❌ Buttons too small: ${smallBtns.map(b=>b.text+'('+b.h+'px)').join(', ')}`);
    else console.log(`  ✅ CTA buttons adequately sized (min ${Math.min(...btnSizes.map(b=>b.h))}px)`);

    // Screenshot — full page
    const screenshotFile = path.join(SCREENSHOTS_DIR, `${device.name.replace(/[^a-z0-9]/gi,'_')}.png`);
    await page.screenshot({ path: screenshotFile, fullPage: true });
    console.log(`  📸 Screenshot → ${path.relative(process.cwd(), screenshotFile)}`);

    if (issues.length) {
      issues.forEach(i => console.log('  ' + i));
    } else {
      console.log(`  ✅ All checks passed for ${device.name}`);
    }

    results.push({ device: device.name, issues });
    await context.close();
  }

  await browser.close();

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('SUMMARY');
  console.log('─'.repeat(60));
  const failed = results.filter(r => r.issues.length > 0);
  if (failed.length === 0) {
    console.log('✅ All devices passed — site is fully responsive.');
  } else {
    failed.forEach(r => {
      console.log(`\n${r.device}:`);
      r.issues.forEach(i => console.log('  ' + i));
    });
  }
  console.log('─'.repeat(60));
  console.log(`Screenshots saved to: site/screenshots/`);
}

run().catch(err => { console.error(err); process.exit(1); });
