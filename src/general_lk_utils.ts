import * as fs from 'fs';
import { URL } from 'url';
import { Page } from 'puppeteer';

const SELECT_CONTRACT_BUTTON_SELECTOR = "#main > div > div > div:nth-child(3) > form > div > ul > li:nth-child(1) > div > div.contract-list__item-buttons > button";

interface Credentials {
    email: string;
    password: string;
}

export async function getLkCredentials(filePath: string = "./lk_credentials.json"): Promise<Credentials> {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

export async function enterIdsOnLkSignin(page: Page, email: string, password: string): Promise<void> {
    await delay(2000);
    const usernameInputElement = await page.$('#username');
    const passwordInputElement = await page.$('#password');
    if (usernameInputElement && passwordInputElement) {
        await usernameInputElement.type(email);
        await passwordInputElement.type(password);
        const submitElement = await page.$('#organic-div > form > div.login__form_action_container > button');
        await delay(1000);
        if (submitElement) {
            await submitElement.click();
        }
        await delay(5000);
    }
}

export function getLkUrlFromSalesLkUrl(url: string): string | null {
    const parsed = /\/lead\/(.*?),/i.exec(url);
    if (parsed) {
        return `https://www.linkedin.com/in/${parsed[1]}`;
    }
    return null;
}

export async function selectContractLk(page: Page): Promise<void> {
    const contractFilter = await page.$(SELECT_CONTRACT_BUTTON_SELECTOR);
    if (contractFilter) {
        await contractFilter.click();
        await delay(4000);
    }
}

export function removeUrlParameter(url: string, param: string): string {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.delete(param);
    return parsedUrl.toString();
}

export async function delay(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
}
