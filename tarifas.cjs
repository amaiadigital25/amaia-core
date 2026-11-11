const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "tarifas-config.json");

function cargarConfiguracion() {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(
      `No existe el archivo de configuración de tarifas: ${CONFIG_FILE}`
    );
  }

  const configuracion = JSON.parse(
    fs.readFileSync(CONFIG_FILE, "utf8")
  );

  validarConfiguracion(configuracion);

  return configuracion;
}

function validarConfiguracion(config) {
  if (!config.franjas_horarias?.diurna) {
    throw new Error("Falta la tarifa diurna");
  }

  if (!config.franjas_horarias?.nocturna) {
    throw new Error("Falta la tarifa nocturna");
  }

  for (const franja of ["diurna", "nocturna"]) {
    const tarifa = config.franjas_horarias[franja];

    if (
      !Number.isFinite(tarifa.movida) ||
      !Number.isFinite(tarifa.valor_km)
    ) {
      throw new Error(`Tarifa ${franja} inválida`);
    }
  }

  if (
    !Number.isFinite(
      config.adicionales?.fin_de_semana?.porcentaje
    )
  ) {
    throw new Error("Porcentaje de fin de semana inválido");
  }

  if (
    !Number.isFinite(
      config.adicionales?.feriado?.porcentaje
    )
  ) {
    throw new Error("Porcentaje de feriado inválido");
  }
}

function convertirFecha(fecha) {
  if (!fecha) {
    return new Date();
  }

  const resultado = new Date(fecha);

  if (Number.isNaN(resultado.getTime())) {
    throw new Error("Fecha de cotización inválida");
  }

  return resultado;
}

function obtenerFranja(fecha) {
  const minutosDelDia =
    fecha.getHours() * 60 + fecha.getMinutes();

  const inicioDiurno = 8 * 60;
  const inicioNocturno = 15 * 60;

  if (
    minutosDelDia >= inicioDiurno &&
    minutosDelDia < inicioNocturno
  ) {
    return "diurna";
  }

  return "nocturna";
}

function esFinDeSemana(fecha) {
  const dia = fecha.getDay();

  return dia === 0 || dia === 6;
}

function obtenerDiaSemana(fecha) {
  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado"
  ];

  return dias[fecha.getDay()];
}

function calcularAdicional({
  fecha,
  esFeriado,
  configuracion
}) {
  const finDeSemana = esFinDeSemana(fecha);
  const feriado = esFeriado === true;

  /*
   * Fin de semana O feriado:
   * se aplica un único adicional del 15%.
   *
   * Si coincide fin de semana + feriado,
   * NO se cobra 30%.
   */
  const porcentaje =
    finDeSemana || feriado
      ? Math.max(
          configuracion.adicionales.fin_de_semana.porcentaje,
          configuracion.adicionales.feriado.porcentaje
        )
      : 0;

  const motivos = [];

  if (finDeSemana) {
    motivos.push("FIN_DE_SEMANA");
  }

  if (feriado) {
    motivos.push("FERIADO");
  }

  return {
    porcentaje,
    motivos
  };
}

function calcularCotizacion({
  tipoServicio,
  totalKm,
  kmBaseOrigen,
  fecha,
  esFeriado = false
}) {
  const configuracion = cargarConfiguracion();

  if (!Number.isFinite(totalKm) || totalKm < 0) {
    throw new Error("Kilometraje total inválido");
  }

  if (!Number.isFinite(kmBaseOrigen) || kmBaseOrigen < 0) {
    throw new Error(
      "Kilometraje Base → Origen inválido"
    );
  }

  const fechaCotizacion = convertirFecha(fecha);
  const franja = obtenerFranja(fechaCotizacion);
  const tarifa = configuracion.franjas_horarias[franja];

  const tipo = String(tipoServicio || "")
    .trim()
    .toUpperCase();

  const esAuxilio = tipo.includes("AUXILIO");

  const kmFacturables = esAuxilio
    ? kmBaseOrigen
    : totalKm;

  const costoKm =
    kmFacturables * tarifa.valor_km;

  const subtotal =
    tarifa.movida + costoKm;

  const adicional = calcularAdicional({
    fecha: fechaCotizacion,
    esFeriado,
    configuracion
  });

  const adicionalImporte =
    subtotal * (adicional.porcentaje / 100);

  const total = Math.round(
    subtotal + adicionalImporte
  );

  return {
    estado: "OK",
    tipoServicio,
    fecha: fechaCotizacion.toISOString(),
    dia: obtenerDiaSemana(fechaCotizacion),
    hora: fechaCotizacion
      .toTimeString()
      .slice(0, 5),

    franja,
    tarifaId: tarifa.id,

    kmFacturables: Number(
      kmFacturables.toFixed(2)
    ),

    movida: tarifa.movida,
    valorKm: tarifa.valor_km,

    costoKm: Number(
      costoKm.toFixed(2)
    ),

    subtotal: Number(
      subtotal.toFixed(2)
    ),

    adicionalPorcentaje:
      adicional.porcentaje,

    adicionalMotivos:
      adicional.motivos,

    adicionalImporte: Number(
      adicionalImporte.toFixed(2)
    ),

    total,

    regla: esAuxilio
      ? "BASE → ORIGEN"
      : "BASE → ORIGEN → DESTINO"
  };
}

module.exports = {
  calcularCotizacion,
  obtenerFranja,
  esFinDeSemana
};
