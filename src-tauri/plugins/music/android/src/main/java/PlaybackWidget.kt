package io.github.cammo22.music

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.*
import android.graphics.*
import android.widget.RemoteViews
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import kotlin.math.*
import kotlin.random.Random
import org.json.JSONObject

/** RemoteViews cannot host GL. The launcher animates a bounded bitmap loop itself:
 * no wake lock, background frame timer, microphone or overlay permission. */
@UnstableApi
class PlaybackWidget:AppWidgetProvider() {
 override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){update(context)}
 override fun onReceive(context:Context,intent:Intent){
  super.onReceive(context,intent)
  if(intent.action==EFFECT){seed=Random.nextInt();frames=null;update(context)}
  if(intent.action==CONTROL){
   val action=intent.getStringExtra("command")?:"toggle"
   val app=context.applicationContext
   val token=androidx.media3.session.SessionToken(app,ComponentName(app,PlaybackService::class.java))
   val pending=goAsync()
   val future=androidx.media3.session.MediaController.Builder(app,token).buildAsync()
   future.addListener({
    try{val p=future.get();if(p.mediaItemCount>0)when(action){
     "next"->p.seekToNextMediaItem()
     "prev"->if(p.currentPosition>3000)p.seekTo(0)else p.seekToPreviousMediaItem()
     else->if(p.playWhenReady)p.pause()else{if(p.playbackState==Player.STATE_IDLE)p.prepare();p.play()}
    }}catch(e:Exception){android.util.Log.w("DaProdWidget","Controller unavailable",e)}
    finally{androidx.media3.session.MediaController.releaseFuture(future);pending.finish()}
   },androidx.core.content.ContextCompat.getMainExecutor(app))
  }
 }
 companion object{
  const val CONTROL="io.github.cammo22.music.WIDGET_CONTROL"
  const val EFFECT="io.github.cammo22.music.WIDGET_EFFECT"
  private var seed=Random.nextInt()
  private var frames:List<Bitmap>?=null
  private var trackId=""
  fun pin(context:Context):JSONObject{
   val manager=AppWidgetManager.getInstance(context)
   val component=ComponentName(context,PlaybackWidget::class.java)
   val supported=manager.isRequestPinAppWidgetSupported
   val callback=PendingIntent.getBroadcast(context,12,Intent(context,PlaybackWidget::class.java).setAction("android.appwidget.action.APPWIDGET_UPDATE"),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
   val requested=supported&&manager.requestPinAppWidget(component,null,callback)
   return JSONObject().put("supported",supported).put("requested",requested).put("pinned",manager.getAppWidgetIds(component).isNotEmpty())
  }
  fun update(context:Context){
   val manager=AppWidgetManager.getInstance(context)
   val ids=manager.getAppWidgetIds(ComponentName(context,PlaybackWidget::class.java))
   if(ids.isEmpty())return
   manager.updateAppWidget(ids,buildViews(context))
  }
  internal fun buildViews(context:Context):RemoteViews{
   val player=PlaybackService.instance?.player
   val item=player?.currentMediaItem
   if(trackId!=item?.mediaId){trackId=item?.mediaId?:"";seed=Random.nextInt();frames=null}
   val running=player?.isPlaying==true
   val view=RemoteViews(context.packageName,if(running)R.layout.music_widget else R.layout.music_widget_paused)
   val artwork=item?.mediaMetadata?.artworkData
   if(artwork!=null){
    val options=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(artwork,0,artwork.size,options)
    options.inSampleSize=max(1,max(options.outWidth,options.outHeight)/256);options.inJustDecodeBounds=false
    BitmapFactory.decodeByteArray(artwork,0,artwork.size,options)?.let{source->
     val image=Bitmap.createBitmap(192,192,Bitmap.Config.ARGB_8888);val c=Canvas(image);val paint=Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
     val scale=192f/min(source.width,source.height);val m=Matrix();m.setScale(scale,scale);m.postTranslate((192-source.width*scale)/2,(192-source.height*scale)/2)
     paint.shader=BitmapShader(source,Shader.TileMode.CLAMP,Shader.TileMode.CLAMP).apply{setLocalMatrix(m)}
     c.drawRoundRect(0f,0f,192f,192f,28f,28f,paint);view.setImageViewBitmap(R.id.widget_cover,image);source.recycle()
    }
   }else view.setImageViewResource(R.id.widget_cover,R.drawable.widget_effect)
   view.setTextViewText(R.id.widget_title,item?.mediaMetadata?.title?:"DaProd Musica")
   view.setTextViewText(R.id.widget_artist,item?.mediaMetadata?.artist?:"Tocca Play")
   view.setImageViewResource(R.id.widget_play,if(running)R.drawable.widget_pause else R.drawable.widget_play)
   view.setContentDescription(R.id.widget_play,if(running)"Pausa" else "Riproduci")
   for((id,command) in listOf(R.id.widget_play to "toggle",R.id.widget_next to "next",R.id.widget_prev to "prev")){
    val intent=Intent(context,PlaybackWidget::class.java).setAction(CONTROL).putExtra("command",command)
    view.setOnClickPendingIntent(id,PendingIntent.getBroadcast(context,id,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
   }
   val open=context.packageManager.getLaunchIntentForPackage(context.packageName)
   if(open!=null)view.setOnClickPendingIntent(R.id.widget_info,PendingIntent.getActivity(context,0,open,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
   view.setOnClickPendingIntent(R.id.widget_effect,PendingIntent.getBroadcast(context,10,Intent(context,PlaybackWidget::class.java).setAction(EFFECT),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
   val bitmaps=frames?:makeFrames(seed).also{frames=it}
   view.removeAllViews(R.id.widget_frames)
   for(bitmap in if(running)bitmaps else listOf(bitmaps.first())){
    val frame=RemoteViews(context.packageName,R.layout.widget_frame)
    frame.setImageViewBitmap(R.id.widget_frame_image,bitmap)
    view.addView(R.id.widget_frames,frame)
   }
   view.setInt(R.id.widget_frames,"setFlipInterval",90)
   return view
  }
  internal fun makeFrames(value:Int):List<Bitmap>{
   val hue=(value.toLong().and(0xFFFFFF)%360).toFloat()
   return List(24){index->
    val phase=index/24f*360f;val bitmap=Bitmap.createBitmap(128,128,Bitmap.Config.ARGB_8888);val c=Canvas(bitmap);val paint=Paint(Paint.ANTI_ALIAS_FLAG)
    paint.style=Paint.Style.STROKE;paint.strokeWidth=1.2f;paint.color=Color.argb(35,190,220,210);c.drawRoundRect(5f,5f,123f,123f,26f,26f,paint)
    paint.color=Color.HSVToColor(190,floatArrayOf(hue,.3f,.95f));paint.strokeWidth=2f
    c.drawArc(2f,2f,126f,126f,phase,65f,false,paint)
    paint.color=Color.HSVToColor(90,floatArrayOf((hue+40)%360,.2f,.8f));c.drawArc(2f,2f,126f,126f,phase+180,42f,false,paint)
    bitmap
   }
  }
 }
}
