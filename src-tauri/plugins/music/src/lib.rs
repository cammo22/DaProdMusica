#[cfg(target_os="android")]
use tauri::Manager;
use tauri::{plugin::{Builder,TauriPlugin},Runtime};
use serde_json::{Value,json};
#[cfg(target_os="android")]
struct Native<R:Runtime>(tauri::plugin::PluginHandle<R>);
#[tauri::command]
async fn execute<R:Runtime>(app:tauri::AppHandle<R>,payload:Value)->Result<Value,String>{
 #[cfg(target_os="android")]
 {app.state::<Native<R>>().0.run_mobile_plugin("execute",payload).map_err(|e|e.to_string())}
 #[cfg(not(target_os="android"))]
 {let _=(app,payload);Ok(json!({"native":false}))}
}
pub fn init<R:Runtime>()->TauriPlugin<R>{
 Builder::new("music").invoke_handler(tauri::generate_handler![execute]).setup(|app,api|{
  #[cfg(target_os="android")]
  {app.manage(Native(api.register_android_plugin("io.github.cammo22.music","MusicPlugin")?));}
  #[cfg(not(target_os="android"))]
  {let _=(app,api);}
  Ok(())
 }).build()
}

