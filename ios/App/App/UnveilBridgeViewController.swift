import UIKit
import WebKit
import Capacitor

/// UNVEIL native recovery shell.
///
/// Problem: iOS terminates the WKWebView WebContent process when the app is
/// backgrounded under memory pressure. The native shell stays alive, the
/// snapshot is discarded, and the user sees a blank/black screen on return.
/// A dead webview frequently KEEPS its previous `url`, so `url == nil` is not
/// a usable health check.
///
/// Strategy (all on the main thread, only on `didBecomeActive`):
///   1. Record `webViewWebContentProcessDidTerminate` natively (hard signal).
///   2. On foreground, evaluate a lightweight JS health probe with a timeout.
///   3. Reload ONLY when the probe fails or termination was recorded.
///   4. Rate-limit + attempt-cap so a broken page can never loop.
///   5. Skip entirely while a modal/OAuth/payment/camera flow is presented or
///      while the webview is mid-navigation, and skip for non-app URLs
///      (Stripe / Supabase / RevenueCat redirects).
///
/// This controller does NOT take over Capacitor's navigation delegate: the
/// original delegate is retained and every callback is forwarded to it.
final class UnveilBridgeViewController: CAPBridgeViewController, WKNavigationDelegate {

    private enum Log {
        static func event(_ name: String, _ detail: String = "") {
            NSLog("[UNVEIL-RECOVERY] %@%@", name, detail.isEmpty ? "" : " :: \(detail)")
        }
    }

    /// Set by the WKNavigationDelegate termination callback. Cleared only once
    /// a first-party page has loaded AND passed the JS health probe.
    private var webContentProcessTerminated = false
    private var isNavigating = false
    private var recoveryInFlight = false
    private var recoveryAttempts = 0
    private var lastRecoveryAt: Date?
    private var observerRegistered = false

    /// Capacitor's own navigation delegate — preserved and forwarded to.
    private weak var capacitorNavigationDelegate: WKNavigationDelegate?

    private let maxRecoveryAttempts = 3
    private let minSecondsBetweenRecoveries: TimeInterval = 10
    private let probeTimeout: TimeInterval = 2.0
    /// A slow-but-healthy page must not be judged blank on a single timeout.
    private let slowProbeTimeout: TimeInterval = 6.0

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        if let existing = webView?.navigationDelegate, !(existing === self) {
            capacitorNavigationDelegate = existing
        }
        webView?.navigationDelegate = self

        if !observerRegistered {
            observerRegistered = true
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(appDidBecomeActive),
                name: UIApplication.didBecomeActiveNotification,
                object: nil
            )
        }
        Log.event("controller_loaded", "url=\(describeURL(webView?.url))")
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
    }

    deinit {
        NotificationCenter.default.removeObserver(self, name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    // MARK: - Foreground check

    @objc private func appDidBecomeActive() {
        DispatchQueue.main.async { [weak self] in
            self?.evaluateHealthAndRecoverIfNeeded()
        }
    }

    private func evaluateHealthAndRecoverIfNeeded() {
        guard let webView = self.webView else {
            Log.event("app_became_active", "webview=nil")
            return
        }

        Log.event(
            "app_became_active",
            "url=\(describeURL(webView.url)) loading=\(webView.isLoading) terminated=\(webContentProcessTerminated) navigating=\(isNavigating)"
        )

        if recoveryInFlight {
            Log.event("recovery_skipped", "reason=already_in_flight")
            return
        }
        if presentedViewController != nil {
            // OAuth sheet, Apple Pay, camera picker, share sheet, etc.
            Log.event("recovery_skipped", "reason=modal_presented")
            return
        }
        if webView.isLoading || isNavigating {
            Log.event("recovery_skipped", "reason=navigation_in_progress")
            return
        }
        if let attempts = lastRecoveryAt, Date().timeIntervalSince(attempts) < minSecondsBetweenRecoveries {
            Log.event("recovery_skipped", "reason=rate_limited")
            return
        }
        if recoveryAttempts >= maxRecoveryAttempts {
            Log.event("recovery_skipped", "reason=attempt_cap_reached attempts=\(recoveryAttempts)")
            return
        }
        if !isOwnedURL(webView.url) {
            // Mid-flow on a third-party origin (Stripe, Supabase, RevenueCat).
            Log.event("recovery_skipped", "reason=third_party_url url=\(describeURL(webView.url))")
            return
        }

        if webContentProcessTerminated {
            Log.event("health_check", "result=terminated_flag")
            performRecovery(reason: "webcontent_terminated")
            return
        }

        probeWebViewHealth { [weak self] healthy in
            guard let self else { return }
            if healthy {
                Log.event("recovery_skipped", "reason=webview_healthy")
                self.recoveryAttempts = 0
            } else {
                Log.event("health_check", "result=probe_failed")
                self.performRecovery(reason: "probe_failed")
            }
        }
    }

    /// Lightweight JS probe, executed ONLY against the first-party origin.
    /// A live JS context with a rendered body answers. A timeout is retried
    /// once with a longer budget so a slow page is never called blank.
    private func probeWebViewHealth(_ completion: @escaping (Bool) -> Void) {
        guard let webView = self.webView, isOwnedURL(webView.url) else {
            Log.event("probe_skipped", "reason=not_first_party")
            return completion(true)
        }
        runProbe(on: webView, timeout: probeTimeout) { [weak self] result in
            guard let self else { return }
            switch result {
            case .healthy:
                completion(true)
            case .unhealthy:
                completion(false)
            case .timedOut:
                Log.event("probe_retry", "timeout=\(self.slowProbeTimeout)")
                self.runProbe(on: webView, timeout: self.slowProbeTimeout) { retry in
                    completion(retry == .healthy)
                }
            }
        }
    }

    private enum ProbeResult { case healthy, unhealthy, timedOut }

    private func runProbe(on webView: WKWebView, timeout: TimeInterval, _ completion: @escaping (ProbeResult) -> Void) {
        var settled = false
        let finish: (ProbeResult) -> Void = { result in
            guard !settled else { return }
            settled = true
            completion(result)
        }

        let js = "(function(){try{return document.readyState==='complete'||document.readyState==='interactive' ? (document.body && document.body.childElementCount > 0 ? 'ok' : 'empty') : 'loading';}catch(e){return 'error';}})()"

        webView.evaluateJavaScript(js) { result, error in
            DispatchQueue.main.async {
                if let error {
                    Log.event("probe_result", "error=\(error.localizedDescription)")
                    finish(.unhealthy)
                    return
                }
                let value = (result as? String) ?? "unknown"
                Log.event("probe_result", "value=\(value)")
                finish(value == "ok" || value == "loading" ? .healthy : .unhealthy)
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + timeout) {
            if !settled {
                Log.event("probe_result", "value=timeout")
                finish(.timedOut)
            }
        }
    }

    // MARK: - Recovery

    private func performRecovery(reason: String) {
        guard let webView = self.webView else { return }
        recoveryInFlight = true
        recoveryAttempts += 1
        lastRecoveryAt = Date()
        Log.event("recovery_attempted", "reason=\(reason) attempt=\(recoveryAttempts)")

        // A terminated WebContent process cannot be revived by reload();
        // it needs a fresh load request. The termination flag is intentionally
        // NOT cleared here — it clears only after a verified healthy load.
        if webContentProcessTerminated {
            let target = isOwnedURL(webView.url) ? (webView.url ?? serverURL()) : serverURL()
            if let target {
                Log.event("recovery_load", "url=\(target.absoluteString)")
                webView.load(URLRequest(url: target))
            } else {
                Log.event("recovery_failed", "reason=no_target_url")
                recoveryInFlight = false
            }
        } else {
            Log.event("recovery_load", "mode=reload url=\(describeURL(webView.url))")
            webView.reload()
        }
    }

    private func serverURL() -> URL? {
        if let configured = bridge?.config.serverURL { return configured }
        return URL(string: "https://unveil.best")
    }

    private func isOwnedURL(_ url: URL?) -> Bool {
        guard let host = url?.host?.lowercased() else { return true } // about:blank / nil → ours to fix
        return host == "unveil.best" || host.hasSuffix(".unveil.best") || host == "localhost"
    }

    private func describeURL(_ url: URL?) -> String {
        url?.absoluteString ?? "nil"
    }

    // MARK: - WKNavigationDelegate (observe, then forward to Capacitor)

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webContentProcessTerminated = true
        Log.event("webcontent_terminated", "url=\(describeURL(webView.url))")
        capacitorNavigationDelegate?.webViewWebContentProcessDidTerminate?(webView)
        // Only self-heal immediately if we are foreground; otherwise wait for
        // didBecomeActive so we never load off-screen in the background.
        if UIApplication.shared.applicationState == .active {
            DispatchQueue.main.async { [weak self] in
                self?.evaluateHealthAndRecoverIfNeeded()
            }
        }
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isNavigating = true
        Log.event("navigation_started", "url=\(describeURL(webView.url))")
        capacitorNavigationDelegate?.webView?(webView, didStartProvisionalNavigation: navigation)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isNavigating = false
        Log.event("navigation_completed", "url=\(describeURL(webView.url))")
        capacitorNavigationDelegate?.webView?(webView, didFinish: navigation)

        let firstParty = isOwnedURL(webView.url)
        guard firstParty else {
            if recoveryInFlight { recoveryInFlight = false }
            return
        }

        // Confirm with the health probe before declaring recovery a success:
        // only then reset the attempt counter and clear the termination flag.
        probeWebViewHealth { [weak self] healthy in
            guard let self else { return }
            if healthy {
                self.webContentProcessTerminated = false
                self.recoveryAttempts = 0
                if self.recoveryInFlight {
                    self.recoveryInFlight = false
                    Log.event("recovery_succeeded", "url=\(self.describeURL(webView.url))")
                }
            } else if self.recoveryInFlight {
                self.recoveryInFlight = false
                Log.event("recovery_failed", "reason=probe_failed_after_load")
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isNavigating = false
        Log.event("navigation_failed", "error=\(error.localizedDescription)")
        capacitorNavigationDelegate?.webView?(webView, didFail: navigation, withError: error)
        if recoveryInFlight {
            recoveryInFlight = false
            Log.event("recovery_failed", "error=\(error.localizedDescription)")
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isNavigating = false
        Log.event("navigation_failed", "phase=provisional error=\(error.localizedDescription)")
        capacitorNavigationDelegate?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
        if recoveryInFlight {
            recoveryInFlight = false
            Log.event("recovery_failed", "error=\(error.localizedDescription)")
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        // Capacitor owns navigation policy (app-bound / external link handling).
        let selector = NSSelectorFromString("webView:decidePolicyForNavigationAction:decisionHandler:")
        if let delegate = capacitorNavigationDelegate, delegate.responds(to: selector) {
            delegate.webView?(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler)
            return
        }
        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        let selector = NSSelectorFromString("webView:decidePolicyForNavigationResponse:decisionHandler:")
        if let delegate = capacitorNavigationDelegate, delegate.responds(to: selector) {
            delegate.webView?(webView, decidePolicyFor: navigationResponse, decisionHandler: decisionHandler)
            return
        }
        decisionHandler(.allow)
    }
}
