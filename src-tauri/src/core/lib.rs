mod core;

use core::{
    get_whatsapp_screen,
    tap_whatsapp_screen,
    connect_android_whatsapp,
    get_android_devices,
    get_android_status,
    start_android,
};

#[tauri::command]
fn calcular_cotizacion(
    tipo_servicio: String,
    total_km: f64,
    km_base_origen: f64,
    fecha: Option<String>,
    es_feriado: bool,
) -> Result<serde_json::Value, String> {
    let script =
        std::path::Path::new(
            "../auto-claims/calcular-cotizacion.cjs",
        );

    if !script.exists() {
        return Err(format!(
            "No se encontró el motor de cotización: {}",
            script.display()
        ));
    }

    let fecha_arg =
        fecha.unwrap_or_default();

    let output =
        std::process::Command::new("node")
            .arg(script)
            .arg(&tipo_servicio)
            .arg(total_km.to_string())
            .arg(km_base_origen.to_string())
            .arg(&fecha_arg)
            .arg(
                if es_feriado {
                    "true"
                } else {
                    "false"
                },
            )
            .output()
            .map_err(|e| {
                format!(
                    "No se pudo ejecutar el motor: {}",
                    e
                )
            })?;

    if !output.status.success() {
        let error =
            String::from_utf8_lossy(
                &output.stderr,
            )
            .trim()
            .to_string();

        return Err(
            if error.is_empty() {
                "El motor de cotización devolvió un error"
                    .to_string()
            } else {
                error
            },
        );
    }

    let resultado:
        serde_json::Value =
        serde_json::from_slice(
            &output.stdout,
        )
        .map_err(|e| {
            format!(
                "Respuesta inválida del motor: {}",
                e
            )
        })?;

    Ok(resultado)
}

#[cfg_attr(
    mobile,
    tauri::mobile_entry_point
)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_opener::init(),
        )
        .invoke_handler(
            tauri::generate_handler![
                tap_whatsapp_screen,
                get_whatsapp_screen,
                get_android_status,
                get_android_devices,
                start_android,
                connect_android_whatsapp,
                calcular_cotizacion
            ],
        )
        .run(
            tauri::generate_context!(),
        )
        .expect(
            "error while running Amaia Core",
        );
}
