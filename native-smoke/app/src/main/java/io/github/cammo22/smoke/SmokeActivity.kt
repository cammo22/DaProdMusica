package io.github.cammo22.smoke
import android.content.res.Configuration
import android.os.Bundle
import io.github.cammo22.music.PipController
import io.github.cammo22.music.MusicPlugin
@androidx.media3.common.util.UnstableApi
class SmokeActivity:android.app.Activity(){
 lateinit var pip:PipController
 override fun onCreate(state:Bundle?){super.onCreate(state);pip=PipController(this){true};MusicPlugin.active=MusicPlugin.UiHook{pip.refresh()}}
 override fun onPictureInPictureModeChanged(value:Boolean,config:Configuration){super.onPictureInPictureModeChanged(value,config);pip.modeChanged(value)}
 override fun onUserLeaveHint(){super.onUserLeaveHint();pip.leave()}
 override fun onDestroy(){pip.destroy();MusicPlugin.active=null;super.onDestroy()}
}
