package io.github.cammo22.smoke

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.concurrent.CountDownLatch

class SmokeActivity : Activity() {
 lateinit var backView: WebView
 val pageReady = CountDownLatch(1)

 override fun onCreate(state: Bundle?) {
  super.onCreate(state)
  backView = WebView(this)
  backView.settings.javaScriptEnabled = true
  backView.webViewClient = object : WebViewClient() {
   override fun onPageFinished(view: WebView, url: String) { pageReady.countDown() }
  }
  setContentView(backView)
  backView.loadData("<!doctype html><title>DaProd native smoke</title>", "text/html", "UTF-8")
 }

 override fun onDestroy() { backView.destroy(); super.onDestroy() }
}
