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

    try:
        page.goto("http://localhost:3000/brackets")
        page.wait_for_timeout(3000)
    except Exception as e:
        print("Could not navigate to Brackets:", e)

    # Click a team to advance them using evaluate since they have a pointer-events-none overlay
    try:
        # Using evaluate to click because of the pointer-events-none overlay logic
        page.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const e = btns.find(b => b.textContent.includes('Winner Group E'));
            if(e) e.click();
        """)
        page.wait_for_timeout(500)

        page.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            const i = btns.find(b => b.textContent.includes('Winner Group I'));
            if(i) i.click();
        """)
        page.wait_for_timeout(500)

        # Click them again in round 2
        page.evaluate("""
            const btns = Array.from(document.querySelectorAll('button'));
            // Find the 3rd button with text 'Winner Group E' (first two are in Round 1)
            const e2 = btns.filter(b => b.textContent.includes('Winner Group E'))[2];
            if(e2) e2.click();
            // Alternatively, just click the first one that appears in round 2
            const e1 = btns.find(b => b.textContent === 'Winner Group E');
            if(e1) e1.click();
        """)
        page.wait_for_timeout(500)
    except Exception as e:
         print("Could not click teams:", e)

    page.screenshot(path="verification/screenshots/verification_interactive.png", full_page=True)

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
