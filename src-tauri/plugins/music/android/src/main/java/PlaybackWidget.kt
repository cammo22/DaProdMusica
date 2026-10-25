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
  fun pin(context:Context):Boolean{
   val manager=AppWidgetManager.getInstance(context)
   return manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(ComponentName(context,PlaybackWidget::class.java),null,null)
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
   view.setInt(R.id.widget_frames,"setFlipInterval",220)
   return view
  }
  internal fun makeFrames(value:Int):List<Bitmap>{
   val rng=Random(value);val scenes=(0..5).shuffled(rng).take(3);val hue=rng.nextInt(360).toFloat()
   return List(24){index->
    val phase=(index%8)/8f*2*PI.toFloat();val scene=scenes[index/8]
    val bitmap=Bitmap.createBitmap(192,96,Bitmap.Config.ARGB_8888);val canvas=Canvas(bitmap)
    canvas.drawColor(Color.rgb(7,11,19));val paint=Paint(Paint.ANTI_ALIAS_FLAG)
    for(i in 0 until 18){
     paint.color=Color.HSVToColor(180,floatArrayOf((hue+scene*39+i*5)%360,.65f,1f));paint.style=Paint.Style.STROKE;paint.strokeWidth=1.2f
     val x=96f;val y=48f;val n=i/18f
     when(scene){
      0->{val radius=6f+i*3+sin(phase+n*5)*4;canvas.drawOval(x-radius*1.7f,y-radius*.5f,x+radius*1.7f,y+radius*.5f,paint)}
      1->{val path=Path();for(k in 0..96){val px=k*2f;val py=y+sin(px*.035f+phase+n*6)*16+cos(px*.02f-phase)*n*22;if(k==0)path.moveTo(px,py)else path.lineTo(px,py)};canvas.drawPath(path,paint)}
      2->{val a=n*2*PI.toFloat()+phase*.25f;val r=12+i*2.6f;paint.style=Paint.Style.FILL;canvas.drawCircle(x+cos(a)*r*1.6f,y+sin(a)*r*.65f,2+n*2,paint)}
      3->{val d=(n+phase/(2*PI.toFloat()))%1f;val r=4+d*d*115;canvas.drawRect(x-r,y-r*.6f,x+r,y+r*.6f,paint)}
      4->{val px=6+i*10f;val height=10+abs(sin(n*9+phase))*50;paint.strokeWidth=4f;canvas.drawLine(px,y-height/2,px,y+height/2,paint)}
      else->{val path=Path();for(k in 0..90){val a=k/90f*2*PI.toFloat();val r=15+i*1.5f+sin(a*5+phase)*7;val px=x+cos(a)*r*1.6f;val py=y+sin(a)*r*.6f;if(k==0)path.moveTo(px,py)else path.lineTo(px,py)};path.close();canvas.drawPath(path,paint)}
     }
    };bitmap
   }
  }
 }
}
