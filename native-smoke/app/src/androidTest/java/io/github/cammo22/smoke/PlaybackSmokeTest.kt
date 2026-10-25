package io.github.cammo22.smoke

import android.content.ComponentName
import android.content.Intent
import android.os.SystemClock
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.ViewFlipper
import androidx.lifecycle.Lifecycle
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.util.concurrent.ListenableFuture
import io.github.cammo22.music.PlaybackService
import io.github.cammo22.music.PlaybackWidget
import io.github.cammo22.music.R
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@UnstableApi
@RunWith(AndroidJUnit4::class)
class PlaybackSmokeTest {
 private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
 private fun onMain(block: () -> Unit) = instrumentation.runOnMainSync(block)
 private fun await(message: String, timeout: Long = 10000, condition: () -> Boolean) {
  val deadline = SystemClock.elapsedRealtime() + timeout
  var done = false
  while (!done && SystemClock.elapsedRealtime() < deadline) {
   onMain { done = condition() }
   if (!done) Thread.sleep(50)
  }
  assertTrue(message, done)
 }

 @Test fun all47SongsDecodeSeekAndKeepTheirSessionInBackground() {
  val context = instrumentation.targetContext
  context.getSharedPreferences("dap-playback", 0).edit().clear().commit()
  ActivityScenario.launch(SmokeActivity::class.java).use { screen ->
   screen.onActivity { it.startService(Intent(it, PlaybackService::class.java)) }
   await("Service did not start") { PlaybackService.instance != null }
   val service = PlaybackService.instance!!
   val failure = AtomicReference<String?>(null)
   onMain {
    service.player.addListener(object : Player.Listener {
     override fun onPlayerError(error: PlaybackException) { failure.set(error.stackTraceToString()) }
    })
   }
   val data = JSONObject(context.assets.open("samples.json").bufferedReader().use { it.readText() })
   val tracks = data.getJSONArray("tracks")
   assertEquals("Full bundled catalog must be exercised", 47, tracks.length())
   onMain { assertEquals("Cold session must load a queue without opening an album", 47, service.player.mediaItemCount) }
   for (i in 0 until tracks.length()) {
    onMain { service.analysisEnabled = i % 2 == 0; service.setQueue(tracks, i) }
    await("Decoded playback never advanced for sample $i", 20000) { failure.get() != null || service.player.currentPosition >= 1500 }
    assertNull("Playback failed for sample $i: ${failure.get()}", failure.get())
    onMain { service.player.seekTo(4000) }
    await("Seek did not reach 4 seconds for sample $i") { service.player.currentPosition >= 3900 }
    onMain { service.player.pause(); assertFalse(service.player.playWhenReady); service.player.play() }
    await("Playback did not resume for sample $i") { service.player.isPlaying }
   }
   onMain { assertTrue("PCM analysis was never produced", service.features.optLong("sequence") > 0); service.setQueue(tracks, 0) }

   lateinit var future: ListenableFuture<MediaController>
   onMain { future = MediaController.Builder(context, SessionToken(context, ComponentName(context, PlaybackService::class.java))).buildAsync() }
   val controller = future.get(10, TimeUnit.SECONDS)
   try {
    await("System session did not expose the loaded queue") { controller.mediaItemCount == 47 && controller.currentMediaItemIndex == 0 }
    onMain {
     assertEquals(tracks.getJSONObject(0).getString("title"), controller.mediaMetadata.title.toString())
     assertNotNull("Notification must reopen the existing app", controller.sessionActivity)
     assertTrue(controller.isCommandAvailable(Player.COMMAND_PLAY_PAUSE))
     assertTrue(controller.isCommandAvailable(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM))
     assertTrue(controller.isCommandAvailable(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM))
    }
    await("Initial session track did not start") { service.player.isPlaying }
    // Apply the real RemoteViews through Android, catching unsupported remote
    // methods and resource failures before a user adds this to their launcher.
    lateinit var frames: ViewFlipper
    screen.onActivity { activity ->
     val host = FrameLayout(activity)
     activity.setContentView(host)
     val widget = PlaybackWidget.buildViews(activity).apply(activity, host)
     host.addView(widget)
     val cover = widget.findViewById<android.widget.ImageView>(R.id.widget_cover).drawable
     assertTrue("Widget should show the embedded track cover", cover is android.graphics.drawable.BitmapDrawable)
     assertEquals("Widget cover was not decoded at display resolution", 192, (cover as android.graphics.drawable.BitmapDrawable).bitmap.width)
     val density = activity.resources.displayMetrics.density
     widget.measure(android.view.View.MeasureSpec.makeMeasureSpec((264 * density).toInt(), android.view.View.MeasureSpec.EXACTLY), android.view.View.MeasureSpec.makeMeasureSpec((128 * density).toInt(), android.view.View.MeasureSpec.EXACTLY))
     widget.layout(0, 0, widget.measuredWidth, widget.measuredHeight)
     for (id in listOf(R.id.widget_prev, R.id.widget_play, R.id.widget_next)) {
      val control = widget.findViewById<android.view.View>(id)
      assertTrue("Widget transport icon is clipped at minimum width", control.width - control.paddingLeft - control.paddingRight >= 18 * density)
     }
     val coverView = widget.findViewById<android.view.View>(R.id.widget_cover)
     assertTrue("Widget cover is clipped vertically", (coverView.parent as android.view.View).height <= widget.height - widget.paddingTop - widget.paddingBottom)
     frames = widget.findViewById(R.id.widget_frames)
     assertEquals("Playing widget must contain its complete animation", 24, frames.childCount)
     assertEquals(tracks.getJSONObject(0).getString("title"), widget.findViewById<TextView>(R.id.widget_title).text.toString())
     assertEquals("Pausa", widget.findViewById<android.view.View>(R.id.widget_play).contentDescription.toString())
    }
    await("Launcher animation did not start") { frames.isFlipping && frames.displayedChild > 0 }
    screen.moveToState(Lifecycle.State.CREATED)
    var before = 0L
    onMain { before = service.player.currentPosition }
    Thread.sleep(2000)
    onMain { assertTrue("Audio stopped when Activity left foreground", service.player.currentPosition - before > 1000) }

    onMain { controller.pause() }
    await("System pause did not reach background playback") { !service.player.playWhenReady }
    onMain { controller.seekTo(12000) }
    await("System seek did not reach background playback") { service.player.currentPosition in 11900..12500 }
    onMain { controller.seekToNextMediaItem() }
    await("System next did not reach background playback") { service.player.currentMediaItemIndex == 1 }
    onMain { controller.play() }
    await("System play did not resume background playback") { service.player.isPlaying }

    fun widget(command: String) { context.sendBroadcast(Intent(context, PlaybackWidget::class.java).setAction(PlaybackWidget.CONTROL).putExtra("command", command)) }
    widget("toggle")
    await("Widget pause did not reach background playback") { !service.player.playWhenReady }
    onMain {
     val paused = PlaybackWidget.buildViews(context).apply(context, FrameLayout(context))
     val still = paused.findViewById<ViewFlipper>(R.id.widget_frames)
     assertEquals("Paused widget should retain a still frame", 1, still.childCount)
     assertFalse("Paused widget must not run an animation timer", still.isFlipping)
     assertFalse("Paused widget must not auto-start on the launcher", still.isAutoStart)
     assertEquals("Riproduci", paused.findViewById<android.view.View>(R.id.widget_play).contentDescription.toString())
    }
    widget("next")
    await("Widget next did not reach background playback") { service.player.currentMediaItemIndex == 2 }
    widget("prev")
    await("Widget previous did not reach background playback") { service.player.currentMediaItemIndex == 1 }
    widget("toggle")
    await("Widget play did not resume background playback") { service.player.isPlaying }
    screen.moveToState(Lifecycle.State.RESUMED)
    onMain { assertEquals("Reopening must preserve the native queue", 1, service.player.currentMediaItemIndex); service.player.pause() }
    assertNull("Playback error: ${failure.get()}", failure.get())
   } finally {
    onMain { controller.release(); service.player.pause() }
   }
   context.stopService(Intent(context, PlaybackService::class.java))
   await("Playback service did not stop after releasing the session") { PlaybackService.instance == null }
   onMain {
    val restored = PlaybackWidget.buildViews(context).apply(context, FrameLayout(context))
    assertEquals("Cold widget lost the last song title", tracks.getJSONObject(1).getString("title"), restored.findViewById<TextView>(R.id.widget_title).text.toString())
    val restoredCover = restored.findViewById<android.widget.ImageView>(R.id.widget_cover).drawable
    assertTrue("Cold widget lost the embedded cover", restoredCover is android.graphics.drawable.BitmapDrawable)
   }
  }
 }
}
