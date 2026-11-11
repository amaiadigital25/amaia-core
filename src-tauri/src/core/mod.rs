use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

#[derive(serde::Serialize, Clone)]
pub struct AndroidDevice {
    pub id: String,
    pub connected: bool,
    pub state: String,
    pub model: String,
    pub android_version: String,
    pub whatsapp_installed: bool,
}

#[derive(serde::Serialize)]
pub struct AndroidStatus {
    pub connected: bool,
    pub device: String,
    pub android_version: String,
    pub model: String,
}

fn adb_command(
    device: Option<&str>,
    args: &[&str],
) -> Result<std::process::Output, String> {
    let mut command = Command::new("adb");

    if let Some(device_id) = device {
        command.args(["-s", device_id]);
    }

    command.args(args);

    command
        .output()
        .map_err(|error| {
            format!(
                "No se pudo ejecutar ADB: {}",
                error
            )
        })
}

fn get_property(
    device: &str,
    property: &str,
) -> String {
    adb_command(
        Some(device),
        &[
            "shell",
            "getprop",
            property,
        ],
    )
    .map(|output| {
        String::from_utf8_lossy(
            &output.stdout,
        )
        .trim()
        .to_string()
    })
    .unwrap_or_default()
}

fn whatsapp_installed(
    device: &str,
) -> bool {
    adb_command(
        Some(device),
        [
            "shell",
            "pm",
            "path",
            "com.whatsapp",
        ]
        .as_ref(),
    )
    .map(|output| {
        output.status.success()
            && !String::from_utf8_lossy(
                &output.stdout,
            )
            .trim()
            .is_empty()
    })
    .unwrap_or(false)
}

fn get_connected_devices() -> Vec<String> {
    let output =
        match adb_command(
            None,
            &["devices"],
        ) {
            Ok(output) => output,
            Err(_) => {
                return Vec::new()
            }
        };

    let text =
        String::from_utf8_lossy(
            &output.stdout,
        );

    text.lines()
        .skip(1)
        .filter_map(|line| {
            let mut parts =
                line.split_whitespace();

            let device =
                parts.next()?;

            let state =
                parts.next()?;

            if state == "device" {
                Some(
                    device.to_string()
                )
            } else {
                None
            }
        })
        .collect()
}

fn build_device(
    device: String,
) -> AndroidDevice {
    let model =
        get_property(
            &device,
            "ro.product.model",
        );

    let android_version =
        get_property(
            &device,
            "ro.build.version.release",
        );

    AndroidDevice {
        id: device.clone(),
        connected: true,
        state: "device".to_string(),
        model,
        android_version,
        whatsapp_installed:
            whatsapp_installed(
                &device,
            ),
    }
}

#[tauri::command]
pub fn get_android_devices()
    -> Vec<AndroidDevice>
{
    get_connected_devices()
        .into_iter()
        .map(build_device)
        .collect()
}

#[tauri::command]
pub fn get_android_status()
    -> AndroidStatus
{
    let devices =
        get_android_devices();

    if let Some(device) =
        devices.first()
    {
        return AndroidStatus {
            connected: true,
            device: device.id.clone(),
            android_version:
                device
                    .android_version
                    .clone(),
            model: device.model.clone(),
        };
    }

    AndroidStatus {
        connected: false,
        device: String::new(),
        android_version: String::new(),
        model: String::new(),
    }
}

fn emulator_running(
    device_id: &str,
) -> bool {
    get_connected_devices()
        .iter()
        .any(|device| {
            device == device_id
        })
}

fn start_emulator(
    avd: &str,
) -> Result<(), String> {
    Command::new("emulator")
        .args([
            "-avd",
            avd,
            "-no-window",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|error| {
            format!(
                "No se pudo iniciar {}: {}",
                avd,
                error
            )
        })?;

    Ok(())
}

fn wait_for_device(
    device_id: &str,
    timeout_seconds: u64,
) -> bool {
    for _ in 0..timeout_seconds {
        if emulator_running(
            device_id,
        ) {
            return true;
        }

        thread::sleep(
            Duration::from_secs(1),
        );
    }

    false
}

fn open_whatsapp(
    device_id: &str,
) -> Result<(), String> {
    let output =
        adb_command(
            Some(device_id),
            &[
                "shell",
                "monkey",
                "-p",
                "com.whatsapp",
                "1",
            ],
        )?;

    if !output.status.success() {
        let error =
            String::from_utf8_lossy(
                &output.stderr,
            )
            .trim()
            .to_string();

        return Err(
            if error.is_empty() {
                format!(
                    "No se pudo abrir WhatsApp en {}",
                    device_id
                )
            } else {
                format!(
                    "WhatsApp {}: {}",
                    device_id,
                    error
                )
            }
        );
    }

    Ok(())
}



#[tauri::command]
pub fn get_whatsapp_screen() -> Result<String, String> {
    let output = adb_command(
        Some("emulator-5554"),
        &["exec-out", "screencap", "-p"],
    )?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr)
            .trim()
            .to_string();

        return Err(if error.is_empty() {
            "Android no pudo capturar la pantalla".to_string()
        } else {
            format!("Error de captura Android: {}", error)
        });
    }

    if output.stdout.is_empty() {
        return Err("Android devolvió una captura vacía".to_string());
    }

    use base64::Engine as _;
    let encoded =
        base64::engine::general_purpose::STANDARD.encode(&output.stdout);

    Ok(format!("data:image/png;base64,{}", encoded))
}

#[tauri::command]
pub fn tap_whatsapp_screen(x: u32, y: u32) -> Result<String, String> {
    if x >= 1080 || y >= 2400 {
        return Err("Coordenadas fuera de la pantalla Android".to_string());
    }

    let output = adb_command(
        Some("emulator-5554"),
        &["shell", "input", "tap", &x.to_string(), &y.to_string()],
    )?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok("Toque enviado a Android".to_string())
}

#[tauri::command]
pub fn start_android() -> Result<String, String> {
    if emulator_running("emulator-5554") {
        return Ok("Android de emergencias ya está conectado".to_string());
    }

    start_emulator("amaia-core")?;

    if wait_for_device("emulator-5554", 60) {
        Ok("Android de emergencias iniciado en segundo plano".to_string())
    } else {
        Err("Android de emergencias no respondió dentro de 60 segundos".to_string())
    }
}

#[tauri::command]
pub fn connect_android_whatsapp() -> Result<String, String> {
    if !emulator_running("emulator-5554") {
        start_emulator("amaia-core")?;
    }

    if !wait_for_device("emulator-5554", 60) {
        return Err("El Android de emergencias no respondió dentro de 60 segundos".to_string());
    }

    open_whatsapp("emulator-5554")?;

    Ok("WhatsApp de emergencias abierto en Android único".to_string())
}

