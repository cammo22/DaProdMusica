package io.github.cammo22.music

import android.webkit.WebView

/** Kept separate so the Activity and integration tests exercise the same bridge. */
object BackNavigation {
 fun dispatch(webView:WebView?) {
  webView?.evaluateJavascript("window.dispatchEvent(new Event('dap-back'))", null)
 }
}
