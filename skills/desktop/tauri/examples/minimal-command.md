# Minimal command, registration, and frontend call

A minimal command, its registration, and a frontend call:

```rust
// src-tauri/src/lib.rs
use tauri::{AppHandle, Manager};

#[tauri::command]
fn greet(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.len() > 100 {
        return Err("name must be 1-100 characters".to_string());
    }
    Ok(format!("Hello, {name}!"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```ts
// Frontend (TypeScript)
import { invoke } from "@tauri-apps/api/core";

const greeting = await invoke<string>("greet", { name: "Ada" });
```
