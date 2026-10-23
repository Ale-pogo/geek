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

function App() {
  const [page, setPage] = useState("list");
  const [gatitos, setGatitos] = useState(supabase ? [] : existingCats.gatitos);
  const [selectedImage, setSelectedImage] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const photoInput = useRef(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
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
          .from("gatitos")
          .select("id, nombre, foto, datos, tiempo, contacto")
          .eq("estado", "aprobado")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const storagePaths = (data ?? [])
          .map((gatito) => gatito.foto)
          .filter((foto) => !/^https?:\/\//i.test(foto));
        let signedUrls = new Map();
        if (storagePaths.length) {
          const { data: signedPhotos, error: signedError } = await supabase.storage
            .from(storageBucket)
            .createSignedUrls(storagePaths, 3600);
          if (signedError) throw signedError;
          signedUrls = new Map(signedPhotos.map(({ path, signedUrl }) => [path, signedUrl]));
        }

        if (isMounted) {
          setGatitos(
            (data ?? []).map((gatito) => ({
              ...gatito,
              foto: signedUrls.get(gatito.foto) ?? gatito.foto,
            })),
          );
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

  const filteredGatitos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return gatitos;
    return gatitos.filter((gatito) =>
      `${gatito.nombre} ${gatito.datos}`.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  }, [gatitos, query]);

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
          {page === "list" ? (
            <>
              <label className="search-box">
                <span className="visually-hidden">Buscar gatitos</span>
                <input
                  type="search"
                  placeholder="Buscar gatito..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button className="button button-primary" onClick={openForm}>
                Agregar Gatito
              </button>
            </>
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

        {page === "list" ? (
          <section className="content-section" aria-labelledby="page-title">
            <div className="section-heading">
              <p className="eyebrow">Un hogar puede cambiarlo todo</p>
              <h1 id="page-title">Gatitos en adopción</h1>
              <p className="intro">Conoce a quienes buscan una familia y contacta a su cuidador.</p>
            </div>

            {loading ? (
              <p className="empty-state" role="status">Cargando gatitos...</p>
            ) : filteredGatitos.length ? (
              <div className="gatitos-grid">
                {filteredGatitos.map((gatito) => (
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
                      <a
                        className="contact-link"
                        href={`https://wa.me/${gatito.contacto.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img src={whatsappIcon} alt="" />
                        Contactar por WhatsApp
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {query ? "No encontramos gatitos con esa búsqueda." : "Todavía no hay avisos publicados."}
              </p>
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
