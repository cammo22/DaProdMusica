package io.github.cammo22.music

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/** Downloads only the two explicitly supported apps and never installs silently. */
class UpdateController(private val activity:Activity){
 private data class Target(val id:String,val title:String,val packageName:String,val fileName:String,val certificate:String?=null)
 private val downloads=activity.getSystemService(DownloadManager::class.java)
 private fun target(id:String)=when(id){
  "music"->Target("music","DaProd Musica",activity.packageName,"daprod-update.apk")
  "gallery"->Target("gallery","DapGalleria",GALLERY_PACKAGE,"dapgalleria-update.apk",GALLERY_CERTIFICATE)
  else->throw IllegalArgumentException("App non supportata.")
 }
 private fun prefs(t:Target)=activity.getSharedPreferences(if(t.id=="music")"dap-update" else "dap-gallery-update",Context.MODE_PRIVATE)
 private fun file(t:Target)=File(activity.getExternalFilesDir("updates"),t.fileName)
 companion object{
  internal const val GALLERY_PACKAGE="com.dapprod.dapgalleria"
  // Verified against the certificate embedded in the official v2.1.1 release APK.
  internal const val GALLERY_CERTIFICATE="9e99432c950d84368b73853cb31958c190f67eee7bf38346e710a0b792393901"
  private val worker=Executors.newSingleThreadExecutor()
  private val verified=ConcurrentHashMap<String,String>()
  internal fun validSource(url:String,digest:String,target:String="music"):Boolean{
   val uri=Uri.parse(url)
   if(uri.scheme!="https"||uri.host!="github.com"||uri.port!=-1||uri.userInfo!=null||uri.encodedPath!=uri.path||uri.query!=null||uri.fragment!=null||!Regex("sha256:[a-fA-F0-9]{64}").matches(digest))return false
   val path=uri.path?:return false
   val match=when(target){
    "music"->Regex("/cammo22/DaProdMusica/releases/download/v([0-9]+[.][0-9]+[.][0-9]+)/DaProdMusica-([0-9]+[.][0-9]+[.][0-9]+)-Android-arm64[.]apk").matchEntire(path)
    "gallery"->Regex("/cammo22/DapGalleria/releases/download/v([0-9]+[.][0-9]+[.][0-9]+)/DapGalleria-v([0-9]+[.][0-9]+[.][0-9]+)[.]apk").matchEntire(path)
    else->null
   }?:return false
   return match.groupValues[1]==match.groupValues[2]
  }
 }
 fun execute(op:String,url:String,digest:String,done:(JSONObject)->Unit,fail:(String)->Unit,target:String="music"){
  worker.execute job@{
   try{
    val t=target(target);val pref=prefs(t);val apkFile=file(t)
    val state=when(op){
     "updateDownload"->{
      require(validSource(url,digest,t.id)){"Aggiornamento non valido."}
      val old=pref.getLong("id",-1);if(old!=-1L)downloads.remove(old)
      apkFile.parentFile?.mkdirs();apkFile.delete();verified.remove(t.id)
      val request=DownloadManager.Request(Uri.parse(url)).setTitle(t.title)
       .setDescription("Download nell’app").setMimeType("application/vnd.android.package-archive")
       .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
       .setDestinationInExternalFilesDir(activity,"updates",t.fileName)
      val id=downloads.enqueue(request)
      pref.edit().putLong("id",id).putString("digest",digest.removePrefix("sha256:").lowercase()).remove("verifiedVersion").apply()
      JSONObject().put("status","downloading").put("progress",0)
     }
     "updateInstall"->{verify(t);activity.runOnUiThread{
      try{
       if(!activity.packageManager.canRequestPackageInstalls()){
        activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.packageName)))
        done(JSONObject().put("status","permission"))
       }else{
        val uri=FileProvider.getUriForFile(activity,activity.packageName+".updates",apkFile)
        activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        done(JSONObject().put("status","installer"))
       }
      }catch(e:Exception){fail(e.message?:"Impossibile aprire l’installazione.")}
     };return@job}
     "updateOpen"->{activity.runOnUiThread{
      try{val launch=activity.packageManager.getLaunchIntentForPackage(t.packageName)?:throw IllegalStateException("App non installata.");activity.startActivity(launch);done(JSONObject().put("status","opened"))}
      catch(e:Exception){fail(e.message?:"Impossibile aprire l’app.")}
     };return@job}
     "updateState"->state(t)
     else->throw IllegalArgumentException("Comando aggiornamento non valido.")
    }
    activity.runOnUiThread{done(state)}
   }catch(e:Exception){activity.runOnUiThread{fail(e.message?:"Aggiornamento non disponibile.")}}
  }
 }
 @Suppress("DEPRECATION")
 private fun installed(t:Target,flags:Int=0):PackageInfo?=try{activity.packageManager.getPackageInfo(t.packageName,flags)}catch(_:PackageManager.NameNotFoundException){null}
 @Suppress("DEPRECATION")
 private fun version(info:PackageInfo)=if(Build.VERSION.SDK_INT>=28)info.longVersionCode else info.versionCode.toLong()
 private fun idle(t:Target,current:PackageInfo?):JSONObject=JSONObject().put("status",if(t.id=="gallery"&&current!=null)"installed" else "idle").put("installed",current!=null).put("installedVersion",current?.versionName?:"")
 private fun state(t:Target):JSONObject{
  val pref=prefs(t);val apkFile=file(t);val current=installed(t)
  val downloadedVersion=pref.getLong("verifiedVersion",0)
  if(downloadedVersion>0&&current!=null&&downloadedVersion<=version(current)){
   val old=pref.getLong("id",-1);if(old!=-1L)downloads.remove(old)
   pref.edit().clear().apply();apkFile.delete();verified.remove(t.id)
   return idle(t,current)
  }
  val id=pref.getLong("id",-1);if(id==-1L)return idle(t,current)
  downloads.query(DownloadManager.Query().setFilterById(id)).use{cursor->
   if(!cursor.moveToFirst())return idle(t,current)
   val status=cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
   if(status==DownloadManager.STATUS_FAILED)return JSONObject().put("status","failed").put("reason",cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)))
   if(status==DownloadManager.STATUS_SUCCESSFUL){verify(t);return JSONObject().put("status","ready").put("progress",100)}
   val size=cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
   val bytes=cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
   return JSONObject().put("status",if(status==DownloadManager.STATUS_PAUSED)"waiting" else "downloading").put("progress",if(size>0)bytes*100/size else 0)
  }
 }
 @Suppress("DEPRECATION")
 private fun signatures(info:PackageInfo)=if(Build.VERSION.SDK_INT>=28)info.signingInfo?.apkContentsSigners else info.signatures
 @Suppress("DEPRECATION")
 private fun verify(t:Target){
  val apkFile=file(t);val pref=prefs(t)
  val identity=apkFile.absolutePath+":"+apkFile.length()+":"+apkFile.lastModified()+":"+pref.getString("digest","")
  if(verified[t.id]==identity)return
  require(apkFile.isFile){"Scarica prima l’aggiornamento."}
  val sha=MessageDigest.getInstance("SHA-256")
  apkFile.inputStream().buffered().use{input->val buffer=ByteArray(65536);while(true){val count=input.read(buffer);if(count<0)break;sha.update(buffer,0,count)}}
  val actual=sha.digest().joinToString(""){"%02x".format(it.toInt() and 255)}
  require(actual==pref.getString("digest","")){"Download danneggiato. Scarica di nuovo."}
  val flags=if(Build.VERSION.SDK_INT>=28)PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
  val apk=activity.packageManager.getPackageArchiveInfo(apkFile.absolutePath,flags)?:throw IllegalArgumentException("APK non valido.")
  require(apk.packageName==t.packageName){"Pacchetto diverso da ${t.title}."}
  val current=installed(t,flags)
  require(current==null||version(apk)>version(current)){"La versione scaricata è già installata."}
  val signature=signatures(apk)
  require(!signature.isNullOrEmpty()){"Firma dell’aggiornamento non riconosciuta."}
  if(t.certificate!=null){
   val hashes=signature.map{MessageDigest.getInstance("SHA-256").digest(it.toByteArray()).joinToString(""){b->"%02x".format(b.toInt() and 255)}}
   require(hashes.size==1&&hashes.single()==t.certificate){"Firma di ${t.title} non riconosciuta."}
  }
  if(current!=null){
   val local=signatures(current)
   require(!local.isNullOrEmpty()&&signature.size==local.size&&signature.toSet()==local.toSet()){"La firma non corrisponde all’app installata."}
  }else require(t.id=="gallery"){"App installata non trovata."}
  pref.edit().putLong("verifiedVersion",version(apk)).apply();verified[t.id]=identity
 }
}

// A distinct manifest component prevents merging into Tauri's own file provider.
class UpdateFileProvider:FileProvider()
