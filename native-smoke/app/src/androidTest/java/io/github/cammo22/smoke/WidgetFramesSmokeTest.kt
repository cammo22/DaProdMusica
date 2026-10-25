package io.github.cammo22.smoke

import androidx.media3.common.util.UnstableApi
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.cammo22.music.PlaybackWidget
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@UnstableApi
@RunWith(AndroidJUnit4::class)
class WidgetFramesSmokeTest {
 @Test fun animationIsBoundedVariedAndReproducibleFromItsSeed() {
  val first = PlaybackWidget.makeFrames(123)
  val replay = PlaybackWidget.makeFrames(123)
  val different = PlaybackWidget.makeFrames(456)
  try {
   assertEquals(24, first.size)
   for (i in first.indices) {
    assertEquals(192, first[i].width)
    assertEquals(96, first[i].height)
    assertTrue("Seeded scene changed at frame $i", first[i].sameAs(replay[i]))
   }
   assertFalse("Animation contains repeated still frames", first[0].sameAs(first[1]))
   assertFalse("New effect seed did not change the scene", first[0].sameAs(different[0]))
   assertFalse("Effect loop should include several scenes", first[0].sameAs(first[8]))
  } finally { (first + replay + different).forEach { it.recycle() } }
 }
}
