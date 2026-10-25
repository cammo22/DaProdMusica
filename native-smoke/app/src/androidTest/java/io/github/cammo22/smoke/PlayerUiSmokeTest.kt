package io.github.cammo22.smoke

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.SystemClock
import android.util.Base64
import android.view.InputDevice
import android.view.MotionEvent
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.cammo22.music.BackNavigation
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Regressions against the built index.html/main.js/CSS in Android's own WebView.
 * Touches enter WebView as physical finger MotionEvents, not synthetic JS events.
 * This catches hit-testing, pointer capture, UA touch cancellation and modal focus.
 */
@RunWith(AndroidJUnit4::class)
class PlayerUiSmokeTest {
 private fun js(screen: ActivityScenario<PlayerSmokeActivity>, expression: String): String {
  val done = CountDownLatch(1)
  val result = AtomicReference<String>()
  screen.onActivity { activity ->
   activity.playerView.evaluateJavascript("(()=>{try{return ($expression)}catch(e){return {testError:String(e)}}})()") {
    result.set(it); done.countDown()
   }
  }
  assertTrue("WebView JavaScript did not complete: $expression", done.await(10, TimeUnit.SECONDS))
  val value = result.get()
  assertFalse("JavaScript threw: $value", value.contains("\"testError\""))
  return value
 }

 private fun await(screen: ActivityScenario<PlayerSmokeActivity>, message: String, expression: String, timeout: Long = 15000) {
  val deadline = SystemClock.elapsedRealtime() + timeout
  do {
   if (js(screen, expression) == "true") return
   Thread.sleep(60)
  } while (SystemClock.elapsedRealtime() < deadline)
  var console = ""
  screen.onActivity { console = it.console.joinToString("\n") }
  fail("$message\nDOM: ${js(screen, "document.body.innerText.slice(-1800)")}\nConsole: $console")
 }

 private fun capture(screen: ActivityScenario<PlayerSmokeActivity>, name: String) {
  val done = CountDownLatch(1)
  val result = java.util.concurrent.atomic.AtomicInteger(-1)
  lateinit var bitmap: Bitmap
  screen.onActivity { activity ->
   val view = activity.window.decorView
   bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
   android.view.PixelCopy.request(activity.window, bitmap, { result.set(it); done.countDown() }, android.os.Handler(android.os.Looper.getMainLooper()))
  }
  assertTrue("Capture did not complete", done.await(10, TimeUnit.SECONDS))
  assertEquals(android.view.PixelCopy.SUCCESS, result.get())
  val context = InstrumentationRegistry.getInstrumentation().targetContext
  val folder = File(context.getExternalFilesDir(null), "ui-captures").apply { mkdirs() }
  try { File(folder, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) } }
  finally { bitmap.recycle() }
 }

 private fun ready(screen: ActivityScenario<PlayerSmokeActivity>) {
  await(screen, "Production player did not load its full catalog",
   "document.querySelectorAll('[data-accessible]').length===47 && !!document.querySelector('#mini-open')")
 }

 private fun point(screen: ActivityScenario<PlayerSmokeActivity>, selector: String, yFraction: Double = .5): Pair<Float, Float> {
  val quoted = JSONObject.quote(selector)
  val coordinates = JSONArray(js(screen, "(()=>{const e=document.querySelector($quoted),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height*$yFraction;return [x,y,innerWidth,!!document.elementFromPoint(x,y)?.closest($quoted)]})()"))
  assertTrue("$selector is obscured or outside the viewport", coordinates.getBoolean(3))
  var width = 0
  screen.onActivity { width = it.playerView.width }
  val scale = width / coordinates.getDouble(2)
  return Pair((coordinates.getDouble(0) * scale).toFloat(), (coordinates.getDouble(1) * scale).toFloat())
 }

 private fun touch(screen: ActivityScenario<PlayerSmokeActivity>, action: Int, point: Pair<Float, Float>, down: Long) {
  screen.onActivity {
   val properties = MotionEvent.PointerProperties().apply { id = 0; toolType = MotionEvent.TOOL_TYPE_FINGER }
   val coordinates = MotionEvent.PointerCoords().apply { x = point.first; y = point.second; pressure = 1f; size = 1f }
   val event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, 1, arrayOf(properties), arrayOf(coordinates), 0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0)
   try { assertTrue("WebView rejected touch action $action", it.playerView.dispatchTouchEvent(event)) }
   finally { event.recycle() }
  }
 }

 private fun tap(screen: ActivityScenario<PlayerSmokeActivity>, selector: String) {
  val p = point(screen, selector)
  val down = SystemClock.uptimeMillis()
  touch(screen, MotionEvent.ACTION_DOWN, p, down)
  Thread.sleep(60)
  touch(screen, MotionEvent.ACTION_UP, p, down)
 }

 private fun openPlayer(screen: ActivityScenario<PlayerSmokeActivity>) {
  ready(screen)
  tap(screen, "#mini-open")
  await(screen, "Mini player did not expand", "document.body.classList.contains('expanded') && !document.querySelector('#expanded-player').hidden")
  Thread.sleep(400) // Let the production sheet transition settle before hit testing.
 }

 private fun holdEffects(screen: ActivityScenario<PlayerSmokeActivity>, yFraction: Double = .5) {
  val p = point(screen, "#effect", yFraction)
  val down = SystemClock.uptimeMillis()
  touch(screen, MotionEvent.ACTION_DOWN, p, down)
  try {
   await(screen, "Holding the physical Effetti control did not open the modal", "document.querySelector('#effects-dialog').open", 5000)
  } finally { touch(screen, MotionEvent.ACTION_UP, p, down) }
  Thread.sleep(350)
  assertEquals("Releasing a held finger closed the effect menu", "true", js(screen, "document.querySelector('#effects-dialog').open"))
 }

 @Test fun heldEffectButtonOpensATouchableModalAndReleaseDoesNotSelectACard() {
  ActivityScenario.launch(PlayerSmokeActivity::class.java).use { screen ->
   openPlayer(screen)
   holdEffects(screen, .3) // Touch the actual SVG child, not only the button label.
   await(screen, "Visible effect cards did not load", "Array.from(document.querySelectorAll('[data-preview]')).slice(0,2).every(e=>e.complete&&e.naturalWidth>=96)")
   capture(screen, "effects")
   assertEquals("All production effects must be selectable", "22", js(screen, "document.querySelectorAll('#effect-grid [data-effect]').length"))
   assertEquals("A hold must not silently turn on shuffle", "false", js(screen, "document.querySelector('#effects-shuffle').checked"))
   val selected = js(screen, "document.querySelector('#effect-grid [aria-pressed=true]')?.dataset.effect")
   point(screen, "#effects-shuffle")
   tap(screen, "#effects-shuffle")
   await(screen, "Shuffle did not respond to a finger tap inside the modal", "document.querySelector('#effects-shuffle').checked")
   assertEquals("true", js(screen, "JSON.parse(localStorage.getItem('dap-effect-shuffle'))"))
   tap(screen, "#effects-lock")
   await(screen, "Lock and shuffle must be mutually exclusive", "document.querySelector('#effects-lock').checked && !document.querySelector('#effects-shuffle').checked")
   tap(screen, "#effects-shuffle")
   await(screen, "Shuffle must release the effect lock", "!document.querySelector('#effects-lock').checked && document.querySelector('#effects-shuffle').checked")
   screen.onActivity { BackNavigation.dispatch(it.playerView) }
   await(screen, "Native back did not close just the modal", "!document.querySelector('#effects-dialog').open && document.body.classList.contains('expanded')")
   holdEffects(screen, .75) // Long-press the text child on a second invocation.
   assertEquals("Opening the menu changed the selected effect", selected, js(screen, "document.querySelector('#effect-grid [aria-pressed=true]')?.dataset.effect"))
   assertEquals("Shuffle setting was lost when reopening the menu", "true", js(screen, "document.querySelector('#effects-shuffle').checked"))
   val other = js(screen, "document.querySelector('#effect-grid [data-effect]:not([aria-pressed=true])')?.dataset.effect")
   val id = JSONArray("[$other]").getString(0)
   js(screen, "(()=>{document.querySelector('[data-effect=\"$id\"]').scrollIntoView({block:'center'});return true})()")
   tap(screen, "#effect-grid [data-effect=\"$id\"]")
   await(screen, "Choosing a real effect card did not close the menu", "!document.querySelector('#effects-dialog').open")
   holdEffects(screen)
   assertEquals("The tapped effect was not selected", other, js(screen, "document.querySelector('#effect-grid [aria-pressed=true]')?.dataset.effect"))
  }
 }

 @Test fun directEffectsEntryAndAll22RealThumbnailsWorkInAndroidWebView() {
  ActivityScenario.launch(PlayerSmokeActivity::class.java).use { screen ->
   openPlayer(screen)
   tap(screen, "#effects-open")
   await(screen, "Direct effects entry did not open the modal", "document.querySelector('#effects-dialog').open && document.querySelectorAll('[data-preview]').length===22")
   val ids = JSONArray(js(screen, "Array.from(document.querySelectorAll('[data-preview]'),e=>e.dataset.preview)"))
   val context = InstrumentationRegistry.getInstrumentation().targetContext
   val output = File(context.getExternalFilesDir(null), "effect-previews").apply { mkdirs() }
   for (i in 0 until ids.length()) {
    val id = ids.getString(i)
    val selector = JSONObject.quote("[data-preview=\"$id\"]")
    js(screen, "(()=>{document.querySelector($selector).scrollIntoView({block:'center'});return true})()")
    await(screen, "Effect $id has no real thumbnail", "(()=>{const e=document.querySelector($selector);return e.complete&&e.naturalWidth>=96&&e.naturalHeight>=96})()", 20000)
    val src = JSONArray("[${js(screen, "document.querySelector($selector).src")}]").getString(0)
    if (src.startsWith("data:image/")) {
     val bytes = Base64.decode(src.substringAfter(','), Base64.DEFAULT)
     val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
     assertNotNull("Invalid rendered thumbnail for $id", bitmap)
     try { File(output, "$id.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) } }
     finally { bitmap.recycle() }
    }
   }
   assertEquals("Rendering previews changed the selected effect count", "1", js(screen, "document.querySelectorAll('#effect-grid [aria-pressed=true]').length"))
  }
 }

 @Test fun settingsDismissOnBackdropAndPlayerFollowsFingerToTheBottom() {
  ActivityScenario.launch(PlayerSmokeActivity::class.java).use { screen ->
   ready(screen)
   tap(screen, "#settings")
   await(screen, "Settings did not open", "document.querySelector('#preferences').open")
   capture(screen, "settings")
   assertEquals("Obsolete volume/intensity controls are still present", "false", js(screen, "!!document.querySelector('#volume,#intensity')"))
   assertEquals("Unexpected movement choices", "[\"Fluido\",\"Risparmio energia\",\"Off\"]", js(screen, "Array.from(document.querySelector('#motion').options,o=>o.text)"))
   val down = SystemClock.uptimeMillis()
   val outside = Pair(3f, 3f)
   touch(screen, MotionEvent.ACTION_DOWN, outside, down)
   touch(screen, MotionEvent.ACTION_UP, outside, down)
   await(screen, "A backdrop tap did not close Settings", "!document.querySelector('#preferences').open")
   openPlayer(screen)
   val start = point(screen, "#player-drag-zone", .65)
   val height = js(screen, "innerHeight").toDouble()
   var physicalWidth = 0
   screen.onActivity { physicalWidth = it.playerView.width }
   val scale = physicalWidth / js(screen, "innerWidth").toDouble()
   val startTime = SystemClock.uptimeMillis()
   touch(screen, MotionEvent.ACTION_DOWN, start, startTime)
   for (i in 1..4) {
    touch(screen, MotionEvent.ACTION_MOVE, Pair(start.first, start.second + (height * .1 * i * scale).toFloat()), startTime)
    Thread.sleep(35)
   }
   val displacement = js(screen, "new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#expanded-player')).transform).m42").toDouble()
   assertTrue("Player does not follow the finger: $displacement", displacement > height * .36 && displacement < height * .44)
   capture(screen, "player-drag")
   assertEquals("Player collapsed before the finger was released", "true", js(screen, "document.body.classList.contains('expanded')"))
   val stage = js(screen, "new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#effect-stage')).transform).m42").toDouble()
   assertEquals("Effects and controls must move together", displacement, stage, 2.0)
   touch(screen, MotionEvent.ACTION_UP, Pair(start.first, start.second + (height * .4 * scale).toFloat()), startTime)
   await(screen, "Dragged player did not settle into the mini player", "!document.body.classList.contains('expanded') && document.querySelector('#expanded-player').hidden")
   Thread.sleep(450)
   openPlayer(screen)
   screen.onActivity { BackNavigation.dispatch(it.playerView) }
   await(screen, "Android Back did not collapse the player", "!document.body.classList.contains('expanded')")
  }
 }
}
