import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { getLkCredentials, enterIdsOnLkSignin, delay } from './utils2';

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
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const credentials = await getLkCredentials();
    await page.goto('https://www.linkedin.com/sales/login');

    try {
        await enterIdsOnLkSignin(page, credentials.email, credentials.password);

        // Ensure the URL is correct and accessible
        const searchUrl = 'https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A3742503252%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3ACURRENT_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253Aorganization%253A1189697%2Ctext%3AOptimizely%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))%2C(id%3Aurn%253Ali%253Aorganization%253A3653845%2Ctext%3ASnowflake%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))%2C(id%3Aurn%253Ali%253Aorganization%253A1066442%2Ctext%3ADatadog%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))%2C(id%3Aurn%253Ali%253Aorganization%253A2857634%2Ctext%3ACoinbase%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))%2C(id%3Aurn%253Ali%253Aorganization%253A400528%2Ctext%3ATwilio%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))%2C(id%3Aurn%253Ali%253Aorganization%253A2532259%2Ctext%3AZoom%2CselectionType%3AINCLUDED%2Cparent%3A(id%3A0))))%2C(type%3ACURRENT_TITLE%2Cvalues%3AList((id%3A280%2Ctext%3AChief%2520Operating%2520Officer%2CselectionType%3AINCLUDED)%2C(id%3A14%2Ctext%3ASales%2520Manager%2CselectionType%3AINCLUDED)))))&sessionId=T85e33rOR%2FOGZgyNt%2FUUHA%3D%3D&viewAllFilters=true';
        await page.goto(searchUrl);

        const allLeads = [];
        for (let i = 1; i <= 5; i++) {
            const paginatedUrl = `${searchUrl}&page=${i}`;
            await page.goto(paginatedUrl);
            await page.waitForSelector('ol > li', { timeout: 60000 });

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
    } catch (error) {
        console.error('Error during the process:', error);
        console.log(await page.content()); // Log the page content for debugging
        await browser.close();
    }
}

main();
