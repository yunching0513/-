use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

/// 前端每秒同步剩餘時間到選單列（空字串＝清除）
#[tauri::command]
fn tray_title(app: tauri::AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id("pomodoro-tray") {
        let _ = tray.set_title(if title.is_empty() { None } else { Some(title) });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![tray_title])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "顯示蕃茄鐘", true, None::<&str>)?;
            let toggle = MenuItem::with_id(app, "toggle", "開始／暫停", true, None::<&str>)?;
            let skip = MenuItem::with_id(app, "skip", "跳過這一段", true, None::<&str>)?;
            let reset = MenuItem::with_id(app, "reset", "重設", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "結束蕃茄鐘", true, Some("CmdOrCtrl+Q"))?;
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

            TrayIconBuilder::with_id("pomodoro-tray")
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
        })
        .on_window_event(|window, event| {
            // 關閉視窗＝隱藏，計時在選單列繼續走
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // 點 Dock 圖示重新顯示視窗
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            if let Some(win) = app_handle.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app_handle, &event);
    });
}
