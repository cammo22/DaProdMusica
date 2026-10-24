package io.github.cammo22.music

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.media3.common.*
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.*
import androidx.media3.exoplayer.audio.*
import androidx.media3.session.*
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.*

@UnstableApi
class PlaybackService:MediaSessionService(){
 companion object { var instance:PlaybackService?=null }
 lateinit var player:ExoPlayer
 private var session:MediaSession?=null
 private var rows=JSONArray()
 var error:String?=null
 @Volatile var features=JSONObject()
 @Volatile var analysisEnabled=false
 private var featureSequence=0L
 private val pending=AtomicReference<FloatArray?>(null)
 private val worker=Executors.newSingleThreadScheduledExecutor()
 private var rate=48000
 private var previous=FloatArray(64)
 private var beatAverage=0.0
 private var lastBeat=0L
 private var beatCount=0
 private val main=android.os.Handler(android.os.Looper.getMainLooper())
 private val checkpoint=object:Runnable{override fun run(){if(::player.isInitialized&&player.isPlaying)persist();main.postDelayed(this,10000)}}
 override fun onCreate(){
  super.onCreate();instance=this
  val tap=object:BaseAudioProcessor(){
   private var samples=FloatArray(2048);private var cursor=0
   override fun onConfigure(input:AudioProcessor.AudioFormat):AudioProcessor.AudioFormat {cursor=0;pending.set(null);rate=input.sampleRate;return if(input.encoding==C.ENCODING_PCM_16BIT)input else AudioProcessor.AudioFormat.NOT_SET}
   override fun queueInput(input:ByteBuffer){
    val copy=input.duplicate().order(ByteOrder.LITTLE_ENDIAN)
    val channels=inputAudioFormat.channelCount
    if(analysisEnabled)while(copy.remaining()>=channels*2){var sample=0f;repeat(channels){sample+=copy.short/32768f};samples[cursor++]=sample/channels;if(cursor==samples.size){pending.set(samples);samples=FloatArray(2048);cursor=0}}else cursor=0
    val output=replaceOutputBuffer(input.remaining());output.put(input);output.flip()
   }
   override fun onFlush(){cursor=0;pending.set(null)}
  }
  val renderers=object:DefaultRenderersFactory(this){
   override fun buildAudioSink(context:android.content.Context,enableFloatOutput:Boolean,enableAudioTrackPlaybackParams:Boolean):AudioSink = DefaultAudioSink.Builder(context).setEnableFloatOutput(false).setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams).setAudioProcessors(arrayOf(tap)).build()
  }
  player=ExoPlayer.Builder(this,renderers).build()
  player.setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),true)
  player.setHandleAudioBecomingNoisy(true);player.setWakeMode(C.WAKE_MODE_LOCAL)
  val launch=packageManager.getLaunchIntentForPackage(packageName)!!
  val intent=PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  session=MediaSession.Builder(this,player).setSessionActivity(intent).build()
  player.addListener(object:Player.Listener{
   override fun onEvents(p:Player,events:Player.Events){persist();MusicPlugin.active?.refreshPip()}
   override fun onPlayerError(e:PlaybackException){error=e.message}
  })
  val saved=getSharedPreferences("dap-playback",MODE_PRIVATE)
  try{val raw=saved.getString("queue",null);val index=saved.getInt("index",0);val position=saved.getLong("position",0);if(raw!=null)setQueue(JSONArray(raw),index,false,position)}catch(_:Exception){}
  worker.scheduleAtFixedRate({val frame=pending.getAndSet(null);if(analysisEnabled&&frame!=null)analyse(frame)},0,50,TimeUnit.MILLISECONDS)
  main.postDelayed(checkpoint,10000)
 }
 fun setQueue(items:JSONArray,index:Int,play:Boolean=true,position:Long=0){
  val list=ArrayList<MediaItem>()
  for(i in 0 until items.length()){
   val row=items.getJSONObject(i);val src=row.getString("src")
   require(src.matches(Regex("media/[a-f0-9]+/[a-f0-9]+\\.(mp3|wav|flac|ogg|m4a)")))
   val metadata=MediaMetadata.Builder().setTitle(row.getString("title")).setArtist(row.optString("artist","DaProd")).setAlbumTitle(row.optString("album"))
   val art=row.optString("artwork")
   if(art.matches(Regex("artwork/[a-f0-9]+\\.(jpg|png|webp)")))try{metadata.setArtworkData(assets.open(art).use{it.readBytes()},MediaMetadata.PICTURE_TYPE_FRONT_COVER)}catch(_:Exception){}
   list.add(MediaItem.Builder().setMediaId(row.getString("id")).setUri(Uri.parse("asset:///$src")).setMediaMetadata(metadata.build()).build())
  }
  require(list.isNotEmpty());rows=items;error=null;player.setMediaItems(list,index.coerceIn(0,list.lastIndex),position);player.prepare();player.playWhenReady=play
 }
 fun snapshot():JSONObject{
  val p=player;val item=p.currentMediaItem
  return JSONObject().put("native",true).put("id",item?.mediaId?:"").put("index",p.currentMediaItemIndex).put("playing",p.isPlaying).put("position",p.currentPosition/1000.0).put("duration",max(0,p.duration)/1000.0).put("queue",rows).put("features",if(p.isPlaying)features else JSONObject()).put("error",error)
 }
 private fun persist(){if(!::player.isInitialized)return;getSharedPreferences("dap-playback",MODE_PRIVATE).edit().putString("queue",rows.toString()).putInt("index",max(0,player.currentMediaItemIndex)).putLong("position",player.currentPosition).apply()}
 private fun analyse(x:FloatArray){
  // Radix-2 FFT on a worker; audio callback only copies PCM into a bounded mailbox.
  val n=x.size;val re=DoubleArray(n){x[it].toDouble()*(.5-.5*cos(2*PI*it/(n-1)))};val im=DoubleArray(n)
  var j=0
  for(i in 1 until n){var bit=n shr 1;while((j and bit)!=0){j=j xor bit;bit=bit shr 1};j=j xor bit;if(i<j){val v=re[i];re[i]=re[j];re[j]=v}}
  var length=2
  while(length<=n){val angle=-2*PI/length;val half=length/2;var start=0;while(start<n){for(k in 0 until half){val c=cos(angle*k);val s=sin(angle*k);val b=start+k+half;val a=start+k;val vr=re[b]*c-im[b]*s;val vi=re[b]*s+im[b]*c;re[b]=re[a]-vr;im[b]=im[a]-vi;re[a]+=vr;im[a]+=vi};start+=length};length*=2}
  val bands=DoubleArray(64);var flux=0.0;var weighted=0.0;var total=0.0
  for(i in bands.indices){val low=max(1,(30*600.0.pow(i/64.0)*n/rate).toInt());val high=min(n/2,max(low+1,(30*600.0.pow((i+1)/64.0)*n/rate).toInt()));var level=0.0;for(k in low until high)level=max(level,sqrt(re[k]*re[k]+im[k]*im[k])/n);level=(20*log10(max(.00001,level))+70)/55;bands[i]=level.coerceIn(0.0,1.0);flux+=max(0.0,bands[i]-previous[i]);previous[i]=(previous[i]*.65+bands[i]*.35).toFloat();weighted+=bands[i]*i/63;total+=bands[i]}
  flux/=64;val now=System.currentTimeMillis();val beat=flux>max(.018,beatAverage*1.7)&&now-lastBeat>240;beatAverage+=(flux-beatAverage)*.08;if(beat){lastBeat=now;beatCount++}
  fun average(a:Int,b:Int)=bands.sliceArray(a..b).average()
  val wave=JSONArray();for(i in 0 until 256)wave.put(((x[i*n/256]+1)*127.5).toInt().coerceIn(0,255))
  val spectrum=JSONArray();bands.forEach{spectrum.put((it*255).toInt())}
  val rms=sqrt(x.sumOf{it.toDouble()*it}/n)
  features=JSONObject().put("sequence",++featureSequence).put("capturedAt",android.os.SystemClock.elapsedRealtime()).put("bass",average(0,19)).put("mid",average(20,42)).put("treble",average(43,63)).put("rms",rms).put("peak",x.maxOf{abs(it)}).put("energy",total/64).put("centroid",if(total>0)weighted/total else 0).put("beat",if(beat)1 else 0).put("beatCount",beatCount).put("onset",min(1.0,flux*10)).put("bands",spectrum).put("waveform",wave)
 }
 override fun onGetSession(info:MediaSession.ControllerInfo):MediaSession?=session
 override fun onDestroy(){main.removeCallbacks(checkpoint);persist();worker.shutdownNow();player.release();session?.release();instance=null;super.onDestroy()}
}


