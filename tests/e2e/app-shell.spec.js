import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const publicDirectory = path.resolve(process.cwd(), 'public');
const appShellPages = fs.readdirSync(publicDirectory)
    .filter((fileName) => fileName.endsWith('.html'))
    .filter((fileName) => {
        const source = fs.readFileSync(path.join(publicDirectory, fileName), 'utf8');
        return source.includes('class="status-bar')
            && source.includes('class="header"')
            && source.includes('class="content')
            && source.includes('src="global-nav.js');
    })
    .sort();

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_onboarding_v1', 'done');
    });
});

test('every app page keeps its safe area and header fixed while content scrolls', async ({ page }) => {
    test.setTimeout(120_000);
    expect(appShellPages.length).toBeGreaterThan(35);

    for (const fileName of appShellPages) {
        await test.step(fileName, async () => {
            await page.goto(`/${fileName}`, { waitUntil: 'domcontentloaded' });

            const shell = page.locator('.phone-container > .screen');
            const header = shell.locator(':scope > .header');
            const content = shell.locator(':scope > .content');
            await expect(header).toBeVisible();
            await expect(content).toBeVisible();

            const initialHeaderTop = await header.evaluate((element) => element.getBoundingClientRect().top);
            const layout = await content.evaluate((element) => ({
                bodyOverflowY: getComputedStyle(document.body).overflowY,
                contentOverflowY: getComputedStyle(element).overflowY,
                contentTabIndex: element.tabIndex,
                contentLabel: element.getAttribute('aria-label'),
                flexGrow: getComputedStyle(element).flexGrow,
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
            }));

            expect(layout.bodyOverflowY, `${fileName} document scroll`).toBe('hidden');
            expect(layout.contentOverflowY, `${fileName} content scroll`).toBe('auto');
            expect(layout.flexGrow, `${fileName} content flex`).toBe('1');
            expect(layout.contentTabIndex, `${fileName} keyboard scroll`).toBe(0);
            expect(layout.contentLabel, `${fileName} scroll label`).toBeTruthy();

            if (layout.scrollHeight > layout.clientHeight + 1) {
                await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
                await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
            }

            await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
            expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBe(initialHeaderTop);

            const headerTrigger = header.locator('.hamburger');
            if (await headerTrigger.count()) {
                await expect(headerTrigger).toHaveJSProperty('tagName', 'BUTTON');
                await expect(headerTrigger).toHaveAttribute('aria-label', /Open navigation menu|Go back/);
                const triggerBox = await headerTrigger.boundingBox();
                expect(triggerBox.width, `${fileName} header trigger width`).toBeGreaterThanOrEqual(44);
                expect(triggerBox.height, `${fileName} header trigger height`).toBeGreaterThanOrEqual(44);
            } else {
                await expect(header.locator('button').first()).toBeVisible();
            }

            const sidebarItems = page.locator('#sidebar .menu-item');
            if (await sidebarItems.count()) {
                expect(await sidebarItems.evaluateAll((items) => items.every((item) => item.tagName === 'BUTTON'))).toBe(true);
            }

            const bottomNavigation = page.locator('.bottom-nav');
            if (await bottomNavigation.count()) {
                await expect(bottomNavigation).toHaveAttribute('role', 'navigation');
                const bottomItems = bottomNavigation.locator('.nav-item');
                expect(await bottomItems.evaluateAll((items) => items.every((item) => (
                    item.tagName === 'BUTTON' && Boolean(item.getAttribute('aria-label'))
                )))).toBe(true);
            }
        });
    }
});

test('navigation drawer traps focus, closes on Escape, and returns focus', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    const trigger = page.locator('.header > .hamburger');
    const sidebar = page.locator('#sidebar');
    const firstItem = sidebar.locator('.menu-item').first();
    const phoneContainer = page.locator('.phone-container');

    await trigger.focus();
    await trigger.click();
    await expect(sidebar).toHaveClass(/open/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(phoneContainer).toHaveJSProperty('inert', true);
    await expect(firstItem).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(phoneContainer).toHaveJSProperty('inert', false);
    await expect(trigger).toBeFocused();
});
