package io.github.cammo22.smoke

import android.os.Build
import androidx.core.content.FileProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.cammo22.music.UpdateController
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class UpdateSmokeTest {
 private val source = "https://github.com/cammo22/DaProdMusica/releases/download/v0.5.0/DaProdMusica-0.5.0-Android-arm64.apk"
 private val digest = "sha256:" + "ab".repeat(32)

 @Test fun updateSourceRequiresTheExpectedReleaseApkAndSha256() {
  assertTrue(UpdateController.validSource(source, digest))
  assertTrue(UpdateController.validSource(source, "sha256:" + "AB".repeat(32)))
  val rejected = listOf(
   source.replace("https:", "http:"),
   source.replace("github.com", "github.com.example.org"),
   source.replace("github.com", "example.org"),
   source.replace("github.com", "github.com:443"),
   source.replace("github.com", "name:secret@github.com"),
   source.replace("cammo22/DaProdMusica", "other/DaProdMusica"),
   source.replace("/cammo22/", "/%63ammo22/"),
   source.replace("/v0.5.0/", "/latest/"),
   source.replace("/v0.5.0/", "/v0.6.0/"),
   source.replace(".apk", ".exe"),
   source.replace("arm64.apk", "x86.apk"),
   "$source?download=1", "$source#fragment", "", "not a URL"
  )
  rejected.forEach { assertFalse("Unexpected download source was accepted: $it", UpdateController.validSource(it, digest)) }
  listOf("", "sha256:abc", "md5:" + "ab".repeat(16), "sha256:" + "gg".repeat(32), digest + "0")
   .forEach { assertFalse("Invalid digest was accepted: $it", UpdateController.validSource(source, it)) }
 }

 @Test fun updateStateAndInvalidCommandsReturnWithoutOpeningTheInstaller() {
  val context = InstrumentationRegistry.getInstrumentation().targetContext
  val prefs = context.getSharedPreferences("dap-update", 0)
  val apk = File(context.getExternalFilesDir("updates"), "daprod-update.apk")
  prefs.edit().clear().commit()
  apk.delete()
  ActivityScenario.launch(SmokeActivity::class.java).use { screen ->
   lateinit var controller: UpdateController
   screen.onActivity { controller = UpdateController(it) }
   fun call(op: String, url: String = "", sha: String = ""): Pair<JSONObject?, String?> {
    val finished = CountDownLatch(1)
    val state = AtomicReference<JSONObject>()
    val error = AtomicReference<String>()
    screen.onActivity { controller.execute(op, url, sha, { state.set(it); finished.countDown() }, { error.set(it); finished.countDown() }) }
    assertTrue("Update command $op never completed", finished.await(10, TimeUnit.SECONDS))
    return Pair(state.get(), error.get())
   }
   val idle = call("updateState")
   assertNull(idle.second)
   assertEquals("idle", idle.first!!.getString("status"))
   @Suppress("DEPRECATION")
   val installed = context.packageManager.getPackageInfo(context.packageName, 0)
   @Suppress("DEPRECATION")
   val installedCode = if (Build.VERSION.SDK_INT >= 28) installed.longVersionCode else installed.versionCode.toLong()
   assertTrue("Smoke fixture needs an installed version for update cleanup", installedCode > 1)
   try {
    for (version in listOf(installedCode, installedCode - 1)) {
     apk.parentFile!!.mkdirs(); apk.writeBytes(byteArrayOf(1, 2, 3))
     prefs.edit().putLong("verifiedVersion", version).putString("digest", "stale").commit()
     val cleared = call("updateState")
     assertNull(cleared.second)
     assertEquals("idle", cleared.first!!.getString("status"))
     assertTrue("Installed update preferences were retained", prefs.all.isEmpty())
     assertFalse("Installed update APK was retained", apk.exists())
    }
   } finally { apk.delete(); prefs.edit().clear().commit() }
   assertNotNull("Unsafe download should fail before enqueueing", call("updateDownload", "https://example.org/file.apk", digest).second)
   assertEquals(-1L, context.getSharedPreferences("dap-update", 0).getLong("id", -1))
   assertNotNull("Missing APK should fail before opening the installer", call("updateInstall").second)
   try {
    apk.parentFile!!.mkdirs()
    val invalidApk = byteArrayOf(1, 2, 3, 4)
    apk.writeBytes(invalidApk)
    prefs.edit().putString("digest", "00".repeat(32)).commit()
    assertEquals("Download danneggiato. Scarica di nuovo.", call("updateInstall").second)
    val sha = MessageDigest.getInstance("SHA-256").digest(invalidApk).joinToString("") { "%02x".format(it.toInt() and 255) }
    prefs.edit().putString("digest", sha).commit()
    assertEquals("APK non valido.", call("updateInstall").second)
   } finally { apk.delete(); prefs.edit().clear().commit() }
   assertNotNull("Unknown update command must be rejected", call("updateUnknown").second)
  }
 }

 @Test fun installerFileProviderExposesOnlyTheUpdateDirectory() {
  val context = InstrumentationRegistry.getInstrumentation().targetContext
  val authority = context.packageName + ".updates"
  val uri = FileProvider.getUriForFile(context, authority, File(context.getExternalFilesDir("updates"), "daprod-update.apk"))
  assertEquals("content", uri.scheme)
  assertEquals(authority, uri.authority)
  try {
   FileProvider.getUriForFile(context, authority, File(context.filesDir, "outside.apk"))
   fail("Installer provider exposed an unrelated private file")
  } catch (_: IllegalArgumentException) { }
 }
}
