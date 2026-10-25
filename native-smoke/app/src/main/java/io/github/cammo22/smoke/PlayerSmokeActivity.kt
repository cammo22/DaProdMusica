package io.github.cammo22.smoke

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.util.concurrent.CopyOnWriteArrayList

/** Real Vite player, served from APK assets over a secure same-origin URL.
 * No native bridge is faked: this suite exercises browser-mode production UI.
 * Native playback and system integration have their own PlaybackSmokeTest.
 */
class PlayerSmokeActivity : Activity() {
 lateinit var playerView: WebView
 val console = CopyOnWriteArrayList<String>()

 override fun onCreate(state: Bundle?) {
  super.onCreate(state)
  playerView = WebView(this)
  playerView.settings.javaScriptEnabled = true
  playerView.settings.domStorageEnabled = true
  playerView.settings.allowFileAccess = false
  playerView.webChromeClient = object : WebChromeClient() {
   override fun onConsoleMessage(message: ConsoleMessage): Boolean {
    console.add("${message.messageLevel()}: ${message.message()} (${message.sourceId()}:${message.lineNumber()})")
    return true
   }
  }
  playerView.webViewClient = object : WebViewClient() {
   private var bootstrapped = false
   override fun onPageFinished(view: WebView, url: String) {
    if (!bootstrapped) {
     bootstrapped = true
     view.evaluateJavascript("localStorage.clear()") {
      view.loadUrl("https://appassets.androidplatform.net/index.html")
     }
    }
   }
   override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
    val uri = request.url
    if (uri.scheme != "https" || uri.host != "appassets.androidplatform.net")
     return response("text/plain", 503, "External network disabled", ByteArrayInputStream(byteArrayOf()))
    val relative = Uri.decode(uri.path.orEmpty()).removePrefix("/")
    if (relative.split('/').any { it == ".." } || relative.isEmpty())
     return response("text/plain", 404, "Not found", ByteArrayInputStream(byteArrayOf()))
    val path = if (relative.startsWith("media/") || relative.startsWith("artwork/")) relative else "player/$relative"
    return try {
     response(mime(path), 200, "OK", assets.open(path))
    } catch (_: Exception) {
     response("text/plain", 404, "Not found", ByteArrayInputStream(byteArrayOf()))
    }
   }
  }
  setContentView(playerView)
  // Clear persistent UI preferences before each scenario without altering the
  // application bundle or injecting alternate controls/event handlers.
  playerView.loadDataWithBaseURL("https://appassets.androidplatform.net/", "<script>localStorage.clear()</script>", "text/html", "UTF-8", null)
 }

 private fun response(type: String, status: Int, reason: String, data: java.io.InputStream) =
  WebResourceResponse(type, "UTF-8", status, reason, mapOf("Cache-Control" to "no-store"), data)

 private fun mime(path: String) = when (path.substringAfterLast('.')) {
  "html" -> "text/html"
  "js", "mjs" -> "text/javascript"
  "css" -> "text/css"
  "json" -> "application/json"
  "svg" -> "image/svg+xml"
  "png" -> "image/png"
  "jpg", "jpeg" -> "image/jpeg"
  "webp" -> "image/webp"
  "mp3" -> "audio/mpeg"
  "wasm" -> "application/wasm"
  else -> "application/octet-stream"
 }

 override fun onDestroy() { playerView.destroy(); super.onDestroy() }
}
