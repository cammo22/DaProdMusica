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
class ExecuteArgs { var op:String="state";var requestId:Long=0;var items:String="[]";var index:Int=0;var position:Double=0.0;var enabled:Boolean=true;var volume:Float=1f;var url:String="";var digest:String="";var target:String="music" }
@UnstableApi
@TauriPlugin
class MusicPlugin(private val activity:Activity):Plugin(activity){
 companion object {
  var active:MusicPlugin?=null
  @JvmStatic fun back(){BackNavigation.dispatch(active?.webView)}
 }
 private val handler=Handler(Looper.getMainLooper())
 private var uiAnalysis=false
 private var newestQueueRequest=0L
 private var webView:WebView?=null
 private val updates=UpdateController(activity)
 override fun load(webView:WebView){
  active=this;this.webView=webView
  // Keep native selection/paste in text inputs, but do not let Android's long
  // click menu take over effect-button/canvas gestures.
  WebViewGestures.configure(webView)
 }
 override fun onResume(){PlaybackService.instance?.analysisEnabled=uiAnalysis}
 override fun onPause(){PlaybackService.instance?.analysisEnabled=false}
 override fun onDestroy(){handler.removeCallbacksAndMessages(null);webView=null;if(active===this)active=null}
 @Command fun execute(invoke:Invoke){
  try{
   val args=invoke.parseArgs(ExecuteArgs::class.java)
   if(args.op.startsWith("update")){updates.execute(args.op,args.url,args.digest,{invoke.resolve(JSObject(it.toString()))},{invoke.reject(it)},args.target);return}
   if(args.op=="widget"){
    activity.runOnUiThread{try{invoke.resolve(JSObject(PlaybackWidget.pin(activity).toString()))}catch(error:Exception){invoke.reject(error.message?:"Apri il menu Widget della Home e scegli DaProd Musica.")}}
    return
   }
   if(PlaybackService.instance==null){activity.startService(Intent(activity,PlaybackService::class.java));waitService(invoke,args,0)}else perform(invoke,args)
  }catch(error:Exception){invoke.reject(error.message?:"Comando audio non valido")}
 }
 private fun waitService(invoke:Invoke,args:ExecuteArgs,count:Int){handler.postDelayed({if(PlaybackService.instance!=null)perform(invoke,args)else if(count<100)waitService(invoke,args,count+1)else invoke.reject("Avvio player troppo lento. Riprova con Play.")},50)}
 private fun perform(invoke:Invoke,args:ExecuteArgs){try{
  val service=PlaybackService.instance?:throw IllegalStateException("Player non avviato");val p=service.player
  if(args.op=="queue"){if(args.requestId<newestQueueRequest){invoke.resolve(JSObject(service.snapshot().toString()));return};newestQueueRequest=args.requestId}
  when(args.op){
   "analysis"->{uiAnalysis=args.enabled;service.analysisEnabled=uiAnalysis}
   "queue"->service.setQueue(JSONArray(args.items),args.index)
   "play"->{if(p.playbackState==Player.STATE_IDLE)p.prepare();service.error=null;p.play()}
   "pause"->p.pause()
   "next"->p.seekToNextMediaItem()
   "prev"->if(p.currentPosition>3000)p.seekTo(0)else p.seekToPreviousMediaItem()
   "seek"->p.seekTo((args.position*1000).toLong().coerceAtLeast(0))
   "repeat"->p.repeatMode=if(args.enabled)Player.REPEAT_MODE_ALL else Player.REPEAT_MODE_OFF
   "volume"->p.volume=args.volume.coerceIn(0f,1f)
  }
  val state=service.snapshot();if(args.op!="init"&&args.op!="queue")state.remove("queue");invoke.resolve(JSObject(state.toString()))
 }catch(error:Exception){invoke.reject(error.message?:"Errore player")}}
}

