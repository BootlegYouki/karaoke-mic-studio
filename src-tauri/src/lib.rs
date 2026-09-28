pub mod audio;

use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

use audio::{AudioController, AudioSettings, AudioStatus};

struct AppState {
    audio: Mutex<AudioController>,
}

#[tauri::command]
fn start_mic(
    device: Option<String>,
    settings: AudioSettings,
    state: State<'_, AppState>,
) -> Result<AudioStatus, String> {
    let mut controller = state.audio.lock().map_err(|e| e.to_string())?;
    controller.start(device, settings)?;
    Ok(controller.get_status())
}

#[tauri::command]
fn stop_mic(state: State<'_, AppState>) -> Result<AudioStatus, String> {
    let mut controller = state.audio.lock().map_err(|e| e.to_string())?;
    controller.stop();
    Ok(controller.get_status())
}

#[tauri::command]
fn update_settings(settings: AudioSettings, state: State<'_, AppState>) -> Result<(), String> {
    let mut controller = state.audio.lock().map_err(|e| e.to_string())?;
    controller.update_settings(settings);
    Ok(())
}

#[tauri::command]
fn get_audio_devices(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let controller = state.audio.lock().map_err(|e| e.to_string())?;
    Ok(controller.get_input_devices())
}

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> Result<AudioStatus, String> {
    let controller = state.audio.lock().map_err(|e| e.to_string())?;
    Ok(controller.get_status())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            audio: Mutex::new(AudioController::new()),
        })
        .invoke_handler(tauri::generate_handler![
            start_mic,
            stop_mic,
            update_settings,
            get_audio_devices,
            get_status,
        ])
        .setup(|app| {
            let toggle_i =
                MenuItem::with_id(app, "toggle", "Show / Hide Karaoke Studio", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Minimize to system tray so singing continues in background
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
