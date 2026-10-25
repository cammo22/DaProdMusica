package io.github.cammo22.smoke

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.cammo22.music.BackNavigation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BackSmokeTest {
 @Test fun nativeBackDispatchesExactlyOneWebNavigationEvent() {
  ActivityScenario.launch(SmokeActivity::class.java).use { screen ->
   lateinit var ready: CountDownLatch
   screen.onActivity { ready = it.pageReady }
   assertTrue("WebView did not load", ready.await(10, TimeUnit.SECONDS))
   val done = CountDownLatch(1)
   val count = AtomicReference<String>()
   screen.onActivity { activity ->
    activity.backView.evaluateJavascript("window.backEvents=0;window.addEventListener('dap-back',()=>window.backEvents++)") {
     BackNavigation.dispatch(activity.backView)
     activity.backView.evaluateJavascript("window.backEvents") { value -> count.set(value); done.countDown() }
    }
   }
   assertTrue("Back event never returned to JavaScript", done.await(10, TimeUnit.SECONDS))
   assertEquals("Native back should reach the in-app router once", "1", count.get())
   BackNavigation.dispatch(null)
  }
 }
}
