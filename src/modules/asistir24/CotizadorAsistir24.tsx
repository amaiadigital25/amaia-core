import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type F = {
  baseId: string;
  modalidad: string;
  tipoServicio: string;
  tipoCliente: string;
  origen: string;
  destino: string;
  kmBaseOrigen: string;
  kmOrigenDestino: string;
  kmDestinoBase: string;
  empresa: string;
  numeroServicio: string;
  patente: string;
  asegurado: string;
  marca: string;
  modelo: string;
  color: string;
  fechaServicio: string;
  condicionServicio: string;
  transmision: string;
  especificaciones: string;
  personasTrasladar: string;
  siniestro: boolean;
  enCochera: boolean;
  poseeCarga: boolean;
  vehiculoRueda: boolean;
  tieneTrailer: boolean;
  requiereExtraccion: boolean;
  observaciones: string;
};

type Base = {
  id?: string | number;
  baseId?: string | number;
  nombre?: string;
  name?: string;
  localidad?: string;
  modalidad?: string;
};

const inicial: F = {
  baseId: "", modalidad: "AMBA_CABA",
  tipoServicio: "REMOLQUE", tipoCliente: "COMPANIA",
  origen: "", destino: "", kmBaseOrigen: "0",
  kmOrigenDestino: "0", kmDestinoBase: "0",
  empresa: "", numeroServicio: "", patente: "",
  asegurado: "", marca: "", modelo: "", color: "",
  fechaServicio: "", condicionServicio: "",
  transmision: "", especificaciones: "",
  personasTrasladar: "0", siniestro: false,
  enCochera: false, poseeCarga: false,
  vehiculoRueda: true, tieneTrailer: false,
  requiereExtraccion: false, observaciones: "",
};

const pesos = (v: unknown) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const idBase = (b: Base) => String(b.baseId ?? b.id ?? "");
const nombreBase = (b: Base) =>
  String(b.nombre ?? b.name ?? b.localidad ?? `Base ${idBase(b)}`);

export default function CotizadorAsistir24() {
  const [apiUrl, setApiUrl] = useState("https://asistir24plataforma-production.up.railway.app");
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [token, setToken] = useState("");
  const [bases, setBases] = useState<Base[]>([]);
  const [f, setF] = useState<F>(inicial);
  const [cotizacionLocal, setCotizacionLocal] = useState<Record<string, unknown> | null>(null);
  const [respuestaServidor, setRespuestaServidor] = useState<unknown>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function cambiar(k: keyof F, v: string | boolean) {
    setF(actual => ({ ...actual, [k]: v }) as F);
  }

  async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const raiz = apiUrl.trim().replace(/\/+$/, "");
    if (!raiz) throw new Error("Ingresá la URL de la API.");
    if (!token.trim()) throw new Error("Ingresá un token de sesión válido.");
    const r = await fetch(raiz + ruta, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
        ...(opciones.headers || {}),
      },
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const b = cuerpo as { error?: string; message?: string };
      throw new Error(b.error || b.message || `Error HTTP ${r.status}`);
    }
    return cuerpo as T;
  }

  async function iniciarSesion() {
    setOcupado(true); setError(""); setMensaje("");
    setBases([]);
    setToken("");
    try {
      const raiz = apiUrl.trim().replace(/\/+$/, "");
      if (!raiz) throw new Error("Ingresá la URL de la API.");
      if (!usuario.trim() || !contrasena)
        throw new Error("Ingresá tu usuario y contraseña de ASISTIR24.");

      const respuesta = await fetch(raiz + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: usuario.trim(), password: contrasena }),
      });
      const datos = await respuesta.json().catch(() => ({})) as {
        token?: string; error?: string; message?: string;
      };

      if (!respuesta.ok || !datos.token)
        throw new Error(datos.error || datos.message || `Error de inicio de sesión HTTP ${respuesta.status}`);

      const validacion = await fetch(raiz + "/api/me", {
        headers: { Authorization: `Bearer ${datos.token}`, Accept: "application/json" },
      });
      const sesion = await validacion.json().catch(() => ({})) as {
        user?: string; role?: string; error?: string;
      };
      if (!validacion.ok)
        throw new Error(sesion.error || `No se pudo validar la sesión (HTTP ${validacion.status}).`);

      setToken(datos.token);
      setContrasena("");
      setMensaje(`Sesión validada para ${sesion.user || usuario.trim()}. Ahora podés cargar las bases.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  async function cargarBases() {
    setOcupado(true); setError(""); setMensaje("");
    try {
      const r = await api<{ items?: Base[]; bases?: Base[] }>("/api/bases");
      const lista = Array.isArray(r.items) ? r.items :
        Array.isArray(r.bases) ? r.bases : [];
      setBases(lista);
      if (lista.length && !f.baseId) cambiar("baseId", idBase(lista[0]));
      setMensaje(`Bases recibidas: ${lista.length}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setOcupado(false); }
  }

  async function calcular() {
    setOcupado(true); setError(""); setMensaje("");
    setRespuestaServidor(null);
    try {
      if (!f.origen.trim()) throw new Error("Completá el origen.");
      if (f.tipoServicio !== "AUXILIO MECANICO" && !f.destino.trim())
        throw new Error("Completá el destino.");
      const numeros = [f.kmBaseOrigen, f.kmOrigenDestino, f.kmDestinoBase]
        .map(Number);
      if (numeros.some(n => !Number.isFinite(n) || n < 0))
        throw new Error("Los kilómetros deben ser números válidos mayores o iguales a cero.");

      const r = await invoke<Record<string, unknown>>("calcular_cotizacion", {
        tipoServicio: f.tipoServicio === "AUXILIO MECANICO" ? "AUXILIO" : "ACARREO",
        totalKm: numeros[0] + numeros[1] + (f.modalidad === "INTERIOR" ? numeros[2] : 0),
        kmBaseOrigen: numeros[0],
        fecha: f.fechaServicio || null,
        esFeriado: false,
      });
      setCotizacionLocal(r);
      setMensaje("Cálculo local terminado. Todavía no se guardó en ASISTIR24.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setOcupado(false); }
  }

  async function guardar() {
    setOcupado(true); setError(""); setMensaje("");
    try {
      if (!cotizacionLocal) throw new Error("Primero calculá la cotización.");
      if (!confirmado) throw new Error("Confirmá que entendés que el servidor aplica sus tarifas y guardará un registro real.");

      const obligatorios: Array<[keyof F, string]> = [
        ["baseId", "Seleccioná una base"],
        ["empresa", "Completá la empresa"],
        ["numeroServicio", "Completá el número de servicio"],
        ["patente", "Completá la patente"],
        ["asegurado", "Completá el asegurado"],
        ["marca", "Completá la marca"],
        ["modelo", "Completá el modelo"],
        ["color", "Completá el color"],
        ["origen", "Completá el origen"],
      ];
      for (const [k, etiqueta] of obligatorios) {
        if (!String(f[k]).trim()) throw new Error(etiqueta + ".");
      }
      if (f.tipoServicio !== "AUXILIO MECANICO" && !f.destino.trim())
        throw new Error("Completá el destino.");

      const payload = {
        ...f,
        kmBaseOrigen: Number(f.kmBaseOrigen || 0),
        kmOrigenDestino: Number(f.kmOrigenDestino || 0),
        kmDestinoBase: Number(f.kmDestinoBase || 0),
        personasTrasladar: Number(f.personasTrasladar || 0),
        tipoServicio: f.tipoServicio === "AUXILIO MECANICO"
          ? "auxilio mecanico" : "remolque",
        fechaServicio: f.fechaServicio || null,
        cotizacionAmaiaCore: cotizacionLocal,
      };

      const r = await api<Record<string, unknown>>("/api/cotizar", {
        method: "POST", body: JSON.stringify(payload),
      });
      setRespuestaServidor(r);
      setMensaje("Respuesta recibida de ASISTIR24. Verificá el ID y el total registrado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setOcupado(false); }
  }

  const campo = (titulo: string, k: keyof F, tipo = "text", ejemplo = "") => (
    <label className="as24-field" key={k}>
      <span>{titulo}</span>
      <input type={tipo} value={String(f[k])} placeholder={ejemplo}
        onChange={e => cambiar(k, e.target.value)} />
    </label>
  );

  const marca = (titulo: string, k: keyof F) => (
    <label className="as24-toggle" key={k}>
      <input type="checkbox" checked={Boolean(f[k])}
        onChange={e => cambiar(k, e.target.checked)} />
      {titulo}
    </label>
  );

  return <section className="as24-cotizador">
    <style>{`
      .as24-cotizador{display:grid;gap:14px}
      .as24-cotizador .as24-card{border:1px solid #475569;border-radius:12px;padding:14px;display:grid;gap:12px}
      .as24-cotizador .as24-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
      .as24-cotizador .as24-field{display:grid;gap:5px;font-size:12px}
      .as24-cotizador .as24-field span{font-weight:700}
      .as24-cotizador input,.as24-cotizador select,.as24-cotizador textarea{box-sizing:border-box;width:100%;min-width:0;padding:9px;border:1px solid #64748b;border-radius:7px;background:#0f172a;color:#f8fafc}
      .as24-cotizador .as24-toggle{display:flex;align-items:center;gap:8px;font-size:13px}
      .as24-cotizador .as24-toggle input{width:auto}
      .as24-cotizador .as24-actions{display:flex;gap:8px;flex-wrap:wrap}
      .as24-cotizador button{padding:10px 14px;border-radius:8px;border:1px solid #64748b;cursor:pointer}
      .as24-cotizador .as24-primary{background:#2563eb;color:white}
      .as24-cotizador .as24-note{font-size:12px;opacity:.85}
      .as24-cotizador .as24-error{color:#fecaca}
      .as24-cotizador .as24-ok{color:#bbf7d0}
    `}</style>

    <div className="as24-card">
      <h3>Conexión con ASISTIR24</h3>
      <p className="as24-note">El token solo queda en memoria mientras la pantalla está abierta.</p>
      <div className="as24-grid">
        <label className="as24-field"><span>URL de la API</span>
          <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
        </label>
        <label className="as24-field"><span>Usuario de ASISTIR24</span>
          <input autoComplete="username" value={usuario}
            onChange={e => setUsuario(e.target.value)} placeholder="Tu usuario" />
        </label>
        <label className="as24-field"><span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={contrasena}
            onChange={e => setContrasena(e.target.value)} placeholder="Tu contraseña"
            onKeyDown={e => { if (e.key === "Enter" && !ocupado) void iniciarSesion(); }} />
        </label>
      </div>
      <div className="as24-actions">
        <button type="button" disabled={ocupado} onClick={iniciarSesion}>
          {ocupado ? "CONECTANDO..." : "INICIAR SESIÓN"}
        </button>
        <button type="button" disabled={ocupado || !token} onClick={cargarBases}>
          CARGAR BASES
        </button>
      </div>
    </div>

    <div className="as24-card">
      <h3>Servicio y recorrido</h3>
      <div className="as24-grid">
        <label className="as24-field"><span>BASE</span>
          <select value={f.baseId} onChange={e => cambiar("baseId", e.target.value)}>
            <option value="">Seleccionar base</option>
            {bases.map((b, i) => <option key={idBase(b) || i} value={idBase(b)}>
              {nombreBase(b)}{b.modalidad ? ` · ${b.modalidad}` : ""}
            </option>)}
          </select>
        </label>
        <label className="as24-field"><span>MODALIDAD</span>
          <select value={f.modalidad} onChange={e => cambiar("modalidad", e.target.value)}>
            <option value="AMBA_CABA">CABA / AMBA</option>
            <option value="INTERIOR">Interior</option>
          </select>
        </label>
        <label className="as24-field"><span>TIPO DE SERVICIO</span>
          <select value={f.tipoServicio} onChange={e => cambiar("tipoServicio", e.target.value)}>
            <option value="REMOLQUE">Remolque / acarreo</option>
            <option value="AUXILIO MECANICO">Auxilio mecánico</option>
          </select>
        </label>
        <label className="as24-field"><span>TIPO DE CLIENTE</span>
          <select value={f.tipoCliente} onChange={e => cambiar("tipoCliente", e.target.value)}>
            <option value="COMPANIA">Compañía</option>
            <option value="PARTICULAR">Particular</option>
          </select>
        </label>
        {campo("EMPRESA / COMPAÑÍA", "empresa")}
        {campo("NÚMERO DE SERVICIO", "numeroServicio")}
        {campo("FECHA DEL SERVICIO", "fechaServicio", "date")}
        {campo("ORIGEN", "origen", "text", "Dirección de origen")}
        {campo("DESTINO", "destino", "text", "Dirección de destino")}
        {campo("KM BASE → ORIGEN", "kmBaseOrigen", "number", "0")}
        {campo("KM ORIGEN → DESTINO", "kmOrigenDestino", "number", "0")}
        {f.modalidad === "INTERIOR" && campo("KM DESTINO → BASE", "kmDestinoBase", "number", "0")}
      </div>
    </div>

    <div className="as24-card">
      <h3>Vehículo y asegurado</h3>
      <div className="as24-grid">
        {campo("PATENTE", "patente")}
        {campo("ASEGURADO", "asegurado")}
        {campo("MARCA", "marca")}
        {campo("MODELO", "modelo")}
        {campo("COLOR", "color")}
        {campo("CONDICIÓN DEL SERVICIO", "condicionServicio")}
        {campo("TRANSMISIÓN", "transmision")}
        {campo("PERSONAS A TRASLADAR", "personasTrasladar", "number", "0")}
      </div>
      <label className="as24-field"><span>ESPECIFICACIONES</span>
        <textarea rows={2} value={f.especificaciones}
          onChange={e => cambiar("especificaciones", e.target.value)} />
      </label>
      <div className="as24-grid">
        {marca("Siniestro", "siniestro")}
        {marca("Vehículo en cochera", "enCochera")}
        {marca("Posee carga", "poseeCarga")}
        {marca("Vehículo rueda", "vehiculoRueda")}
        {marca("Tiene tráiler", "tieneTrailer")}
        {marca("Requiere extracción", "requiereExtraccion")}
      </div>
      <label className="as24-field"><span>OBSERVACIONES</span>
        <textarea rows={3} value={f.observaciones}
          onChange={e => cambiar("observaciones", e.target.value)}
          placeholder="Información adicional para operaciones" />
      </label>
    </div>

    <div className="as24-card">
      <h3>Cálculo y guardado</h3>
      <p className="as24-note">El cálculo local no guarda registros. ASISTIR24 puede aplicar tarifas distintas y guardar genera una cotización real.</p>
      <div className="as24-actions">
        <button type="button" className="as24-primary" disabled={ocupado} onClick={calcular}>
          {ocupado ? "PROCESANDO..." : "CALCULAR LOCALMENTE"}
        </button>
      </div>
      {cotizacionLocal && <div className="as24-grid">
        <div><span>Franja local</span><br/><strong>{String(cotizacionLocal.franja ?? "—")}</strong></div>
        <div><span>KM facturables</span><br/><strong>{String(cotizacionLocal.kmFacturables ?? "—")}</strong></div>
        <div><span>Total local</span><br/><strong>{pesos(cotizacionLocal.total)}</strong></div>
      </div>}
      <label className="as24-toggle">
        <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} />
        Confirmo que guardar crea un registro real y que ASISTIR24 calcula con sus propias tarifas.
      </label>
      <div className="as24-actions">
        <button type="button" className="as24-primary" disabled={ocupado || !cotizacionLocal} onClick={guardar}>
          GUARDAR COTIZACIÓN REAL EN ASISTIR24
        </button>
      </div>
      {mensaje && <p className="as24-ok" role="status">{mensaje}</p>}
      {error && <p className="as24-error" role="alert">{error}</p>}
      {respuestaServidor !== null && <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12}}>
        {JSON.stringify(respuestaServidor, null, 2)}
      </pre>}
    </div>
  </section>;
}
