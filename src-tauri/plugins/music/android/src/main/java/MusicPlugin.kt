package io.github.cammo22.music
import android.app.Activity
import android.content.Intent
import android.os.*
import android.webkit.WebView
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import app.tauri.annotation.*
import app.tauri.plugin.*
import org.json.JSONArray

@InvokeArg
class ExecuteArgs { var op:String="state";var requestId:Long=0;var items:String="[]";var index:Int=0;var position:Double=0.0;var enabled:Boolean=true;var volume:Float=1f }
@UnstableApi
@TauriPlugin
class MusicPlugin(private val activity:Activity):Plugin(activity){
 companion object {
  var active:MusicPlugin?=null
  @JvmStatic fun leave(activity:Activity){active?.pip?.leave()}
  @JvmStatic fun pipChanged(value:Boolean){active?.pip?.modeChanged(value)}
 }
 private val handler=Handler(Looper.getMainLooper())
 private var uiAnalysis=false
 private var newestQueueRequest=0L
 private val pip=PipController(activity){uiAnalysis}
 override fun load(webView:WebView){active=this;pip.refresh()}
 override fun onResume(){PlaybackService.instance?.analysisEnabled=uiAnalysis||activity.isInPictureInPictureMode;pip.refresh()}
 override fun onPause(){PlaybackService.instance?.analysisEnabled=activity.isInPictureInPictureMode}
 override fun onDestroy(){handler.removeCallbacksAndMessages(null);pip.destroy();if(active===this)active=null}
 fun refreshPip(){pip.refresh()}
 @Command fun execute(invoke:Invoke){
  try{
   val args=invoke.parseArgs(ExecuteArgs::class.java)
   if(args.op=="pip"){pip.updateEnabled(args.enabled);invoke.resolve(JSObject().apply{put("supported",pip.supported());put("enabled",pip.enabled)});return}
   if(args.op=="enterPip"){if(pip.enter())invoke.resolve()else invoke.reject("PiP non disponibile: verifica il permesso nelle impostazioni Android.");return}
   if(PlaybackService.instance==null){activity.startService(Intent(activity,PlaybackService::class.java));waitService(invoke,args,0)}else perform(invoke,args)
  }catch(error:Exception){invoke.reject(error.message?:"Comando audio non valido")}
 }
 private fun waitService(invoke:Invoke,args:ExecuteArgs,count:Int){handler.postDelayed({if(PlaybackService.instance!=null)perform(invoke,args)else if(count<100)waitService(invoke,args,count+1)else invoke.reject("Avvio player troppo lento. Riprova con Play.")},50)}
 private fun perform(invoke:Invoke,args:ExecuteArgs){try{
  val service=PlaybackService.instance?:throw IllegalStateException("Player non avviato");val p=service.player
  if(args.op=="queue"){if(args.requestId<newestQueueRequest){invoke.resolve(JSObject(service.snapshot().toString()));return};newestQueueRequest=args.requestId}
  when(args.op){
   "analysis"->{uiAnalysis=args.enabled;service.analysisEnabled=uiAnalysis||activity.isInPictureInPictureMode}
   "queue"->service.setQueue(JSONArray(args.items),args.index)
   "play"->{if(p.playbackState==Player.STATE_IDLE)p.prepare();service.error=null;p.play()}
   "pause"->p.pause()
   "next"->p.seekToNextMediaItem()
   "prev"->if(p.currentPosition>3000)p.seekTo(0)else p.seekToPreviousMediaItem()
   "seek"->p.seekTo((args.position*1000).toLong().coerceAtLeast(0))
   "repeat"->p.repeatMode=if(args.enabled)Player.REPEAT_MODE_ALL else Player.REPEAT_MODE_OFF
   "volume"->p.volume=args.volume.coerceIn(0f,1f)
  }
  if(args.op!="state")pip.refresh()
  val state=service.snapshot();if(args.op!="init"&&args.op!="queue")state.remove("queue");state.put("pipSupported",pip.supported());state.put("pipEnabled",pip.enabled);invoke.resolve(JSObject(state.toString()))
 }catch(error:Exception){invoke.reject(error.message?:"Errore player")}}
}

