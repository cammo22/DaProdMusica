package io.github.cammo22.music

import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.graphics.*
import android.graphics.drawable.Icon
import android.os.*
import android.util.Rational
import android.view.*
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import app.tauri.annotation.*
import app.tauri.plugin.*
import org.json.JSONArray
import kotlin.math.*

@InvokeArg
class ExecuteArgs { var op:String="state";var requestId:Long=0;var items:String="[]";var index:Int=0;var position:Double=0.0;var enabled:Boolean=true;var volume:Float=1f }

@UnstableApi
@TauriPlugin
class MusicPlugin(private val activity:Activity):Plugin(activity){
 companion object {var active:MusicPlugin?=null
  @JvmStatic fun leave(activity:Activity){active?.let{if(Build.VERSION.SDK_INT<31&&it.canPip()&&it.pipEnabled&&PlaybackService.instance?.player?.isPlaying==true)it.enterPip()}}
  @JvmStatic fun pipChanged(inPip:Boolean){active?.setPip(inPip)}
 }
 private val handler=Handler(Looper.getMainLooper())
 var pipEnabled=true
 private var uiAnalysis=false;private var newestQueueRequest=0L
 private var mini:MiniView?=null
 override fun load(webView:WebView){active=this;pipEnabled=activity.getPreferences(0).getBoolean("pip",true);refreshPip()}
 override fun onResume(){PlaybackService.instance?.analysisEnabled=uiAnalysis||activity.isInPictureInPictureMode;refreshPip()}
 override fun onPause(){PlaybackService.instance?.analysisEnabled=activity.isInPictureInPictureMode}
 override fun onDestroy(){handler.removeCallbacksAndMessages(null);setPip(false);if(active===this)active=null}
 private fun canPip()=activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
 @Command fun execute(invoke:Invoke){
  val args=invoke.parseArgs(ExecuteArgs::class.java)
  if(args.op=="pip"){pipEnabled=args.enabled;activity.getPreferences(0).edit().putBoolean("pip",pipEnabled).apply();refreshPip();invoke.resolve(JSObject().apply{put("supported",canPip());put("enabled",pipEnabled)});return}
  if(args.op=="enterPip"){enterPip();invoke.resolve();return}
  if(PlaybackService.instance==null){activity.startService(Intent(activity,PlaybackService::class.java));waitService(invoke,args,0)}else perform(invoke,args)
 }
 private fun waitService(invoke:Invoke,args:ExecuteArgs,count:Int){handler.postDelayed({if(PlaybackService.instance!=null)perform(invoke,args)else if(count<100)waitService(invoke,args,count+1)else invoke.reject("Avvio player troppo lento. Riprova premendo Play.")},50)}
 private fun perform(invoke:Invoke,args:ExecuteArgs){try{
  val service=PlaybackService.instance?:throw IllegalStateException("Player non avviato");val p=service.player
  if(args.op=="queue"){if(args.requestId<newestQueueRequest){invoke.resolve(JSObject(service.snapshot().toString()));return};newestQueueRequest=args.requestId}
  when(args.op){"analysis"->{uiAnalysis=args.enabled;service.analysisEnabled=uiAnalysis||activity.isInPictureInPictureMode};"queue"->service.setQueue(JSONArray(args.items),args.index);"play"->p.play();"pause"->p.pause();"next"->p.seekToNextMediaItem();"prev"->if(p.currentPosition>3000)p.seekTo(0)else p.seekToPreviousMediaItem();"seek"->p.seekTo((args.position*1000).toLong().coerceAtLeast(0));"repeat"->p.repeatMode=if(args.enabled)Player.REPEAT_MODE_ALL else Player.REPEAT_MODE_OFF;"volume"->p.volume=args.volume.coerceIn(0f,1f)}
  if(args.op!="state")refreshPip();val state=service.snapshot();if(args.op!="init"&&args.op!="queue")state.remove("queue");state.put("pipSupported",canPip());state.put("pipEnabled",pipEnabled);invoke.resolve(JSObject(state.toString()))
 }catch(e:Exception){invoke.reject(e.message?:"Errore player")}}
 private fun params():PictureInPictureParams{
  val playing=PlaybackService.instance?.player?.isPlaying==true
  fun action(op:String,label:String,icon:Int,code:Int):RemoteAction{val intent=Intent(activity,PlaybackActionReceiver::class.java).setAction(op);return RemoteAction(Icon.createWithResource(activity,icon),label,label,PendingIntent.getBroadcast(activity,code,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))}
  val root=activity.window.decorView;val rect=Rect();root.getGlobalVisibleRect(rect)
  val b=PictureInPictureParams.Builder().setAspectRatio(Rational(16,9)).setSourceRectHint(rect).setActions(listOf(action("prev","Precedente",android.R.drawable.ic_media_previous,1),action(if(playing)"pause" else "play",if(playing)"Pausa" else "Riproduci",if(playing)android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,2),action("next","Successivo",android.R.drawable.ic_media_next,3)))
  if(Build.VERSION.SDK_INT>=31)b.setAutoEnterEnabled(pipEnabled&&playing).setSeamlessResizeEnabled(false)
  return b.build()
 }
 fun refreshPip(){if(canPip())try{activity.setPictureInPictureParams(params())}catch(_:Exception){} }
 private fun enterPip(){if(canPip()&&(PlaybackService.instance?.player?.mediaItemCount?:0)>0)try{activity.enterPictureInPictureMode(params())}catch(_:Exception){} }
 private fun setPip(value:Boolean){
  PlaybackService.instance?.analysisEnabled=value||uiAnalysis
  val root=activity.findViewById<FrameLayout>(android.R.id.content)
  if(value){if(mini==null){mini=MiniView(activity);root.addView(mini,FrameLayout.LayoutParams(-1,-1))};mini?.visibility=View.VISIBLE;mini?.invalidate()}else{mini?.let{root.removeView(it)};mini=null}
 }
}
@UnstableApi
class PlaybackActionReceiver:BroadcastReceiver(){override fun onReceive(context:Context,intent:Intent){val p=PlaybackService.instance?.player?:return;when(intent.action){"play"->p.play();"pause"->p.pause();"next"->p.seekToNextMediaItem();"prev"->p.seekToPreviousMediaItem()}}}
@UnstableApi
class MiniView(context:Context):View(context){
 private val paint=Paint(Paint.ANTI_ALIAS_FLAG);private var artwork:Bitmap?=null;private var id=""
 override fun onDraw(c:Canvas){
  val p=PlaybackService.instance?.player;val w=width.toFloat();val h=height.toFloat();c.drawColor(Color.rgb(11,20,28))
  val next=p?.currentMediaItem?.mediaId?:"";if(next!=id){id=next;artwork?.recycle();artwork=p?.mediaMetadata?.artworkData?.let{BitmapFactory.decodeByteArray(it,0,it.size)}}
  val pad=h*.12f;val side=h*.62f;artwork?.let{paint.alpha=255;c.drawBitmap(it,null,RectF(pad,pad,pad+side,pad+side),paint)}
  paint.color=Color.rgb(178,242,224);paint.textSize=h*.1f;paint.typeface=Typeface.create("sans-serif",Typeface.BOLD)
  val text=p?.mediaMetadata?.title?.toString()?:"DaProd Musica";c.drawText(text.take(24),pad+side+pad,h*.31f,paint)
  paint.color=Color.rgb(143,174,190);paint.textSize=h*.073f;c.drawText("DAPROD · SEGNALE VIVO",pad+side+pad,h*.46f,paint)
  val energy=PlaybackService.instance?.features?.optDouble("rms",0.0)?:0.0
  val t=SystemClock.uptimeMillis()/400.0;val left=pad+side+pad;val space=(w-left-pad)/24
  paint.color=Color.rgb(139,239,213)
  for(i in 0..23){val size=if(p?.isPlaying==true)((.07+energy*.4)*h*(.3+abs(sin(t+i*.45)))).toFloat()else h*.012f;val x=left+i*space;c.drawRoundRect(x,h*.68f-size,x+max(1f,space*.45f),h*.68f+size,2f,2f,paint)}
  val duration=max(1,p?.duration?:1);paint.color=Color.rgb(57,80,87);c.drawRect(pad,h-pad/2,w-pad,h-pad/2+2,paint);paint.color=Color.rgb(139,239,213);c.drawRect(pad,h-pad/2,pad+(w-2*pad)*(p?.currentPosition?:0)/duration,h-pad/2+2,paint)
  postInvalidateDelayed(if(p?.isPlaying==true)66 else 500)
 }
}


