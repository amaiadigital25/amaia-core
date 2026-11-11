import { useMemo, useState } from "react";
import "./Asistir24CRM.css";

type Section =
  | "dashboard"
  | "prestadores"
  | "bases"
  | "servicios"
  | "companias";

type Prestador = {
  id: number;
  nombre: string;
  telefono: string;
  zona: string;
  servicio: string;
  estado: "Activo" | "Inactivo";
};

type Base = {
  id: number;
  nombre: string;
  localidad: string;
  zona: string;
  unidades: number;
  estado: "Activa" | "Inactiva";
};

type Servicio = {
  id: number;
  numero: string;
  compania: string;
  origen: string;
  destino: string;
  prestador: string;
  estado: "Pendiente" | "Asignado" | "Realizado" | "Cancelado";
};

type Compania = {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  estado: "Activa" | "Inactiva";
};

const STORAGE = {
  prestadores: "asistir24-crm-prestadores",
  bases: "asistir24-crm-bases",
  servicios: "asistir24-crm-servicios",
  companias: "asistir24-crm-companias",
};

const initialPrestadores: Prestador[] = [
  {
    id: 1,
    nombre: "Prestador demo",
    telefono: "11 0000-0000",
    zona: "AMBA",
    servicio: "Grúa",
    estado: "Activo",
  },
];

const initialBases: Base[] = [
  {
    id: 1,
    nombre: "Base Principal",
    localidad: "Buenos Aires",
    zona: "AMBA",
    unidades: 0,
    estado: "Activa",
  },
];

const initialServicios: Servicio[] = [];

const initialCompanias: Compania[] = [];

function loadData<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nextId<T extends { id: number }>(items: T[]): number {
  if (items.length === 0) {
    return 1;
  }

  return Math.max(...items.map((item) => item.id)) + 1;
}

export default function Asistir24CRM() {
  const [section, setSection] = useState<Section>("dashboard");

  const [prestadores, setPrestadores] = useState<Prestador[]>(() =>
    loadData(STORAGE.prestadores, initialPrestadores),
  );

  const [bases, setBases] = useState<Base[]>(() =>
    loadData(STORAGE.bases, initialBases),
  );

  const [servicios, setServicios] = useState<Servicio[]>(() =>
    loadData(STORAGE.servicios, initialServicios),
  );

  const [companias, setCompanias] = useState<Compania[]>(() =>
    loadData(STORAGE.companias, initialCompanias),
  );

  const [search, setSearch] = useState("");

  const persist = <T,>(key: string, data: T): void => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const filteredPrestadores = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return prestadores;
    }

    return prestadores.filter((item) =>
      [
        item.nombre,
        item.telefono,
        item.zona,
        item.servicio,
        item.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [prestadores, search]);

  const filteredBases = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return bases;
    }

    return bases.filter((item) =>
      [
        item.nombre,
        item.localidad,
        item.zona,
        item.estado,
        String(item.unidades),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [bases, search]);

  const filteredServicios = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return servicios;
    }

    return servicios.filter((item) =>
      [
        item.numero,
        item.compania,
        item.origen,
        item.destino,
        item.prestador,
        item.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [servicios, search]);

  const filteredCompanias = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return companias;
    }

    return companias.filter((item) =>
      [item.nombre, item.contacto, item.telefono, item.estado]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [companias, search]);

  const addPrestador = (): void => {
    const nombre = window.prompt("Nombre del prestador");

    if (!nombre?.trim()) {
      return;
    }

    const telefono = window.prompt("Teléfono", "") ?? "";
    const zona = window.prompt("Zona", "AMBA") ?? "AMBA";
    const servicio = window.prompt("Servicio", "Grúa") ?? "Grúa";

    const nuevo: Prestador = {
      id: nextId(prestadores),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      zona: zona.trim(),
      servicio: servicio.trim(),
      estado: "Activo",
    };

    const updated: Prestador[] = [...prestadores, nuevo];

    setPrestadores(updated);
    persist(STORAGE.prestadores, updated);
  };

  const togglePrestador = (id: number): void => {
    const updated: Prestador[] = prestadores.map((item) => {
      if (item.id !== id) {
        return item;
      }

      const estado: "Activo" | "Inactivo" =
        item.estado === "Activo" ? "Inactivo" : "Activo";

      return {
        ...item,
        estado,
      };
    });

    setPrestadores(updated);
    persist(STORAGE.prestadores, updated);
  };

  const deletePrestador = (id: number): void => {
    if (!window.confirm("¿Eliminar este prestador?")) {
      return;
    }

    const updated: Prestador[] = prestadores.filter(
      (item) => item.id !== id,
    );

    setPrestadores(updated);
    persist(STORAGE.prestadores, updated);
  };

  const addBase = (): void => {
    const nombre = window.prompt("Nombre de la base");

    if (!nombre?.trim()) {
      return;
    }

    const localidad = window.prompt("Localidad", "") ?? "";
    const zona = window.prompt("Zona", "AMBA") ?? "AMBA";
    const unidadesText = window.prompt("Cantidad de unidades", "0") ?? "0";

    const unidades = Number(unidadesText);

    const nueva: Base = {
      id: nextId(bases),
      nombre: nombre.trim(),
      localidad: localidad.trim(),
      zona: zona.trim(),
      unidades: Number.isFinite(unidades) ? unidades : 0,
      estado: "Activa",
    };

    const updated: Base[] = [...bases, nueva];

    setBases(updated);
    persist(STORAGE.bases, updated);
  };

  const toggleBase = (id: number): void => {
    const updated: Base[] = bases.map((item) => {
      if (item.id !== id) {
        return item;
      }

      const estado: "Activa" | "Inactiva" =
        item.estado === "Activa" ? "Inactiva" : "Activa";

      return {
        ...item,
        estado,
      };
    });

    setBases(updated);
    persist(STORAGE.bases, updated);
  };

  const deleteBase = (id: number): void => {
    if (!window.confirm("¿Eliminar esta base?")) {
      return;
    }

    const updated: Base[] = bases.filter((item) => item.id !== id);

    setBases(updated);
    persist(STORAGE.bases, updated);
  };

  const addServicio = (): void => {
    const numero = window.prompt("Número de servicio");

    if (!numero?.trim()) {
      return;
    }

    const compania = window.prompt("Compañía", "") ?? "";
    const origen = window.prompt("Origen", "") ?? "";
    const destino = window.prompt("Destino", "") ?? "";
    const prestador = window.prompt("Prestador", "") ?? "";

    const nuevo: Servicio = {
      id: nextId(servicios),
      numero: numero.trim(),
      compania: compania.trim(),
      origen: origen.trim(),
      destino: destino.trim(),
      prestador: prestador.trim(),
      estado: "Pendiente",
    };

    const updated: Servicio[] = [...servicios, nuevo];

    setServicios(updated);
    persist(STORAGE.servicios, updated);
  };

  const changeServicioStatus = (
    id: number,
    estado: Servicio["estado"],
  ): void => {
    const updated: Servicio[] = servicios.map((item) =>
      item.id === id
        ? {
            ...item,
            estado,
          }
        : item,
    );

    setServicios(updated);
    persist(STORAGE.servicios, updated);
  };

  const deleteServicio = (id: number): void => {
    if (!window.confirm("¿Eliminar este servicio?")) {
      return;
    }

    const updated: Servicio[] = servicios.filter(
      (item) => item.id !== id,
    );

    setServicios(updated);
    persist(STORAGE.servicios, updated);
  };

  const addCompania = (): void => {
    const nombre = window.prompt("Nombre de la compañía");

    if (!nombre?.trim()) {
      return;
    }

    const contacto = window.prompt("Contacto", "") ?? "";
    const telefono = window.prompt("Teléfono", "") ?? "";

    const nueva: Compania = {
      id: nextId(companias),
      nombre: nombre.trim(),
      contacto: contacto.trim(),
      telefono: telefono.trim(),
      estado: "Activa",
    };

    const updated: Compania[] = [...companias, nueva];

    setCompanias(updated);
    persist(STORAGE.companias, updated);
  };

  const toggleCompania = (id: number): void => {
    const updated: Compania[] = companias.map((item) => {
      if (item.id !== id) {
        return item;
      }

      const estado: "Activa" | "Inactiva" =
        item.estado === "Activa" ? "Inactiva" : "Activa";

      return {
        ...item,
        estado,
      };
    });

    setCompanias(updated);
    persist(STORAGE.companias, updated);
  };

  const deleteCompania = (id: number): void => {
    if (!window.confirm("¿Eliminar esta compañía?")) {
      return;
    }

    const updated: Compania[] = companias.filter(
      (item) => item.id !== id,
    );

    setCompanias(updated);
    persist(STORAGE.companias, updated);
  };

  const resetDemoData = (): void => {
    if (
      !window.confirm(
        "Esto reemplazará los datos actuales por los datos iniciales de demostración. ¿Continuar?",
      )
    ) {
      return;
    }

    setPrestadores(initialPrestadores);
    setBases(initialBases);
    setServicios(initialServicios);
    setCompanias(initialCompanias);

    persist(STORAGE.prestadores, initialPrestadores);
    persist(STORAGE.bases, initialBases);
    persist(STORAGE.servicios, initialServicios);
    persist(STORAGE.companias, initialCompanias);
  };

  const sectionTitle: Record<Section, string> = {
    dashboard: "Dashboard",
    prestadores: "Prestadores",
    bases: "Bases",
    servicios: "Servicios",
    companias: "Compañías",
  };

  const sectionDescription: Record<Section, string> = {
    dashboard: "Centro de control operativo de Asistir24.",
    prestadores: "Administración de la red de prestadores.",
    bases: "Control de bases y unidades operativas.",
    servicios: "Seguimiento de servicios de asistencia.",
    companias: "Administración de compañías y clientes.",
  };

  const navItems: Array<{
    id: Section;
    label: string;
    icon: string;
  }> = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⌂",
    },
    {
      id: "prestadores",
      label: "Prestadores",
      icon: "◉",
    },
    {
      id: "bases",
      label: "Bases",
      icon: "⌖",
    },
    {
      id: "servicios",
      label: "Servicios",
      icon: "⇄",
    },
    {
      id: "companias",
      label: "Compañías",
      icon: "▣",
    },
  ];

  return (
    <div className="asistir24-crm">
      <header className="asistir24-crm__topbar">
        <div>
          <div className="asistir24-crm__brand">AMAIA CORE</div>
          <div className="asistir24-crm__module">Asistir24 CRM</div>
        </div>

        <div className="asistir24-crm__topbar-status">
          <span className="asistir24-crm__status-dot" />
          Sistema operativo
        </div>
      </header>

      <div className="asistir24-crm__body">
        <aside className="asistir24-crm__sidebar">
          <div className="asistir24-crm__sidebar-title">
            OPERACIONES
          </div>

          <nav className="asistir24-crm__nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`asistir24-crm__nav-button ${
                  section === item.id
                    ? "asistir24-crm__nav-button--active"
                    : ""
                }`}
                onClick={() => {
                  setSection(item.id);
                  setSearch("");
                }}
              >
                <span className="asistir24-crm__nav-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="asistir24-crm__reset"
            onClick={resetDemoData}
          >
            Restablecer demo
          </button>
        </aside>

        <main className="asistir24-crm__main">
          <div className="asistir24-crm__heading">
            <div>
              <h1>{sectionTitle[section]}</h1>
              <p>{sectionDescription[section]}</p>
            </div>

            {section !== "dashboard" && (
              <div className="asistir24-crm__actions">
                <input
                  className="asistir24-crm__search"
                  type="search"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {section === "prestadores" && (
                  <button
                    type="button"
                    className="asistir24-crm__primary-button"
                    onClick={addPrestador}
                  >
                    + Prestador
                  </button>
                )}

                {section === "bases" && (
                  <button
                    type="button"
                    className="asistir24-crm__primary-button"
                    onClick={addBase}
                  >
                    + Base
                  </button>
                )}

                {section === "servicios" && (
                  <button
                    type="button"
                    className="asistir24-crm__primary-button"
                    onClick={addServicio}
                  >
                    + Servicio
                  </button>
                )}

                {section === "companias" && (
                  <button
                    type="button"
                    className="asistir24-crm__primary-button"
                    onClick={addCompania}
                  >
                    + Compañía
                  </button>
                )}
              </div>
            )}
          </div>

          {section === "dashboard" && (
            <>
              <section className="asistir24-crm__stats">
                <div className="asistir24-crm__stat-card">
                  <span>Prestadores</span>
                  <strong>{prestadores.length}</strong>
                  <small>
                    {
                      prestadores.filter(
                        (item) => item.estado === "Activo",
                      ).length
                    }{" "}
                    activos
                  </small>
                </div>

                <div className="asistir24-crm__stat-card">
                  <span>Bases</span>
                  <strong>{bases.length}</strong>
                  <small>
                    {
                      bases.filter(
                        (item) => item.estado === "Activa",
                      ).length
                    }{" "}
                    activas
                  </small>
                </div>

                <div className="asistir24-crm__stat-card">
                  <span>Servicios</span>
                  <strong>{servicios.length}</strong>
                  <small>
                    {
                      servicios.filter(
                        (item) => item.estado === "Pendiente",
                      ).length
                    }{" "}
                    pendientes
                  </small>
                </div>

                <div className="asistir24-crm__stat-card">
                  <span>Compañías</span>
                  <strong>{companias.length}</strong>
                  <small>
                    {
                      companias.filter(
                        (item) => item.estado === "Activa",
                      ).length
                    }{" "}
                    activas
                  </small>
                </div>
              </section>

              <section className="asistir24-crm__dashboard-grid">
                <div className="asistir24-crm__panel">
                  <div className="asistir24-crm__panel-header">
                    <div>
                      <h2>Estado operativo</h2>
                      <p>Resumen de la red Asistir24.</p>
                    </div>
                  </div>

                  <div className="asistir24-crm__quick-list">
                    <div>
                      <span>Prestadores activos</span>
                      <strong>
                        {
                          prestadores.filter(
                            (item) => item.estado === "Activo",
                          ).length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Bases activas</span>
                      <strong>
                        {
                          bases.filter(
                            (item) => item.estado === "Activa",
                          ).length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Servicios pendientes</span>
                      <strong>
                        {
                          servicios.filter(
                            (item) => item.estado === "Pendiente",
                          ).length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Servicios realizados</span>
                      <strong>
                        {
                          servicios.filter(
                            (item) => item.estado === "Realizado",
                          ).length
                        }
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="asistir24-crm__panel">
                  <div className="asistir24-crm__panel-header">
                    <div>
                      <h2>Módulos</h2>
                      <p>Componentes del CRM operativo.</p>
                    </div>
                  </div>

                  <div className="asistir24-crm__module-grid">
                    {navItems
                      .filter((item) => item.id !== "dashboard")
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="asistir24-crm__module-card"
                          onClick={() => setSection(item.id)}
                        >
                          <span>{item.icon}</span>
                          <strong>{item.label}</strong>
                        </button>
                      ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {section === "prestadores" && (
            <section className="asistir24-crm__panel">
              <div className="asistir24-crm__panel-header">
                <div>
                  <h2>Red de prestadores</h2>
                  <p>{filteredPrestadores.length} registros</p>
                </div>
              </div>

              <div className="asistir24-crm__table-wrapper">
                <table className="asistir24-crm__table">
                  <thead>
                    <tr>
                      <th>Prestador</th>
                      <th>Teléfono</th>
                      <th>Zona</th>
                      <th>Servicio</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPrestadores.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.telefono || "—"}</td>
                        <td>{item.zona || "—"}</td>
                        <td>{item.servicio || "—"}</td>
                        <td>
                          <span
                            className={`asistir24-crm__badge ${
                              item.estado === "Activo"
                                ? "asistir24-crm__badge--success"
                                : "asistir24-crm__badge--muted"
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td>
                          <div className="asistir24-crm__row-actions">
                            <button
                              type="button"
                              onClick={() =>
                                togglePrestador(item.id)
                              }
                            >
                              {item.estado === "Activo"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              className="asistir24-crm__danger-button"
                              onClick={() =>
                                deletePrestador(item.id)
                              }
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredPrestadores.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="asistir24-crm__empty">
                            No hay prestadores para mostrar.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "bases" && (
            <section className="asistir24-crm__panel">
              <div className="asistir24-crm__panel-header">
                <div>
                  <h2>Bases operativas</h2>
                  <p>{filteredBases.length} registros</p>
                </div>
              </div>

              <div className="asistir24-crm__table-wrapper">
                <table className="asistir24-crm__table">
                  <thead>
                    <tr>
                      <th>Base</th>
                      <th>Localidad</th>
                      <th>Zona</th>
                      <th>Unidades</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBases.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.localidad || "—"}</td>
                        <td>{item.zona || "—"}</td>
                        <td>{item.unidades}</td>
                        <td>
                          <span
                            className={`asistir24-crm__badge ${
                              item.estado === "Activa"
                                ? "asistir24-crm__badge--success"
                                : "asistir24-crm__badge--muted"
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td>
                          <div className="asistir24-crm__row-actions">
                            <button
                              type="button"
                              onClick={() => toggleBase(item.id)}
                            >
                              {item.estado === "Activa"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              className="asistir24-crm__danger-button"
                              onClick={() => deleteBase(item.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredBases.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="asistir24-crm__empty">
                            No hay bases para mostrar.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "servicios" && (
            <section className="asistir24-crm__panel">
              <div className="asistir24-crm__panel-header">
                <div>
                  <h2>Servicios</h2>
                  <p>{filteredServicios.length} registros</p>
                </div>
              </div>

              <div className="asistir24-crm__table-wrapper">
                <table className="asistir24-crm__table">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Compañía</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Prestador</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredServicios.map((item) => (
                      <tr key={item.id}>
                        <td>{item.numero}</td>
                        <td>{item.compania || "—"}</td>
                        <td>{item.origen || "—"}</td>
                        <td>{item.destino || "—"}</td>
                        <td>{item.prestador || "—"}</td>
                        <td>
                          <select
                            className="asistir24-crm__select"
                            value={item.estado}
                            onChange={(event) =>
                              changeServicioStatus(
                                item.id,
                                event.target.value as Servicio["estado"],
                              )
                            }
                          >
                            <option value="Pendiente">
                              Pendiente
                            </option>
                            <option value="Asignado">
                              Asignado
                            </option>
                            <option value="Realizado">
                              Realizado
                            </option>
                            <option value="Cancelado">
                              Cancelado
                            </option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="asistir24-crm__danger-button"
                            onClick={() =>
                              deleteServicio(item.id)
                            }
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredServicios.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="asistir24-crm__empty">
                            No hay servicios para mostrar.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "companias" && (
            <section className="asistir24-crm__panel">
              <div className="asistir24-crm__panel-header">
                <div>
                  <h2>Compañías</h2>
                  <p>{filteredCompanias.length} registros</p>
                </div>
              </div>

              <div className="asistir24-crm__table-wrapper">
                <table className="asistir24-crm__table">
                  <thead>
                    <tr>
                      <th>Compañía</th>
                      <th>Contacto</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCompanias.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.contacto || "—"}</td>
                        <td>{item.telefono || "—"}</td>
                        <td>
                          <span
                            className={`asistir24-crm__badge ${
                              item.estado === "Activa"
                                ? "asistir24-crm__badge--success"
                                : "asistir24-crm__badge--muted"
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td>
                          <div className="asistir24-crm__row-actions">
                            <button
                              type="button"
                              onClick={() =>
                                toggleCompania(item.id)
                              }
                            >
                              {item.estado === "Activa"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              className="asistir24-crm__danger-button"
                              onClick={() =>
                                deleteCompania(item.id)
                              }
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCompanias.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="asistir24-crm__empty">
                            No hay compañías para mostrar.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
