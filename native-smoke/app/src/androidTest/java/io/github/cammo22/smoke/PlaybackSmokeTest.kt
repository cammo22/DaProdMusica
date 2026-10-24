package io.github.cammo22.smoke
import android.content.Intent
import android.os.SystemClock
import androidx.lifecycle.Lifecycle
import androidx.media3.common.*
import androidx.media3.common.util.UnstableApi
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.cammo22.music.PlaybackService
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicReference

@UnstableApi
@RunWith(AndroidJUnit4::class)
class PlaybackSmokeTest {
 @Test fun bundledSongsDecodeSeekAndContinueInBackground(){
  val instrumentation=InstrumentationRegistry.getInstrumentation()
  val context=instrumentation.targetContext
  ActivityScenario.launch(SmokeActivity::class.java).use { screen ->
   screen.onActivity {it.startService(Intent(it,PlaybackService::class.java))}
   val deadline=SystemClock.elapsedRealtime()+10000
   while(PlaybackService.instance==null&&SystemClock.elapsedRealtime()<deadline)Thread.sleep(50)
   assertNotNull("Service did not start",PlaybackService.instance)
   val service=PlaybackService.instance!!;val failure=AtomicReference<String?>(null)
   instrumentation.runOnMainSync {service.player.addListener(object:Player.Listener{override fun onPlayerError(error:PlaybackException){failure.set(error.stackTraceToString());android.util.Log.e("DaProdSmoke",error.stackTraceToString())}});service.analysisEnabled=true}
   val data=JSONObject(context.assets.open("samples.json").bufferedReader().use{it.readText()});val samples=data.getJSONArray("tracks");val indices=data.getJSONArray("indices")
   for(i in 0 until indices.length()){
    val queue=samples
    instrumentation.runOnMainSync {service.setQueue(queue,indices.getInt(i))}
    var position=0L;val started=SystemClock.elapsedRealtime()
    while(position<1500&&failure.get()==null&&SystemClock.elapsedRealtime()-started<20000){Thread.sleep(100);instrumentation.runOnMainSync {position=service.player.currentPosition}}
    assertNull(failure.get(),failure.get());assertTrue("Decoded playback never advanced for sample $i",position>=1500)
    instrumentation.runOnMainSync {service.player.seekTo(4000)};Thread.sleep(500)
    instrumentation.runOnMainSync {service.player.pause()};Thread.sleep(100)
    instrumentation.runOnMainSync {assertFalse(service.player.isPlaying);service.player.play()}
   }
   screen.moveToState(Lifecycle.State.CREATED)
   var before=0L;var after=0L
   instrumentation.runOnMainSync {before=service.player.currentPosition}
   Thread.sleep(2000)
   instrumentation.runOnMainSync {after=service.player.currentPosition;service.player.pause()}
   assertNull(failure.get(),failure.get());assertTrue("Playback stopped when Activity left foreground",after-before>1000)
   instrumentation.runOnMainSync {assertTrue("PCM analysis was never produced",service.features.optLong("sequence")>0)}
  }
 }
}

