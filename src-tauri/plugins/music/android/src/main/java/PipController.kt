package io.github.cammo22.music
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.graphics.*
import android.graphics.drawable.Icon
import android.os.*
import android.util.Rational
import android.view.*
import android.widget.FrameLayout
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import kotlin.math.*

@UnstableApi
class PipController(private val activity:Activity,private val analysisRequested:()->Boolean={false}){
 var enabled=activity.getPreferences(0).getBoolean("pip",true)
 private var mini:MiniView?=null
 fun supported()=activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
 fun setEnabled(value:Boolean){enabled=value;activity.getPreferences(0).edit().putBoolean("pip",value).apply();refresh()}
 private fun params():PictureInPictureParams{
  val playing=PlaybackService.instance?.player?.isPlaying==true
  fun action(op:String,label:String,icon:Int,code:Int):RemoteAction{val intent=Intent(activity,PlaybackActionReceiver::class.java).setAction(op);return RemoteAction(Icon.createWithResource(activity,icon),label,label,PendingIntent.getBroadcast(activity,code,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))}
  val rect=Rect();activity.window.decorView.getGlobalVisibleRect(rect)
  val builder=PictureInPictureParams.Builder().setAspectRatio(Rational(16,9)).setSourceRectHint(rect).setActions(listOf(action("prev","Precedente",android.R.drawable.ic_media_previous,1),action(if(playing)"pause" else "play",if(playing)"Pausa" else "Riproduci",if(playing)android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,2),action("next","Successivo",android.R.drawable.ic_media_next,3)))
  if(Build.VERSION.SDK_INT>=31)builder.setAutoEnterEnabled(enabled&&playing).setSeamlessResizeEnabled(false)
  return builder.build()
 }
 fun refresh(){if(supported())try{activity.setPictureInPictureParams(params())}catch(e:Exception){android.util.Log.w("DaProdPiP","PiP parameters unavailable",e)}}
 fun enter():Boolean {if(!supported()||(PlaybackService.instance?.player?.mediaItemCount?:0)==0)return false;return try{activity.enterPictureInPictureMode(params())}catch(e:Exception){android.util.Log.w("DaProdPiP","PiP refused",e);false}}
 fun leave(){if(Build.VERSION.SDK_INT<31&&enabled&&PlaybackService.instance?.player?.isPlaying==true)enter()}
 fun modeChanged(value:Boolean){
  PlaybackService.instance?.analysisEnabled=value||analysisRequested()
  val root=activity.findViewById<FrameLayout>(android.R.id.content)
  if(value){if(mini==null){mini=MiniView(activity);mini?.tag="daprod-mini-player";root.addView(mini,FrameLayout.LayoutParams(-1,-1))};mini?.visibility=View.VISIBLE;mini?.invalidate()}else{mini?.let{root.removeView(it)};mini=null}
 }
 fun destroy(){modeChanged(false);PlaybackService.instance?.analysisEnabled=false}
}
@UnstableApi
class PlaybackActionReceiver:BroadcastReceiver(){override fun onReceive(context:Context,intent:Intent){val p=PlaybackService.instance?.player?:return;when(intent.action){"play"->{if(p.playbackState==Player.STATE_IDLE)p.prepare();p.play()};"pause"->p.pause();"next"->p.seekToNextMediaItem();"prev"->p.seekToPreviousMediaItem()}}}
@UnstableApi
class MiniView(context:Context):View(context){
 private val paint=Paint(Paint.ANTI_ALIAS_FLAG);private var artwork:Bitmap?=null;private var id=""
 override fun onDraw(c:Canvas){
  val p=PlaybackService.instance?.player;val w=width.toFloat();val h=height.toFloat();c.drawColor(Color.rgb(15,18,22))
  val next=p?.currentMediaItem?.mediaId?:"";if(next!=id){id=next;artwork?.recycle();artwork=p?.mediaMetadata?.artworkData?.let{BitmapFactory.decodeByteArray(it,0,it.size)}}
  val pad=h*.12f;val side=h*.62f;artwork?.let{paint.alpha=255;c.drawBitmap(it,null,RectF(pad,pad,pad+side,pad+side),paint)}
  val left=pad+side+pad;val available=max(1f,w-left-pad)
  fun label(text:String,y:Float){var result=text;while(result.length>1&&paint.measureText(result+"…")>available)result=result.dropLast(1);if(result!=text)result+="…";c.drawText(result,left,y,paint)}
  paint.color=Color.WHITE;paint.textSize=h*.1f;paint.typeface=Typeface.create("sans-serif",Typeface.BOLD);label(p?.mediaMetadata?.title?.toString()?:"DaProd Musica",h*.31f)
  paint.color=Color.rgb(150,161,170);paint.textSize=h*.073f;paint.typeface=Typeface.DEFAULT;label(p?.mediaMetadata?.artist?.toString()?:"DaProd",h*.46f)
  val energy=PlaybackService.instance?.features?.optDouble("rms",0.0)?:0.0
  val t=SystemClock.uptimeMillis()/400.0;val space=available/24;paint.color=Color.rgb(154,216,191)
  for(i in 0..23){val size=if(p?.isPlaying==true)((.045+energy*.4)*h*(.3+abs(sin(t+i*.45)))).toFloat()else h*.008f;val x=left+i*space;c.drawRoundRect(x,h*.68f-size,x+max(1f,space*.45f),h*.68f+size,2f,2f,paint)}
  val duration=max(1,p?.duration?:1);paint.color=Color.rgb(57,65,70);c.drawRect(pad,h-pad/2,w-pad,h-pad/2+2,paint);paint.color=Color.rgb(154,216,191);c.drawRect(pad,h-pad/2,pad+(w-2*pad)*(p?.currentPosition?:0)/duration,h-pad/2+2,paint)
  postInvalidateDelayed(if(p?.isPlaying==true)66 else 500)
 }
 override fun onDetachedFromWindow(){artwork?.recycle();artwork=null;super.onDetachedFromWindow()}
}
