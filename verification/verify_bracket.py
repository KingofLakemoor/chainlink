from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(2000)

    # Bypass authentication by dispatching mock-login event directly
    try:
        page.evaluate("window.dispatchEvent(new CustomEvent('mock-login', { detail: { user: { uid: 'mock-user-123' }, profile: { role: 'ADMIN' } } }))")
        page.wait_for_timeout(2000)
    except Exception as e:
        print("Could not dispatch mock-login event:", e)

    # Navigate using UI instead of goto
    try:
        page.goto("http://localhost:3000/brackets")
        page.wait_for_timeout(3000)
    except Exception as e:
        print("Could not click Brackets:", e)

    # Take a screenshot to verify we are there
    page.screenshot(path="verification/screenshots/verification.png", full_page=True)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
