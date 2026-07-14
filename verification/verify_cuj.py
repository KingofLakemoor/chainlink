from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)

    # In DEV mode (without api key), AdvancedMetricsPage renders mock data if premium is true.
    # We will trigger the mock state using window dispatch Event.

    page.evaluate('''() => {
        const profileData = {
          uid: 'mock-user-123',
          email: 'mock@example.com',
          displayName: 'Mock User',
          username: 'MockUser123',
          image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock-user-123',
          links: 10,
          role: 'ADMIN', // Make mock user an ADMIN for testing locally
          status: 'ACTIVE',
          stats: { wins: 0, losses: 0, pushes: 0 },
          referralsCount: 42,
          premium: true, // Need premium to see Advanced Metrics
          statsByLeague: {
            NBA: { wins: 10, losses: 5, pushes: 0 }
          }
        };
        window.dispatchEvent(new CustomEvent('mock-login', {
            detail: profileData
        }));
    }''')
    page.wait_for_timeout(2000)

    # Go to My Picks -> Advanced Metrics or directly to URL
    page.goto("http://localhost:3000/advanced-metrics")
    page.wait_for_timeout(4000)

    page.screenshot(path="/app/verification/screenshots/before_click.png")

    page.wait_for_selector("button:has-text('Team Insights')", timeout=10000)
    page.get_by_role("button", name="Team Insights").click()
    page.wait_for_timeout(2000)

    # Screenshot after click to see what is rendered
    page.screenshot(path="/app/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/app/verification/videos",
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
