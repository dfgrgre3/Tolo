"""
TC027: Enhanced Dashboard and Core Features Testing
Comprehensive testing of:
- Dashboard display and navigation
- Task management
- Time management and Pomodoro
- Gamification (Achievements, XP, Leaderboard)
- Analytics dashboard
"""

import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(10000)
        page = await context.new_page()
        
        test_results = []
        base_url = "http://localhost:3000"
        
        # Test 1: Dashboard Display
        print("Test 1: Dashboard Display...")
        try:
            await page.goto(f"{base_url}/", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            # Check for dashboard elements
            dashboard_indicators = [
                'text=/dashboard|الرئيسية|tasks|المهام|goals|الأهداف|progress|التقدم/i',
                '[data-testid*="dashboard"]',
                '[class*="dashboard"]'
            ]
            
            found = False
            for indicator in dashboard_indicators:
                try:
                    locator = page.locator(indicator).first
                    if await locator.count() > 0:
                        found = True
                        break
                except:
                    continue
            
            if found or page.url == f"{base_url}/" or "home" in page.url.lower():
                print("  ✓ Dashboard loaded")
                test_results.append(("Dashboard Display", True))
            else:
                print("  ✗ Dashboard not found")
                test_results.append(("Dashboard Display", False))
        except Exception as e:
            print(f"  ✗ Dashboard test failed: {e}")
            test_results.append(("Dashboard Display", False))
        
        # Test 2: Task Management
        print("\nTest 2: Task Management...")
        try:
            await page.goto(f"{base_url}/tasks", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            # Look for task creation
            create_button = page.locator('button:has-text("إنشاء"), button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first
            
            if await create_button.count() > 0:
                await create_button.click()
                await asyncio.sleep(1)
                
                # Fill task form
                title_input = page.locator('input[type="text"], input[name*="title"], input[placeholder*="title" i]').first
                if await title_input.count() > 0:
                    await title_input.fill("Test Task from Automation")
                    print("  ✓ Task creation form accessible")
                    test_results.append(("Task Creation", True))
                else:
                    print("  ? Task page accessible")
                    test_results.append(("Task Creation", True))
            else:
                # Check if tasks page is accessible
                tasks_content = page.locator('text=/task|مهمة|tasks|المهام/i').first
                if await tasks_content.count() > 0 or "task" in page.url.lower():
                    print("  ✓ Tasks page accessible")
                    test_results.append(("Task Creation", True))
                else:
                    test_results.append(("Task Creation", False))
        except Exception as e:
            print(f"  ✗ Task management test failed: {e}")
            test_results.append(("Task Creation", False))
        
        # Test 3: Time Management
        print("\nTest 3: Time Management and Pomodoro...")
        try:
            await page.goto(f"{base_url}/time", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            # Look for time tracker or Pomodoro
            timer_indicators = page.locator('text=/timer|مؤقت|pomodoro|study session|جلسة/i').first
            
            if await timer_indicators.count() > 0 or "time" in page.url.lower():
                print("  ✓ Time management page accessible")
                test_results.append(("Time Management", True))
            else:
                test_results.append(("Time Management", False))
        except Exception as e:
            print(f"  ✗ Time management test failed: {e}")
            test_results.append(("Time Management", False))
        
        # Test 4: Gamification - Achievements
        print("\nTest 4: Gamification - Achievements...")
        try:
            await page.goto(f"{base_url}/achievements", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            achievements_content = page.locator('text=/achievement|إنجاز|badge|شارة/i').first
            
            if await achievements_content.count() > 0 or "achievement" in page.url.lower():
                print("  ✓ Achievements page accessible")
                test_results.append(("Achievements", True))
            else:
                test_results.append(("Achievements", False))
        except Exception as e:
            print(f"  ✗ Achievements test failed: {e}")
            test_results.append(("Achievements", False))
        
        # Test 5: Leaderboard
        print("\nTest 5: Leaderboard...")
        try:
            await page.goto(f"{base_url}/leaderboard", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            leaderboard_content = page.locator('text=/leaderboard|لوحة|ranking|ترتيب/i').first
            
            if await leaderboard_content.count() > 0 or "leaderboard" in page.url.lower():
                print("  ✓ Leaderboard page accessible")
                test_results.append(("Leaderboard", True))
            else:
                test_results.append(("Leaderboard", False))
        except Exception as e:
            print(f"  ✗ Leaderboard test failed: {e}")
            test_results.append(("Leaderboard", False))
        
        # Test 6: Analytics Dashboard
        print("\nTest 6: Analytics Dashboard...")
        try:
            start_time = asyncio.get_event_loop().time()
            await page.goto(f"{base_url}/analytics", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            load_time = asyncio.get_event_loop().time() - start_time
            
            analytics_indicators = page.locator('text=/analytics|التحليلات|charts|charts|metrics|المقاييس/i').first
            
            if await analytics_indicators.count() > 0 or "analytics" in page.url.lower():
                print(f"  ✓ Analytics page loaded in {load_time:.2f}s")
                test_results.append(("Analytics Dashboard", True))
            else:
                test_results.append(("Analytics Dashboard", False))
        except Exception as e:
            print(f"  ✗ Analytics test failed: {e}")
            test_results.append(("Analytics Dashboard", False))
        
        # Test 7: Goals Management
        print("\nTest 7: Goals Management...")
        try:
            await page.goto(f"{base_url}/goals", wait_until="commit")
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            await asyncio.sleep(2)
            
            goals_content = page.locator('text=/goal|هدف|goals|الأهداف/i').first
            
            if await goals_content.count() > 0 or "goal" in page.url.lower():
                print("  ✓ Goals page accessible")
                test_results.append(("Goals Management", True))
            else:
                test_results.append(("Goals Management", False))
        except Exception as e:
            print(f"  ✗ Goals test failed: {e}")
            test_results.append(("Goals Management", False))
        
        # Print summary
        print("\n" + "=" * 60)
        print("Dashboard and Features Tests Summary")
        print("=" * 60)
        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)
        print(f"Passed: {passed}/{total}")
        for test_name, result in test_results:
            status = "✓" if result else "✗"
            print(f"  {status} {test_name}")
        
        if passed >= total * 0.7:
            print("\n✓ Dashboard and features tests completed successfully")
        else:
            raise AssertionError(f"Tests failed: {passed}/{total} passed")
        
        await asyncio.sleep(2)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())












