import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../assets/jeti.svg";
import footerLogo from "../assets/cha_pie.svg";
import hands from "../assets/manitos.gif";
import whatsappIcon from "../assets/whatsapp.svg";
import existingCats from "../db.json";
import { maxImageSize, storageBucket, supabase } from "./supabase.js";

const emptyForm = {
  nombre: "",
  datos: "",
  tiempo: "",
  contacto: "",
};

const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const catStatuses = {
  pendiente: "Pendiente",
  aprobado: "En adopción",
  adoptado: "Adoptado",
  rechazado: "Rechazado",
};

async function addSignedPhotoUrls(cats) {
  const storagePaths = cats
    .map((cat) => cat.foto)
    .filter((foto) => !/^https?:\/\//i.test(foto));
  if (!storagePaths.length) return cats;

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrls(storagePaths, 3600);
  if (error) throw error;
  const signedUrls = new Map((data ?? []).map(({ path, signedUrl }) => [path, signedUrl]));
  return cats.map((cat) => ({ ...cat, foto: signedUrls.get(cat.foto) ?? cat.foto }));
}

function App() {
  const [page, setPage] = useState("list");
  const [gatitos, setGatitos] = useState(supabase ? [] : existingCats.gatitos);
  const [adoptedCats, setAdoptedCats] = useState([]);
  const [adminCats, setAdminCats] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const photoInput = useRef(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!selectedImage) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedImage(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("image-lightbox-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("image-lightbox-open");
    };
  }, [selectedImage]);

  useEffect(() => {
    if (!supabase) {
      setNotice("Viendo los avisos de muestra de db.json. Configura Supabase para consultar y guardar avisos compartidos.");
      setNoticeType("info");
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    async function loadGatitos() {
      try {
        const { data, error } = await supabase
          .from("gatitos_public")
          .select("id, nombre, foto, datos, tiempo, contacto, estado")
          .in("estado", ["aprobado", "adoptado"])
          .order("created_at", { ascending: false });
        if (error) throw error;

        const catsWithPhotos = await addSignedPhotoUrls(data ?? []);

        if (isMounted) {
          setGatitos(catsWithPhotos.filter((cat) => cat.estado === "aprobado"));
          setAdoptedCats(catsWithPhotos.filter((cat) => cat.estado === "adoptado"));
        }
      } catch (error) {
        if (isMounted) {
          setNotice(`No se pudieron cargar los gatitos: ${error.message}`);
          setNoticeType("error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadGatitos();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let isMounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setIsAdmin(nextSession ? null : false);
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (isMounted) setSession(data.session);
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(`No se pudo comprobar la sesión: ${error.message}`);
          setNoticeType("error");
        }
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(false);
      setAdminCats([]);
      return undefined;
    }

    let isMounted = true;
    async function checkAdminAccess() {
      try {
        const { data, error } = await supabase.rpc("es_administrador");
        if (error) throw error;
        if (isMounted) setIsAdmin(data === true);
      } catch (error) {
        if (isMounted) {
          setNotice(`No se pudo comprobar el permiso de administración: ${error.message}`);
          setNoticeType("error");
          setIsAdmin(false);
        }
      }
    }

    checkAdminAccess();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const filteredGatitos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return gatitos;
    return gatitos.filter((gatito) =>
      `${gatito.nombre} ${gatito.datos}`.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  }, [gatitos, query]);
  const filteredAdoptedCats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return adoptedCats;
    return adoptedCats.filter((gatito) =>
      `${gatito.nombre} ${gatito.datos}`.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  }, [adoptedCats, query]);

  function openForm() {
    setNotice("");
    setPage("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showList() {
    setNotice("");
    setPage("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showPage(nextPage) {
    setNotice("");
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshPublicCats() {
    const { data, error } = await supabase
      .from("gatitos_public")
      .select("id, nombre, foto, datos, tiempo, contacto, estado")
      .in("estado", ["aprobado", "adoptado"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    const catsWithPhotos = await addSignedPhotoUrls(data ?? []);
    setGatitos(catsWithPhotos.filter((cat) => cat.estado === "aprobado"));
    setAdoptedCats(catsWithPhotos.filter((cat) => cat.estado === "adoptado"));
  }

  async function refreshAdminCats() {
    const { data, error } = await supabase
      .from("gatitos")
      .select("id, nombre, foto, datos, tiempo, contacto, estado, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setAdminCats(await addSignedPhotoUrls(data ?? []));
  }

  useEffect(() => {
    if (!supabase || !session || !isAdmin || page !== "admin") return undefined;
    let isMounted = true;
    async function loadAdminCats() {
      setAdminLoading(true);
      try {
        await refreshAdminCats();
      } catch (error) {
        if (isMounted) {
          setNotice(`No se pudieron cargar los avisos para moderar: ${error.message}`);
          setNoticeType("error");
        }
      } finally {
        if (isMounted) setAdminLoading(false);
      }
    }
    loadAdminCats();
    return () => {
      isMounted = false;
    };
  }, [session, isAdmin, page]);

  async function handleAdminLogin(event) {
    event.preventDefault();
    setNotice("");
    setAdminSaving(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(adminCredentials);
      if (error) throw error;
      setAdminCredentials({ email: "", password: "" });
      setNotice("Sesión iniciada. Comprobando permisos de administración...");
      setNoticeType("info");
    } catch (error) {
      setNotice(`No se pudo iniciar sesión: ${error.message}`);
      setNoticeType("error");
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleAdminLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice(`No se pudo cerrar la sesión: ${error.message}`);
      setNoticeType("error");
      return;
    }
    setPage("list");
    setNotice("Sesión cerrada.");
    setNoticeType("success");
  }

  async function handleStatusChange(cat, estado) {
    setAdminSaving(true);
    setNotice("");
    try {
      const { error } = await supabase.from("gatitos").update({ estado }).eq("id", cat.id);
      if (error) throw error;
      try {
        await Promise.all([refreshAdminCats(), refreshPublicCats()]);
        setNotice(`El aviso de ${cat.nombre} ahora está: ${catStatuses[estado].toLowerCase()}.`);
        setNoticeType("success");
      } catch (error) {
        setNotice(`El aviso se actualizó, pero no se pudieron refrescar los listados: ${error.message}`);
        setNoticeType("error");
      }
    } catch (error) {
      setNotice(`No se pudo actualizar el aviso: ${error.message}`);
      setNoticeType("error");
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleDeleteCat(cat) {
    if (!window.confirm(`¿Eliminar definitivamente el aviso de ${cat.nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setAdminSaving(true);
    setNotice("");
    try {
      const { error } = await supabase.from("gatitos").delete().eq("id", cat.id);
      if (error) throw error;

      let photoCleanupError = null;
      if (!/^https?:\/\//i.test(cat.foto)) {
        const { error: storageError } = await supabase.storage.from(storageBucket).remove([cat.foto]);
        photoCleanupError = storageError;
      }

      let refreshError = null;
      try {
        await Promise.all([refreshAdminCats(), refreshPublicCats()]);
      } catch (error) {
        refreshError = error;
      }

      if (photoCleanupError || refreshError) {
        const details = [
          photoCleanupError && `no se pudo borrar la foto: ${photoCleanupError.message}`,
          refreshError && `no se pudieron refrescar los listados: ${refreshError.message}`,
        ].filter(Boolean).join("; ");
        setNotice(`El aviso se eliminó, pero ${details}.`);
        setNoticeType("error");
      } else {
        setNotice(`Se eliminó el aviso de ${cat.nombre}.`);
        setNoticeType("success");
      }
    } catch (error) {
      setNotice(`No se pudo eliminar el aviso: ${error.message}`);
      setNoticeType("error");
    } finally {
      setAdminSaving(false);
    }
  }

  function handlePhotoChange(event) {
    const selectedPhoto = event.target.files?.[0] ?? null;
    setNotice("");
    setPhoto(null);
    setPreviewUrl("");

    if (!selectedPhoto) return;
    if (!Object.hasOwn(imageExtensions, selectedPhoto.type)) {
      setNotice("Elige una imagen JPG, PNG o WebP.");
      setNoticeType("error");
      event.target.value = "";
      return;
    }
    if (selectedPhoto.size > maxImageSize) {
      setNotice("La imagen no puede superar los 5 MB.");
      setNoticeType("error");
      event.target.value = "";
      return;
    }

    setPhoto(selectedPhoto);
    setPreviewUrl(URL.createObjectURL(selectedPhoto));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    if (!supabase) {
      setNotice("Falta configurar Supabase. Sigue las instrucciones del README.");
      setNoticeType("error");
      return;
    }
    if (!photo) {
      setNotice("Selecciona una foto del gatito antes de enviar el formulario.");
      setNoticeType("error");
      return;
    }

    const phone = form.contacto.replace(/\D/g, "");
    if (phone.length < 8 || phone.length > 15) {
      setNotice("Escribe un WhatsApp válido con código de país (entre 8 y 15 dígitos).");
      setNoticeType("error");
      return;
    }

    setSaving(true);
    let imageUploaded = false;
    try {
      const extension = imageExtensions[photo.type];
      const imagePath = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(imagePath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;
      imageUploaded = true;

      const { error: insertError } = await supabase.from("gatitos").insert({
        ...form,
        contacto: phone,
        foto: imagePath,
        estado: "pendiente",
      });
      if (insertError) throw insertError;

      setForm(emptyForm);
      setPhoto(null);
      setPreviewUrl("");
      if (photoInput.current) photoInput.current.value = "";
      setNotice("¡Gracias! El aviso quedó pendiente de revisión antes de aparecer publicado.");
      setNoticeType("success");
    } catch (error) {
      const orphanNote = imageUploaded
        ? " La foto se subió, pero el aviso no se guardó; puede ser necesario eliminar esa imagen desde Supabase."
        : "";
      setNotice(`No se pudo enviar el aviso: ${error.message}.${orphanNote}`);
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="./" onClick={(event) => { event.preventDefault(); showList(); }}>
          <img src={logo} alt="Adopción de Gatitos" />
          <span>Adopción de Gatitos</span>
        </a>
        <div className="header-actions">
          {(page === "list" || page === "adopted") && (
            <label className="search-box">
              <span className="visually-hidden">Buscar gatitos</span>
              <input
                type="search"
                placeholder="Buscar gatito..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          {page !== "list" && (
            <button className="button button-secondary" onClick={showList}>
              En adopción
            </button>
          )}
          {page !== "adopted" && (
            <button className="button button-secondary" onClick={() => showPage("adopted")}>
              Adoptados
            </button>
          )}
          {page !== "admin" && (
            <button className="button button-secondary" onClick={() => showPage("admin")}>
              Administrar
            </button>
          )}
          {page !== "form" ? (
            <button className="button button-primary" onClick={openForm}>
              Agregar Gatito
            </button>
          ) : (
            <button className="button button-secondary" onClick={showList}>
              Volver al listado
            </button>
          )}
        </div>
      </header>

      <main>
        {notice && (
          <div className={`notice notice-${noticeType}`} role="status" aria-live="polite">
            {notice}
          </div>
        )}

        {page === "list" || page === "adopted" ? (
          <section className="content-section" aria-labelledby="page-title">
            <div className="section-heading">
              <p className="eyebrow">{page === "list" ? "Un hogar puede cambiarlo todo" : "Historias con final feliz"}</p>
              <h1 id="page-title">{page === "list" ? "Gatitos en adopción" : "Gatitos adoptados"}</h1>
              <p className="intro">
                {page === "list"
                  ? "Conoce a quienes buscan una familia y contacta a su cuidador."
                  : "Un registro de los gatitos que ya encontraron un hogar."}
              </p>
            </div>

            {loading ? (
              <p className="empty-state" role="status">Cargando gatitos...</p>
            ) : (page === "list" ? filteredGatitos : filteredAdoptedCats).length ? (
              <div className="gatitos-grid">
                {(page === "list" ? filteredGatitos : filteredAdoptedCats).map((gatito) => (
                  <article className="cat-card" key={gatito.id}>
                    <button
                      className="cat-photo-button"
                      type="button"
                      onClick={() => setSelectedImage(gatito)}
                      aria-label={`Ver foto completa de ${gatito.nombre}`}
                    >
                      <img className="cat-photo" src={gatito.foto} alt="" />
                    </button>
                    <div className="cat-details">
                      <h2>{gatito.nombre}</h2>
                      <p className="cat-description">{gatito.datos}</p>
                      <p><strong>Edad:</strong> {gatito.tiempo}</p>
                      {gatito.contacto && (
                        <a
                          className="contact-link"
                          href={`https://wa.me/${gatito.contacto.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img src={whatsappIcon} alt="" />
                          Contactar por WhatsApp
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {query
                  ? "No encontramos gatitos con esa búsqueda."
                  : page === "list"
                    ? "Todavía no hay avisos publicados."
                    : "Todavía no hay gatitos en el registro de adoptados."}
              </p>
            )}
          </section>
        ) : page === "admin" ? (
          <section className="content-section admin-section" aria-labelledby="page-title">
            <div className="section-heading">
              <p className="eyebrow">Acceso privado</p>
              <h1 id="page-title">Administrar avisos</h1>
              <p className="intro">Aprueba, rechaza, marca como adoptado o elimina publicaciones.</p>
            </div>

            {!supabase ? (
              <p className="empty-state">Configura Supabase para acceder a la administración.</p>
            ) : authLoading ? (
              <p className="empty-state" role="status">Comprobando sesión...</p>
            ) : !session ? (
              <form className="cat-form admin-login" onSubmit={handleAdminLogin}>
                <label>
                  Correo electrónico
                  <input
                    type="email"
                    autoComplete="username"
                    value={adminCredentials.email}
                    onChange={(event) => setAdminCredentials({ ...adminCredentials, email: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={adminCredentials.password}
                    onChange={(event) => setAdminCredentials({ ...adminCredentials, password: event.target.value })}
                    required
                  />
                </label>
                <button className="button button-primary" type="submit" disabled={adminSaving}>
                  {adminSaving ? "Ingresando..." : "Iniciar sesión"}
                </button>
              </form>
            ) : isAdmin === null ? (
              <p className="empty-state" role="status">Comprobando permisos de administración...</p>
            ) : !isAdmin ? (
              <div className="admin-access-message">
                <p>Esta cuenta no tiene permisos para administrar avisos.</p>
                <button className="button button-secondary" onClick={handleAdminLogout}>
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <>
                <div className="admin-toolbar">
                  <p>Sesión de administración: <strong>{session.user.email}</strong></p>
                  <button className="button button-secondary" onClick={handleAdminLogout}>
                    Cerrar sesión
                  </button>
                </div>
                {adminLoading ? (
                  <p className="empty-state" role="status">Cargando avisos para moderar...</p>
                ) : adminCats.length ? (
                  <div className="gatitos-grid admin-grid">
                    {adminCats.map((cat) => (
                      <article className="cat-card admin-card" key={cat.id}>
                        <img className="cat-photo" src={cat.foto} alt={`Foto de ${cat.nombre}`} />
                        <div className="cat-details">
                          <div className="admin-card-heading">
                            <h2>{cat.nombre}</h2>
                            <span className={`status-badge status-${cat.estado}`}>{catStatuses[cat.estado]}</span>
                          </div>
                          <p className="cat-description">{cat.datos}</p>
                          <p><strong>Edad:</strong> {cat.tiempo}</p>
                          <p><strong>Contacto:</strong> {cat.contacto}</p>
                          <div className="admin-actions">
                            {(cat.estado === "pendiente" || cat.estado === "rechazado") && (
                              <button className="button button-primary" disabled={adminSaving} onClick={() => handleStatusChange(cat, "aprobado")}>
                                Aprobar
                              </button>
                            )}
                            {cat.estado === "aprobado" && (
                              <button className="button button-primary" disabled={adminSaving} onClick={() => handleStatusChange(cat, "adoptado")}>
                                Marcar adoptado
                              </button>
                            )}
                            {cat.estado === "adoptado" && (
                              <button className="button button-primary" disabled={adminSaving} onClick={() => handleStatusChange(cat, "aprobado")}>
                                Volver a adopción
                              </button>
                            )}
                            {cat.estado !== "rechazado" && (
                              <button className="button button-secondary" disabled={adminSaving} onClick={() => handleStatusChange(cat, "rechazado")}>
                                Rechazar
                              </button>
                            )}
                            <button className="button button-danger" disabled={adminSaving} onClick={() => handleDeleteCat(cat)}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No hay avisos para moderar.</p>
                )}
              </>
            )}
          </section>
        ) : (
          <section className="content-section form-section" aria-labelledby="page-title">
            <div className="section-heading">
              <p className="eyebrow">Ayúdale a encontrar una familia</p>
              <h1 id="page-title">Agregar un gatito</h1>
              <p className="intro">Completa los datos y selecciona una foto. Revisaremos el aviso antes de publicarlo.</p>
            </div>

            <form className="cat-form" onSubmit={handleSubmit}>
              <label>
                Nombre del gatito
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  maxLength="80"
                  required
                />
              </label>
              <label>
                Foto (JPG, PNG o WebP; máximo 5 MB)
                <input
                  ref={photoInput}
                  name="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  required
                />
              </label>
              {previewUrl && <img className="photo-preview" src={previewUrl} alt="Vista previa de la foto" />}
              <label>
                Descripción
                <textarea
                  name="datos"
                  value={form.datos}
                  onChange={(event) => setForm({ ...form, datos: event.target.value })}
                  rows="4"
                  maxLength="500"
                  required
                />
              </label>
              <label>
                Edad
                <input
                  name="tiempo"
                  placeholder="Ej.: 3 meses"
                  value={form.tiempo}
                  onChange={(event) => setForm({ ...form, tiempo: event.target.value })}
                  maxLength="50"
                  required
                />
              </label>
              <label>
                WhatsApp con código de país
                <input
                  name="contacto"
                  type="tel"
                  placeholder="Ej.: +54 9 11 1234 5678"
                  value={form.contacto}
                  onChange={(event) => setForm({ ...form, contacto: event.target.value })}
                  maxLength="25"
                  required
                />
              </label>
              <div className="form-actions">
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? "Enviando..." : "Enviar aviso"}
                </button>
                <button
                  className="button button-secondary"
                  type="reset"
                  onClick={() => {
                    setForm(emptyForm);
                    setPhoto(null);
                    setPreviewUrl("");
                    if (photoInput.current) photoInput.current.value = "";
                    setNotice("");
                  }}
                >
                  Limpiar formulario
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <a href="https://github.com/Ale-pogo" target="_blank" rel="noreferrer" aria-label="Perfil de GitHub">
          <img src={footerLogo} alt="" />
        </a>
        <p>Adopción de Gatitos · Cada gatito merece un hogar</p>
        <img className="footer-hands" src={hands} alt="" />
      </footer>

      {selectedImage && (
        <div
          className="image-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedImage(null);
          }}
        >
          <section
            className="image-lightbox-content"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto completa de ${selectedImage.nombre}`}
          >
            <button
              className="image-lightbox-close"
              type="button"
              onClick={() => setSelectedImage(null)}
              aria-label="Cerrar imagen"
              autoFocus
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <img
              className="image-lightbox-photo"
              src={selectedImage.foto}
              alt={`Foto completa de ${selectedImage.nombre}`}
            />
            <p className="image-lightbox-caption">{selectedImage.nombre}</p>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
