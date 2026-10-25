package io.github.cammo22.music

import android.webkit.WebView

/** Let web buttons/canvases own holds while retaining native editing in inputs. */
object WebViewGestures {
 fun configure(view: WebView) {
  view.setOnLongClickListener { view.hitTestResult.type != WebView.HitTestResult.EDIT_TEXT_TYPE }
 }
}
