import path from 'path';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';

async function getLeadInfo(page: puppeteer.Page): Promise<any[]> {
    const profileUrlSelector = "a[data-lead-search-result='profile-link-st190']";
    const fullNameSelector = "span[data-anonymize='person-name']";
    const locationSelector = "span[data-anonymize='location']";
    const profilePictureUrlSelector = "img[data-anonymize='headshot-photo']";
    const premiumStatusSelector = "li-icon[type='linkedin-premium-gold-icon']";
    const openLinkStatusSelector = "li-icon[type='linkedin-openlink-icon']";
    const currentCompanyNameSelector = "a[data-anonymize='company-name']";
    const currentIndustrySelector = "span[data-anonymize='industry']";
    const currentPositionTitleSelector = "span[data-anonymize='title']";

    const leads = await page.$$eval('ol > li', (elements: any[]) => {
        return elements.map(el => {
            const profileUrlElement = el.querySelector(profileUrlSelector);
            const fullNameElement = el.querySelector(fullNameSelector);
            const locationElement = el.querySelector(locationSelector);
            const profilePictureUrlElement = el.querySelector(profilePictureUrlSelector);
            const premiumStatusElement = el.querySelector(premiumStatusSelector);
            const openLinkStatusElement = el.querySelector(openLinkStatusSelector);
            const currentCompanyNameElement = el.querySelector(currentCompanyNameSelector);
            const currentIndustryElement = el.querySelector(currentIndustrySelector);
            const currentPositionTitleElement = el.querySelector(currentPositionTitleSelector);

            return {
                profileUrl: profileUrlElement ? profileUrlElement.href : '',
                fullName: fullNameElement ? fullNameElement.textContent.trim() : '',
                location: locationElement ? locationElement.textContent.trim() : '',
                profilePictureUrl: profilePictureUrlElement ? profilePictureUrlElement.src : '',
                premiumStatus: premiumStatusElement ? true : false,
                openLinkStatus: openLinkStatusElement ? true : false,
                currentCompanyName: currentCompanyNameElement ? currentCompanyNameElement.textContent.trim() : '',
                currentIndustry: currentIndustryElement ? currentIndustryElement.textContent.trim() : '',
                currentPositionTitle: currentPositionTitleElement ? currentPositionTitleElement.textContent.trim() : ''
            };
        });
    });

    return leads;
}

async function main() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('https://bitly.cx/NuT');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    const allLeads = [];
    for (let i = 1; i <= 5; i++) {
        const searchUrl = `https://bitly.cx/NuT&page=${i}`;
        await page.goto(searchUrl);
        await page.waitForSelector('ol > li');

        const leads = await getLeadInfo(page);
        allLeads.push(...leads);
    }

    console.log(`Found ${allLeads.length} leads.`);

    // Save the leads to a CSV file
    const csvContent = [
        'profileUrl,fullName,firstName,lastName,connection,location,profilePictureUrl,premiumStatus,openLinkStatus,currentCompanyName,currentIndustry,currentPositionTitle',
        ...allLeads.map(lead => `${lead.profileUrl},${lead.fullName},${lead.fullName.split(' ')[0]},${lead.fullName.split(' ').slice(1).join(' ')},${lead.connection},${lead.location},${lead.profilePictureUrl},${lead.premiumStatus},${lead.openLinkStatus},${lead.currentCompanyName},${lead.currentIndustry},${lead.currentPositionTitle}`)
    ].join('\n');

    const filePath = path.join(__dirname, 'lksn_data', `${Date.now()}_lk_salesnav_export.csv`);
    fs.writeFileSync(filePath, csvContent);
    console.log(`Saved to ${filePath}`);

    await browser.close();
}

main();