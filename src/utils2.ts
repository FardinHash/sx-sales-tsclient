import * as fs from 'fs';
import { Page } from 'puppeteer';

interface Credentials {
    email: string;
    password: string;
}

export async function getLkCredentials(filePath: string = "lk_credentials.json"): Promise<Credentials> {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

export async function enterIdsOnLkSignin(page: Page, email: string, password: string): Promise<void> {
    try {
        console.log('Waiting for username input...');
        await page.waitForSelector('#username', { visible: true, timeout: 60000 });
        console.log('Typing username...');
        await page.type('#username', email, { delay: 50 });

        console.log('Waiting for password input...');
        await page.waitForSelector('#password', { visible: true, timeout: 60000 });
        console.log('Typing password...');
        await page.type('#password', password, { delay: 50 });

        console.log('Clicking sign-in button...');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Navigation completed after sign-in.');
    } catch (error) {
        console.error('Error during sign-in:', error);
        console.log(await page.content()); // Log the page content for debugging
    }
}

export async function delay(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
}
