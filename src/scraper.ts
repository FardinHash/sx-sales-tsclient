import * as puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { ArgumentParser } from 'argparse';
import { JSDOM } from 'jsdom';
import * as readline from 'readline';
import { getLkCredentials, enterIdsOnLkSignin, getLkUrlFromSalesLkUrl, removeUrlParameter, delay } from './general_lk_utils';

const SCROLL_TO_BOTTOM_COMMAND = "document.getElementById('search-results-container').scrollTop+=100000;";
const LK_CREDENTIALS_PATH = "./lk_credentials.json";

async function getNameInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.flex.flex-wrap.align-items-center > div.artdeco-entity-lockup__title.ember-view > a";
    const els = resultEl.querySelectorAll(selector);
    let linkToProfile = "";
    let fullName = "";
    let firstName = "";
    let lastName = "";
    if (els.length > 0) {
        linkToProfile = (els[0] as HTMLAnchorElement).href;
        const elContents = els[0].textContent?.trim() || "";
        fullName = elContents;
        const nameParts = fullName.split(' ');
        firstName = nameParts.shift() || "";
        lastName = nameParts.join(' ');
    }
    return { profile_url: linkToProfile, full_name: fullName, first_name: firstName, last_name: lastName };
}

async function getConnectionLevelInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.flex.flex-wrap.align-items-center > div.artdeco-entity-lockup__badge.ember-view.ml1 > span.artdeco-entity-lockup__degree";
    const els = resultEl.querySelectorAll(selector);
    let connection = "";
    if (els.length > 0) {
        connection = (els[0].textContent || "").trim().replace("·\xa0", "");
    }
    return { connection };
}

async function getSearchUrl(searchUrlBase: URL, page = 1) {
    searchUrlBase.searchParams.set('page', page.toString());
    return searchUrlBase.toString();
}

async function getLinkedInPremiumInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.inline-flex > div > li-icon";
    const els = resultEl.querySelectorAll(selector);
    const is_premium = els.length > 0;
    return { is_premium };
}

async function getRoleInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.artdeco-entity-lockup__subtitle.ember-view.t-14 > span";
    const els = resultEl.querySelectorAll(selector);
    let current_position_title = "";
    if (els.length > 0) {
        current_position_title = (els[0].textContent || "").trim();
    }
    return { current_position_title };
}

async function getCompanyInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.artdeco-entity-lockup__subtitle.ember-view.t-14 > a";
    const els = resultEl.querySelectorAll(selector);
    let current_company_name = "";
    if (els.length > 0) {
        current_company_name = (els[0].textContent || "").trim();
    }
    return { current_company_name };
}

async function getLocationInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mt2 > div > div.artdeco-entity-lockup__caption.ember-view.t-14.t-black--light > span";
    const els = resultEl.querySelectorAll(selector);
    let location = "";
    if (els.length > 0) {
        location = (els[0].textContent || "").trim();
    }
    return { location };
}

async function getProfilePicUrlFromResultEl(resultEl: Element) {
    const selector = "div > div > div.entity-result__content > div > div.entity-result__image > div > img";
    const els = resultEl.querySelectorAll(selector);
    let profile_pic_url = "";
    if (els.length > 0) {
        profile_pic_url = (els[0] as HTMLImageElement).src;
    }
    return { profile_pic_url };
}

async function getOpenLinkInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.flex.justify-space-between.full-width > div.flex.flex-column > div.mb3 > div > div.artdeco-entity-lockup__content.ember-view > div.inline-flex > div > li-icon[type='openlink']";
    const els = resultEl.querySelectorAll(selector);
    const is_open_link = els.length > 0;
    return { is_open_link };
}

async function getIndustryInfoFromResultEl(resultEl: Element) {
    const selector = "div > div > div.entity-result__content > div > div.entity-result__primary-subtitle";
    const els = resultEl.querySelectorAll(selector);
    let current_industry = "";
    if (els.length > 0) {
        current_industry = (els[0].textContent || "").trim();
    }
    return { current_industry };
}

async function getInfoFromResultEl(resultEl: Element) {
    const nameInfo = await getNameInfoFromResultEl(resultEl);
    const connectionLevelInfo = await getConnectionLevelInfoFromResultEl(resultEl);
    const linkedInPremiumInfo = await getLinkedInPremiumInfoFromResultEl(resultEl);
    const roleInfo = await getRoleInfoFromResultEl(resultEl);
    const companyInfo = await getCompanyInfoFromResultEl(resultEl);
    const locationInfo = await getLocationInfoFromResultEl(resultEl);
    const profilePicUrlInfo = await getProfilePicUrlFromResultEl(resultEl);
    const openLinkInfo = await getOpenLinkInfoFromResultEl(resultEl);
    const industryInfo = await getIndustryInfoFromResultEl(resultEl);

    return {
        ...nameInfo,
        ...connectionLevelInfo,
        ...linkedInPremiumInfo,
        ...roleInfo,
        ...companyInfo,
        ...locationInfo,
        ...profilePicUrlInfo,
        ...openLinkInfo,
        ...industryInfo,
        time_scraped: Date.now(),
    };
}

async function getResultEls(pageSource: string) {
    const dom = new JSDOM(pageSource);
    const document = dom.window.document;
    const fullResultsSelector = "#search-results-container > div > ol > li";
    return Array.from(document.querySelectorAll(fullResultsSelector));
}

async function getAllInfoFromPageSource(pageSource: string) {
    const resultEls = await getResultEls(pageSource);
    const infos = await Promise.all(resultEls.map(el => getInfoFromResultEl(el)));
    return infos;
}

async function getAllInfoFromSearchUrl(page: puppeteer.Page, url: string, waitAfterPageLoaded = 3, waitAfterScrollDown = 2) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); // Increased timeout to 90 seconds
    await delay(waitAfterPageLoaded * 1000);
    await page.evaluate(SCROLL_TO_BOTTOM_COMMAND);
    await delay(waitAfterScrollDown * 1000);
    const pageSource = await page.content();
    return await getAllInfoFromPageSource(pageSource);
}

async function scrapLksnPages(page: puppeteer.Page, pageList: number[], getSearchUrl: (page: number) => Promise<string>, waitTimeBetweenPages = 3, waitAfterPageLoaded = 3, waitAfterScrollDown = 2) {
    let totalInfo: any[] = [];
    for (const p of pageList) {
        await delay(waitTimeBetweenPages * 1000);
        const url = await getSearchUrl(p);
        const info = await getAllInfoFromSearchUrl(page, url, waitAfterPageLoaded, waitAfterScrollDown);
        totalInfo = totalInfo.concat(info);
    }
    return totalInfo;
}

async function main() {
    const parser = new ArgumentParser({
        description: 'Scrap LinkedIn Sales Navigator',
    });

    parser.add_argument('--search-url', { type: String, help: 'The url of the search page to scrap', required: true });
    parser.add_argument('--start-page', { type: Number, help: 'The page to start scrapping from', required: false, default: 1 });
    parser.add_argument('--end-page', { type: Number, help: 'The page to end scrapping at', required: false, default: 1 });
    parser.add_argument('--wait-time-between-pages', { type: Number, help: 'The time in seconds to wait between pages', required: false, default: 5 });
    parser.add_argument('--wait-after-page-loaded', { type: Number, help: 'The time in seconds to wait after the page is loaded', required: false, default: 3 });
    parser.add_argument('--wait-after-scroll-down', { type: Number, help: 'The time in seconds to wait after scrolling down', required: false, default: 3 });
    parser.add_argument('--save-format', { type: String, help: 'The format to save the data in (xlsx or csv)', required: false, default: 'csv' });

    const args = parser.parse_args();

    const {
        search_url: searchUrl,
        start_page: startPage,
        end_page: endPage,
        wait_time_between_pages: waitTimeBetweenPages,
        wait_after_page_loaded: waitAfterPageLoaded,
        wait_after_scroll_down: waitAfterScrollDown,
        save_format: saveFormat,
    } = args;

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/login/');

    const credentials = await getLkCredentials(LK_CREDENTIALS_PATH);
    await enterIdsOnLkSignin(page, credentials.email, credentials.password);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Please complete any required verification and press Enter...', () => {
        rl.close();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 });

    const searchUrlBase = new URL(searchUrl);
    const cleanedSearchUrlBase = removeUrlParameter(searchUrl, 'page');

    const lksnSearchInfos = await scrapLksnPages(page, Array.from({ length: endPage - startPage + 1 }, (_, i) => i + startPage), page => getSearchUrl(new URL(cleanedSearchUrlBase), page), waitTimeBetweenPages, waitAfterPageLoaded, waitAfterScrollDown);

    console.log(`Found ${lksnSearchInfos.length} leads.`);

    const outputDir = 'lksn_data';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const timestamp = Date.now();
    const fileName = path.join(outputDir, `${timestamp}_lk_salesnav_export.${saveFormat}`);

    if (saveFormat === 'csv') {
        const header = Object.keys(lksnSearchInfos[0]).join(',');
        const data = lksnSearchInfos.map(info => Object.values(info).join(',')).join('\n');
        fs.writeFileSync(fileName, `${header}\n${data}`, 'utf-8');
    } else {
        // You can use a library like exceljs to write xlsx files
    }

    console.log(`Saved to ${fileName}`);

    await browser.close();
}

main().catch(console.error);
