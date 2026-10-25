package io.github.cammo22.music

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors

class UpdateController(private val activity:Activity){
 private val prefs=activity.getSharedPreferences("dap-update",Context.MODE_PRIVATE)
 private val downloads=activity.getSystemService(DownloadManager::class.java)
 private val file get()=File(activity.getExternalFilesDir("updates"),"daprod-update.apk")
 companion object{
  private val worker=Executors.newSingleThreadExecutor()
  @Volatile private var verifiedPath=""
  internal fun validSource(url:String,digest:String):Boolean{
   val uri=Uri.parse(url)
   return uri.scheme=="https"&&uri.host=="github.com"&&uri.port==-1&&uri.userInfo==null&&uri.encodedPath==uri.path&&uri.query==null&&uri.fragment==null&&
    Regex("/cammo22/DaProdMusica/releases/download/v[0-9]+[.][0-9]+[.][0-9]+/DaProdMusica-[0-9]+[.][0-9]+[.][0-9]+-Android-arm64[.]apk").matches(uri.path?:"")&&
    Regex("sha256:[a-fA-F0-9]{64}").matches(digest)&&
    uri.path?.substringAfter("/download/v")?.substringBefore("/")==uri.lastPathSegment?.removePrefix("DaProdMusica-")?.removeSuffix("-Android-arm64.apk")
  }
 }
 fun execute(op:String,url:String,digest:String,done:(JSONObject)->Unit,fail:(String)->Unit){
  // Downloads, hashes and signature checks never block the audio or Activity thread.
  worker.execute job@{
   try{
    val state=when(op){
     "updateDownload"->{
      require(validSource(url,digest)){"Aggiornamento non valido."}
      val old=prefs.getLong("id",-1);if(old!=-1L)downloads.remove(old)
      file.parentFile?.mkdirs();file.delete();verifiedPath=""
      val request=DownloadManager.Request(Uri.parse(url)).setTitle("DaProd Musica")
       .setDescription("Aggiornamento in download").setMimeType("application/vnd.android.package-archive")
       .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
       .setDestinationInExternalFilesDir(activity,"updates","daprod-update.apk")
      val id=downloads.enqueue(request)
      prefs.edit().putLong("id",id).putString("digest",digest.removePrefix("sha256:").lowercase()).apply()
      JSONObject().put("status","downloading").put("progress",0)
     }
     "updateInstall"->{verify();activity.runOnUiThread{
      try{
       if(!activity.packageManager.canRequestPackageInstalls()){
        activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.packageName)))
        done(JSONObject().put("status","permission"))
       }else{
        val uri=FileProvider.getUriForFile(activity,activity.packageName+".updates",file)
        activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        done(JSONObject().put("status","installer"))
       }
      }catch(e:Exception){fail(e.message?:"Impossibile aprire l’installazione.")}
     };return@job}
     "updateState"->state()
     else->throw IllegalArgumentException("Comando aggiornamento non valido.")
    }
    activity.runOnUiThread{done(state)}
   }catch(e:Exception){activity.runOnUiThread{fail(e.message?:"Aggiornamento non disponibile.")}}
  }
 }
 private fun state():JSONObject{
  val id=prefs.getLong("id",-1);if(id==-1L)return JSONObject().put("status","idle")
  downloads.query(DownloadManager.Query().setFilterById(id)).use{cursor->
   if(!cursor.moveToFirst())return JSONObject().put("status","idle")
   val status=cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
   if(status==DownloadManager.STATUS_FAILED)return JSONObject().put("status","failed").put("reason",cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)))
   if(status==DownloadManager.STATUS_SUCCESSFUL){verify();return JSONObject().put("status","ready").put("progress",100)}
   val size=cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
   val bytes=cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
   return JSONObject().put("status",if(status==DownloadManager.STATUS_PAUSED)"waiting" else "downloading").put("progress",if(size>0)bytes*100/size else 0)
  }
 }
 @Suppress("DEPRECATION")
 private fun verify(){
  val identity=file.absolutePath+":"+file.length()+":"+file.lastModified()
  if(verifiedPath==identity)return
  require(file.isFile){"Scarica prima l’aggiornamento."}
  val sha=MessageDigest.getInstance("SHA-256")
  file.inputStream().buffered().use{input->val buffer=ByteArray(65536);while(true){val count=input.read(buffer);if(count<0)break;sha.update(buffer,0,count)}}
  val actual=sha.digest().joinToString(""){"%02x".format(it.toInt() and 255)}
  require(actual==prefs.getString("digest","")){"Download danneggiato. Scarica di nuovo."}
  val flags=if(Build.VERSION.SDK_INT>=28)PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
  val apk=activity.packageManager.getPackageArchiveInfo(file.absolutePath,flags)?:throw IllegalArgumentException("APK non valido.")
  val installed=activity.packageManager.getPackageInfo(activity.packageName,flags)
  require(apk.packageName==activity.packageName){"Pacchetto diverso da DaProd Musica."}
  val apkCode=if(Build.VERSION.SDK_INT>=28)apk.longVersionCode else apk.versionCode.toLong()
  val currentCode=if(Build.VERSION.SDK_INT>=28)installed.longVersionCode else installed.versionCode.toLong()
  require(apkCode>currentCode){"La versione scaricata è già installata."}
  val signatures=if(Build.VERSION.SDK_INT>=28)apk.signingInfo?.apkContentsSigners else apk.signatures
  val local=if(Build.VERSION.SDK_INT>=28)installed.signingInfo?.apkContentsSigners else installed.signatures
  require(!signatures.isNullOrEmpty()&&!local.isNullOrEmpty()&&signatures.size==local.size&&signatures.toSet()==local.toSet()){"Firma dell’aggiornamento non riconosciuta."}
  verifiedPath=identity
 }
}
