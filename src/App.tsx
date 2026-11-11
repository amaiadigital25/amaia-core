import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Asistir24CRM from "./modules/asistir24/crm/Asistir24CRM";
import CotizadorAsistir24 from "./modules/asistir24/CotizadorAsistir24";

type ModuleName =
  | "Android"
  | "WhatsApp"
  | "Cotizador"
  | "CRM"
  | "Asistir24 CRM"
  | "Monitor";

type Panel = {
  id: number;
  module: ModuleName;
};

type AndroidDevice = {
  id: string;
  connected: boolean;
  state: string;
  model: string;
  android_version: string;
  whatsapp_installed: boolean;
};


const modules: ModuleName[] = [
  "Android",
  "WhatsApp",
  "Cotizador",
  "CRM",
  "Asistir24 CRM",
  "Monitor",
];

const moduleIcons: Record<ModuleName, string> = {
  Android: "▣",
  WhatsApp: "◉",
  Cotizador: "⌁",
  CRM: "▤",
  "Asistir24 CRM": "🚗",
  Monitor: "◌",
};

function App() {
  const [panels, setPanels] = useState<Panel[]>([
    { id: 1, module: "WhatsApp" },
    { id: 2, module: "Cotizador" },
    { id: 3, module: "Asistir24 CRM" },
  ]);

  const [workspace, setWorkspace] =
    useState("Operaciones");

  const [androidDevices, setAndroidDevices] =
    useState<AndroidDevice[]>([]);

  const [androidLoading, setAndroidLoading] =
    useState(false);

  const [androidError, setAndroidError] =
    useState("");

  const [whatsappConnecting, setWhatsappConnecting] =
    useState(false);

  const [whatsappMessage, setWhatsappMessage] =
    useState("");

  const [whatsappScreen, setWhatsappScreen] =
    useState("");
  const [whatsappScreenError, setWhatsappScreenError] =
    useState("");











  useEffect(() => {
    if (!panels.some((panel) => panel.module === "WhatsApp")) {
      return;
    }

    let active = true;
    let busy = false;

    const captureScreen = async () => {
      if (busy) return;
      busy = true;

      try {
        const image = await invoke<string>("get_whatsapp_screen");
        if (active) {
          setWhatsappScreen(image);
          setWhatsappScreenError("");
        }
      } catch (error) {
        if (active) {
          setWhatsappScreenError(
            error instanceof Error ? error.message : String(error)
          );
        }
      } finally {
        busy = false;
      }
    };

    void captureScreen();
    const interval = window.setInterval(() => {
      void captureScreen();
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [panels]);

  const cargarAndroidDevices = async () => {
    setAndroidLoading(true);
    setAndroidError("");

    try {
      const devices =
        await invoke<AndroidDevice[]>(
          "get_android_devices"
        );

      setAndroidDevices(devices);
    } catch (error) {
      setAndroidError(
        error instanceof Error
          ? error.message
          : String(error)
      );
    } finally {
      setAndroidLoading(false);
    }
  };

  useEffect(() => {
    cargarAndroidDevices();

    const interval = window.setInterval(() => {
      cargarAndroidDevices();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const conectarAndroidWhatsApp =
    async () => {
      setWhatsappConnecting(true);
      setWhatsappMessage("");
      setAndroidError("");

      try {
        const resultado =
          await invoke<string>(
            "connect_android_whatsapp"
          );

        setWhatsappMessage(resultado);

        await cargarAndroidDevices();
      } catch (error) {
        setAndroidError(
          error instanceof Error
            ? error.message
            : String(error)
        );
      } finally {
        setWhatsappConnecting(false);
      }
    };

  const changePanelCount = (
    count: number
  ) => {
    const defaults: ModuleName[] = [
      "WhatsApp",
      "Cotizador",
      "Monitor",
    ];

    const nextPanels = Array.from(
      { length: count },
      (_, index) => ({
        id: index + 1,
        module:
          panels[index]?.module ??
          defaults[index] ??
          "Android",
      })
    );

    setPanels(nextPanels);
  };

  const changeModule = (
    panelId: number,
    module: ModuleName
  ) => {
    setPanels((current) =>
      current.map((panel) =>
        panel.id === panelId
          ? { ...panel, module }
          : panel
      )
    );
  };



  const android1 =
    androidDevices.find(
      (device) =>
        device.id === "emulator-5554"
    );

  const android2 =
    androidDevices.find(
      (device) =>
        device.id === "emulator-5556"
    );

  const renderAndroidDevice = (
    device: AndroidDevice | undefined,
    numero: number
  ) => {
    if (!device) {
      return (
        <div className="quote-box">
          <div className="status-large pending-status">
            <span className="status-dot pending-dot" />
            DESCONECTADO
          </div>

          <h4>
            📱 Android {numero}
          </h4>

          <p>
            emulator-
            {numero === 1
              ? "5554"
              : "5556"}
          </p>

          <div className="service-state">
            <span>ADB</span>
            <strong>
              🔴 Desconectado
            </strong>
          </div>

          <div className="service-state">
            <span>WhatsApp</span>
            <strong>
              ⚪ No disponible
            </strong>
          </div>
        </div>
      );
    }

    return (
      <div className="quote-box">
        <div className="status-large">
          <span className="status-dot" />
          CONECTADO
        </div>

        <h4>
          📱 Android {numero}
        </h4>

        <p>{device.id}</p>

        <div className="info-grid">
          <div>
            <span>MODELO</span>

            <strong>
              {device.model ||
                "Desconocido"}
            </strong>
          </div>

          <div>
            <span>ANDROID</span>

            <strong>
              {device.android_version ||
                "Desconocido"}
            </strong>
          </div>

          <div>
            <span>ADB</span>

            <strong>
              {device.connected
                ? "🟢"
                : "🔴"}
            </strong>
          </div>

          <div>
            <span>WHATSAPP</span>

            <strong>
              {device.whatsapp_installed
                ? "🟢"
                : "🔴"}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <h1>AMAIA</h1>
            <span>CORE</span>
          </div>
        </div>

        <div className="sidebar-label">
          MÓDULOS
        </div>

        <nav>
          {modules.map((module) => (
            <button
              key={module}
              className="nav-item"
              onClick={() => {
                const target =
                  panels[0]?.id ?? 1;

                changeModule(
                  target,
                  module
                );
              }}
            >
              <span>
                {moduleIcons[module]}
              </span>

              {module}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <span>⚙</span>
            Sistema
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              AMAIA DIGITAL
            </p>

            <h2>Amaia Core</h2>
          </div>

          <div className="workspace-controls">
            <span className="workspace-label">
              WORKSPACE
            </span>

            <select
              value={workspace}
              onChange={(event) =>
                setWorkspace(
                  event.target.value
                )
              }
            >
              <option>
                Operaciones
              </option>

              <option>
                Desarrollo
              </option>

              <option>
                Comercial
              </option>
            </select>
          </div>
        </header>

        <section className="workspace-toolbar">
          <div>
            <p className="eyebrow">
              ESPACIO DE TRABAJO
            </p>

            <h3>
              Panel operativo
            </h3>
          </div>

          <div className="layout-controls">
            <span>VISTA</span>

            <button
              className={
                panels.length === 1
                  ? "layout active"
                  : "layout"
              }
              onClick={() =>
                changePanelCount(1)
              }
            >
              ▬
            </button>

            <button
              className={
                panels.length === 2
                  ? "layout active"
                  : "layout"
              }
              onClick={() =>
                changePanelCount(2)
              }
            >
              ▬ ▬
            </button>

            <button
              className={
                panels.length === 3
                  ? "layout active"
                  : "layout"
              }
              onClick={() =>
                changePanelCount(3)
              }
            >
              ▬ ▬ ▬
            </button>
          </div>
        </section>

        <section
          className={`workspace workspace-${panels.length}`}
        >
          {panels.map((panel) => (
            <article
              className="panel"
              key={panel.id}
            >
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">
                    {
                      moduleIcons[
                        panel.module
                      ]
                    }
                  </span>

                  <strong>
                    {panel.module}
                  </strong>
                </div>

                <select
                  value={panel.module}
                  onChange={(event) =>
                    changeModule(
                      panel.id,
                      event.target
                        .value as ModuleName
                    )
                  }
                >
                  {modules.map(
                    (module) => (
                      <option
                        key={module}
                        value={module}
                      >
                        {module}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="panel-content">

                {panel.module ===
                  "Android" && (
                  <>
                    <div className="status-large">
                      <span className="status-dot" />

                      {androidLoading
                        ? "CONSULTANDO ADB"
                        : androidDevices.length >
                          0
                        ? "ANDROID ACTIVO"
                        : "SIN ANDROID"}
                    </div>

                    <h4>
                      Android Core
                    </h4>

                    <p>
                      Control centralizado de
                      los dispositivos Android
                    </p>

                    {androidError && (
                      <div className="service-state">
                        <span>
                          Error
                        </span>

                        <strong>
                          🔴{" "}
                          {androidError}
                        </strong>
                      </div>
                    )}

                    {renderAndroidDevice(
                      android1,
                      1
                    )}

                    {renderAndroidDevice(
                      android2,
                      2
                    )}

                    <button
                      onClick={
                        conectarAndroidWhatsApp
                      }
                      disabled={
                        whatsappConnecting
                      }
                    >
                      {whatsappConnecting
                        ? "CONECTANDO..."
                        : "🚀 CONECTAR ANDROID + WHATSAPP"}
                    </button>

                    {whatsappMessage && (
                      <div className="service-state">
                        <span>
                          Resultado
                        </span>

                        <strong>
                          🟢{" "}
                          {whatsappMessage}
                        </strong>
                      </div>
                    )}
                  </>
                )}

                {panel.module ===
                  "WhatsApp" && (
                  <>
                    <div className="status-large pending-status">
                      <span className="status-dot pending-dot" />

                      {whatsappConnecting
                        ? "CONECTANDO"
                        : "PREPARADO"}
                    </div>

                    <h4>
                      WhatsApp
                    </h4>

                    <p>
                      Comunicación
                      centralizada mediante
                      Android
                    </p>

                    <section className="whatsapp-screen-view">
                      <div className="whatsapp-screen-heading">
                        <strong>Pantalla Android · WhatsApp</strong>
                        <span>
                          {whatsappScreen
                            ? "Vista actualizada"
                            : "Esperando Android"}
                        </span>
                      </div>

                      {whatsappScreen ? (
                        <img
                          className="whatsapp-screen-image"
                          src={whatsappScreen}
                          alt="WhatsApp Android. Hacé clic para interactuar."
                          onClick={async (event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            if (!rect.width || !rect.height) return;
                            const x = Math.max(0, Math.min(1079,
                              Math.round((event.clientX - rect.left) * 1080 / rect.width)
                            ));
                            const y = Math.max(0, Math.min(2399,
                              Math.round((event.clientY - rect.top) * 2400 / rect.height)
                            ));
                            try {
                              await invoke("tap_whatsapp_screen", { x, y });
                              setWhatsappScreenError("");
                            } catch (error) {
                              setWhatsappScreenError(
                                error instanceof Error ? error.message : String(error)
                              );
                            }
                          }}
                        />
                      ) : (
                        <div className="whatsapp-screen-placeholder">
                          {whatsappScreenError
                            ? "No se pudo obtener la pantalla"
                            : "Conectá Android para mostrar WhatsApp"}
                        </div>
                      )}

                      {whatsappScreenError && (
                        <p className="whatsapp-screen-error">
                          {whatsappScreenError}
                        </p>
                      )}
                    </section>

                    <div className="service-state">
                      <span>
                        Android 1
                      </span>

                      <strong>
                        {android1
                          ?.whatsapp_installed
                          ? "🟢 WhatsApp instalado"
                          : "🔴 No disponible"}
                      </strong>
                    </div>

                    <div className="service-state">
                      <span>
                        Android 2
                      </span>

                      <strong>
                        {android2
                          ?.whatsapp_installed
                          ? "🟢 WhatsApp instalado"
                          : "🔴 No disponible"}
                      </strong>
                    </div>

                    <button
                      onClick={
                        conectarAndroidWhatsApp
                      }
                      disabled={
                        whatsappConnecting
                      }
                    >
                      {whatsappConnecting
                        ? "CONECTANDO..."
                        : "🚀 CONECTAR WHATSAPP"}
                    </button>

                    {whatsappMessage && (
                      <div className="service-state">
                        <span>
                          Estado
                        </span>

                        <strong>
                          🟢{" "}
                          {whatsappMessage}
                        </strong>
                      </div>
                    )}
                  </>
                )}

                {panel.module === "Cotizador" && (
                  <CotizadorAsistir24 />
                )}

                {panel.module ===
                  "CRM" && (
                  <>
                    <div className="status-large">
                      <span className="status-dot" />
                      PREPARADO
                    </div>

                    <h4>
                      AmaiaDigital CRM
                    </h4>

                    <p>
                      Gestión comercial y
                      prospectos
                    </p>

                    <div className="info-grid">
                      <div>
                        <span>
                          PROSPECTOS
                        </span>

                        <strong>
                          100
                        </strong>
                      </div>

                      <div>
                        <span>
                          ESTADO
                        </span>

                        <strong>
                          Listo
                        </strong>
                      </div>
                    </div>
                  </>
                )}

                {panel.module ===
                  "Asistir24 CRM" && (
                  <Asistir24CRM />
                )}

                {panel.module ===
                  "Monitor" && (
                  <>
                    <div className="status-large">
                      <span className="status-dot" />
                      ACTIVO
                    </div>

                    <h4>
                      Monitor
                    </h4>

                    <p>
                      Supervisión del
                      ecosistema Amaia
                    </p>

                    <div className="monitor-list">
                      <div>
                        <span>
                          Android 1
                        </span>

                        <strong>
                          {android1
                            ? "🟢"
                            : "🔴"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Android 2
                        </span>

                        <strong>
                          {android2
                            ? "🟢"
                            : "🔴"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          WhatsApp
                        </span>

                        <strong>
                          {android1
                            ?.whatsapp_installed &&
                          android2
                            ?.whatsapp_installed
                            ? "🟢"
                            : "🟡"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Cotizador
                        </span>

                        <strong>
                          🟢
                        </strong>
                      </div>

                      <div>
                        <span>
                          CRM AmaiaDigital
                        </span>

                        <strong>
                          🟢
                        </strong>
                      </div>

                      <div>
                        <span>
                          Asistir24 CRM
                        </span>

                        <strong>
                          🟢
                        </strong>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
