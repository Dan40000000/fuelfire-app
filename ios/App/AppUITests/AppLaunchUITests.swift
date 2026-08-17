import XCTest

final class AppLaunchUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
    }

    func testAppLaunchesIntoCapacitorWebView() {
        app.launch()

        XCTAssertTrue(
            app.webViews.firstMatch.waitForExistence(timeout: 20),
            "Well Fit Pro did not present its Capacitor test-host web view."
        )
    }

    func testAppSurvivesBackgroundAndResume() {
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 20))

        XCUIDevice.shared.press(.home)
        app.activate()

        XCTAssertTrue(
            app.webViews.firstMatch.waitForExistence(timeout: 10),
            "The app did not restore its web view after returning from the background."
        )
    }
}
