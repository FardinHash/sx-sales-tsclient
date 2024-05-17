import csv
import time
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def scrape_linkedin(search_url, start_page, end_page, output_file_path, login_email, login_password):
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    driver.maximize_window()
    driver.get("https://www.linkedin.com/login")

    email_element = driver.find_element(By.ID, "username")
    password_element = driver.find_element(By.ID, "password")

    email_element.send_keys(login_email)
    password_element.send_keys(login_password)
    password_element.send_keys(Keys.RETURN)

    time.sleep(2)

    all_data = []

    for page in range(start_page, end_page + 1):
        driver.get(f"{search_url}&page={page}")
        time.sleep(5)

        profiles = driver.find_elements(By.CSS_SELECTOR, ".result-lockup")
        for profile in profiles:
            profile_url = profile.find_element(By.CSS_SELECTOR, "a.result-lockup__name").get_attribute("href")
            name = profile.find_element(By.CSS_SELECTOR, "a.result-lockup__name").text
            title = profile.find_element(By.CSS_SELECTOR, "div.result-lockup__highlight-keyword").text
            company_name = profile.find_element(By.CSS_SELECTOR, "a.result-lockup__company-name").text
            company_url = profile.find_element(By.CSS_SELECTOR, "a.result-lockup__company-name").get_attribute("href")
            location = profile.find_element(By.CSS_SELECTOR, "div.result-lockup__misc-item").text
            duration = profile.find_element(By.CSS_SELECTOR, "div.result-lockup__highlight-keyword").text

            # Splitting the full name into first name and last name
            first_name, last_name = name.split(' ', 1)

            is_premium = "TRUE" if profile.find_element(By.CSS_SELECTOR, "div.result-lockup__badge").text else "FALSE"

            all_data.append({
                "Linkedinprofileurl": profile_url,
                "Name": name,
                "Companyname": company_name,
                "Title": title,
                "Ispremium": is_premium,
                "Firstname": first_name,
                "Lastname": last_name,
                "Companyurl": company_url,
                "Location": location,
                "Duration": duration
            })

    with open(output_file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=["Linkedinprofileurl", "Name", "Companyname", "Title", "Ispremium", "Firstname", "Lastname", "Companyurl", "Location", "Duration"])
        writer.writeheader()
        for data in all_data:
            writer.writerow(data)

    driver.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--search-url', required=True, help="LinkedIn search URL")
    parser.add_argument('--start-page', type=int, required=True, help="Start page number")
    parser.add_argument('--end-page', type=int, required=True, help="End page number")
    parser.add_argument('--output-file-path', required=True, help="Output file path")
    parser.add_argument('--login-email', required=True, help="LinkedIn login email")
    parser.add_argument('--login-password', required=True, help="LinkedIn login password")
    args = parser.parse_args()

    scrape_linkedin(args.search_url, args.start_page, args.end_page, args.output_file_path, args.login_email, args.login_password)
