#[cfg(desktop)]
use tauri::Manager;

#[cfg(desktop)]
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter,
};

/// 前端每秒同步剩餘時間到選單列（空字串＝清除）。行動平台沒有選單列，為 no-op。
#[tauri::command]
fn tray_title(app: tauri::AppHandle, title: String) {
    #[cfg(desktop)]
    if let Some(tray) = app.tray_by_id("flowmato-tray") {
        let _ = tray.set_title(if title.is_empty() { None } else { Some(title) });
    }
    #[cfg(not(desktop))]
    let _ = (app, title);
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "顯示 Flowmato", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "開始／暫停", true, None::<&str>)?;
    let skip = MenuItem::with_id(app, "skip", "跳過這一段", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, "reset", "重設", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "結束 Flowmato", true, Some("CmdOrCtrl+Q"))?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &PredefinedMenuItem::separator(app)?,
            &toggle,
            &skip,
            &reset,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("flowmato-tray")
        .icon(Image::from_bytes(include_bytes!("../icons/tray-icon@2x.png"))?)
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => app.exit(0),
            "toggle" | "skip" | "reset" => {
                let _ = app.emit("tray-command", event.id.as_ref());
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![tray_title])
        .setup(|_app| {
            #[cfg(desktop)]
            setup_tray(_app)?;
            Ok(())
        });

    // 桌面才有「關閉視窗＝收進選單列」的概念；行動平台由系統管理生命週期
    #[cfg(desktop)]
    let builder = builder.on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window.hide();
        }
    });

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {
        // 點 Dock 圖示重新顯示視窗
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = _event {
            if let Some(win) = _app_handle.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    });
}
