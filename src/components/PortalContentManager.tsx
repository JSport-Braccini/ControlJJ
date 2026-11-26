import React, { useState } from 'react';
import {
  Megaphone,
  Camera,
  Plus,
  Trash2,
  Edit2,
  Check,
  Upload,
  Eye,
  EyeOff,
  Save,
  Quote,
  Sparkles,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  SystemConfig,
  Tournament,
  PortalPromotion,
  PastChampionshipHighlight,
} from '../types/championship';
import {
  PORTAL_PRESET_OPTIONS,
  resolvePortalImage,
  compressImageForPortal,
} from '../utils/portalImages';

interface PortalContentManagerProps {
  config: SystemConfig;
  tournaments: Tournament[];
  onUpdateConfig: (newConfig: Partial<SystemConfig>) => void;
}

export const PortalContentManager: React.FC<PortalContentManagerProps> = ({
  config,
  tournaments,
  onUpdateConfig,
}) => {
  // Hero Banner state
  const [heroTitle, setHeroTitle] = useState(
    config.heroTitle || 'Vive la emoción de los campeonatos oficiales en vivo'
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    config.heroSubtitle ||
      'Consulta el calendario de torneos vigentes, separa tu lugar o compra tus entradas digitales con código QR verificado al instante.'
  );
  const [heroCtaLabel, setHeroCtaLabel] = useState(
    config.heroCtaLabel || 'Ver Campeonatos y Entradas'
  );
  const [heroBannerUrl, setHeroBannerUrl] = useState(
    config.heroBannerUrl || 'preset:hero_volleyball'
  );
  const [heroSaved, setHeroSaved] = useState(false);

  // Promotions state
  const promotions = config.promotions || [];
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSubtitle, setPromoSubtitle] = useState('');
  const [promoCategory, setPromoCategory] = useState('Publicidad Oficial');
  const [promoCtaLabel, setPromoCtaLabel] = useState('Comprar / Separar Entrada');
  const [promoImageUrl, setPromoImageUrl] = useState('preset:past_action');
  const [promoTournamentId, setPromoTournamentId] = useState('');

  // Past Championships state
  const pastChampionships = config.pastChampionships || [];
  const [showPastForm, setShowPastForm] = useState(false);
  const [editingPastId, setEditingPastId] = useState<string | null>(null);
  const [pastName, setPastName] = useState('');
  const [pastEdition, setPastEdition] = useState('');
  const [pastPhotoUrl, setPastPhotoUrl] = useState('preset:past_trophy');
  const [pastComment, setPastComment] = useState('');
  const [pastAuthor, setPastAuthor] = useState('');
  const [pastRole, setPastRole] = useState('Espectador');

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleHeroSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      heroTitle: heroTitle.trim(),
      heroSubtitle: heroSubtitle.trim(),
      heroCtaLabel: heroCtaLabel.trim() || 'Ver Campeonatos y Entradas',
      heroBannerUrl,
    });
    setHeroSaved(true);
    setTimeout(() => setHeroSaved(false), 2500);
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }
    setUploadError(null);
    try {
      const compressed = await compressImageForPortal(file, 1100, 0.76);
      setter(compressed);
    } catch {
      setUploadError('No se pudo procesar la imagen seleccionada.');
    }
  };

  // --- Promotions CRUD ---
  const openCreatePromo = () => {
    setEditingPromoId(null);
    setPromoTitle('');
    setPromoSubtitle('');
    setPromoCategory('Publicidad Oficial');
    setPromoCtaLabel('Comprar / Separar Entrada');
    setPromoImageUrl('preset:past_action');
    setPromoTournamentId(tournaments[0]?.id || '');
    setShowPromoForm(true);
  };

  const openEditPromo = (promo: PortalPromotion) => {
    setEditingPromoId(promo.id);
    setPromoTitle(promo.title);
    setPromoSubtitle(promo.subtitle);
    setPromoCategory(promo.categoryLabel || 'Publicidad Oficial');
    setPromoCtaLabel(promo.ctaLabel || 'Comprar / Separar Entrada');
    setPromoImageUrl(promo.imageUrl);
    setPromoTournamentId(promo.linkedTournamentId || '');
    setShowPromoForm(true);
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoSubtitle.trim()) return;

    let updatedPromos: PortalPromotion[];
    if (editingPromoId) {
      updatedPromos = promotions.map((p) =>
        p.id === editingPromoId
          ? {
              ...p,
              title: promoTitle.trim(),
              subtitle: promoSubtitle.trim(),
              categoryLabel: promoCategory.trim() || 'Publicidad Oficial',
              ctaLabel: promoCtaLabel.trim() || 'Comprar / Separar Entrada',
              imageUrl: promoImageUrl,
              linkedTournamentId: promoTournamentId || undefined,
            }
          : p
      );
    } else {
      const newPromo: PortalPromotion = {
        id: `promo-${Date.now()}`,
        title: promoTitle.trim(),
        subtitle: promoSubtitle.trim(),
        categoryLabel: promoCategory.trim() || 'Publicidad Oficial',
        ctaLabel: promoCtaLabel.trim() || 'Comprar / Separar Entrada',
        imageUrl: promoImageUrl,
        linkedTournamentId: promoTournamentId || undefined,
        active: true,
        createdAt: new Date().toISOString(),
      };
      updatedPromos = [newPromo, ...promotions];
    }

    onUpdateConfig({ promotions: updatedPromos });
    setShowPromoForm(false);
    setEditingPromoId(null);
  };

  const togglePromoActive = (id: string) => {
    const updated = promotions.map((p) =>
      p.id === id ? { ...p, active: p.active === false ? true : false } : p
    );
    onUpdateConfig({ promotions: updated });
  };

  const deletePromo = (id: string) => {
    onUpdateConfig({ promotions: promotions.filter((p) => p.id !== id) });
  };

  // --- Past Championships CRUD ---
  const openCreatePast = () => {
    setEditingPastId(null);
    setPastName('');
    setPastEdition('Edición 2026');
    setPastPhotoUrl('preset:past_trophy');
    setPastComment('');
    setPastAuthor('');
    setPastRole('Espectador');
    setShowPastForm(true);
  };

  const openEditPast = (item: PastChampionshipHighlight) => {
    setEditingPastId(item.id);
    setPastName(item.championshipName);
    setPastEdition(item.editionOrDate);
    setPastPhotoUrl(item.photoUrl);
    setPastComment(item.comment);
    setPastAuthor(item.authorName);
    setPastRole(item.authorRole);
    setShowPastForm(true);
  };

  const handleSavePast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastName.trim() || !pastComment.trim() || !pastAuthor.trim()) return;

    let updatedPast: PastChampionshipHighlight[];
    if (editingPastId) {
      updatedPast = pastChampionships.map((item) =>
        item.id === editingPastId
          ? {
              ...item,
              championshipName: pastName.trim(),
              editionOrDate: pastEdition.trim() || 'Edición Oficial',
              photoUrl: pastPhotoUrl,
              comment: pastComment.trim(),
              authorName: pastAuthor.trim(),
              authorRole: pastRole.trim() || 'Espectador',
            }
          : item
      );
    } else {
      const newItem: PastChampionshipHighlight = {
        id: `past-${Date.now()}`,
        championshipName: pastName.trim(),
        editionOrDate: pastEdition.trim() || 'Edición Oficial',
        photoUrl: pastPhotoUrl,
        comment: pastComment.trim(),
        authorName: pastAuthor.trim(),
        authorRole: pastRole.trim() || 'Espectador',
        createdAt: new Date().toISOString(),
      };
      updatedPast = [newItem, ...pastChampionships];
    }

    onUpdateConfig({ pastChampionships: updatedPast });
    setShowPastForm(false);
    setEditingPastId(null);
  };

  const deletePast = (id: string) => {
    onUpdateConfig({
      pastChampionships: pastChampionships.filter((item) => item.id !== id),
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Publicidad y Portal Principal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra el banner principal, los anuncios publicitarios y las fotos con comentarios de campeonatos pasados visibles para todos los espectadores.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bloque 1: Portada / Hero Principal */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Portada Principal del Portal
            </h2>
          </div>
          {heroSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <Check className="w-3.5 h-3.5" />
              Portada actualizada en tiempo real
            </span>
          )}
        </div>

        <form onSubmit={handleHeroSave} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titular Principal
              </label>
              <input
                type="text"
                required
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                placeholder="Ej: Vive la emoción de los campeonatos oficiales en vivo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo Descriptivo
              </label>
              <textarea
                rows={3}
                required
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                placeholder="Describe brevemente la compra de entradas y fechas..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto del Botón Principal
                </label>
                <input
                  type="text"
                  value={heroCtaLabel}
                  onChange={(e) => setHeroCtaLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Imagen Predeterminada
                </label>
                <select
                  value={heroBannerUrl.startsWith('preset:') ? heroBannerUrl : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') setHeroBannerUrl(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  {PORTAL_PRESET_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                  {!heroBannerUrl.startsWith('preset:') && (
                    <option value="custom">Imagen personalizada subida</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-slate-300">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Banner Propio</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFileChange(e, setHeroBannerUrl)}
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A192F] hover:bg-[#122b50] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-red-400" />
                <span>Guardar Portada</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vista Previa del Banner
            </span>
            <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-[16/9] bg-[#0A192F]">
              <img
                src={resolvePortalImage(heroBannerUrl, 'preset:hero_volleyball')}
                alt="Vista previa portada"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A192F]/90 via-[#0A192F]/60 to-transparent p-4 flex flex-col justify-end">
                <span className="text-[10px] font-bold uppercase text-red-400 font-mono">
                  {config.systemName}
                </span>
                <p className="text-sm font-extrabold text-white line-clamp-2 mt-0.5">
                  {heroTitle}
                </p>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* Bloque 2: Publicidad y Anuncios */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Publicidad y Anuncios del Portal ({promotions.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={openCreatePromo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Publicidad</span>
          </button>
        </div>

        <div className="p-5">
          {promotions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No hay anuncios publicitarios creados. Haz clic en “Agregar Publicidad” para publicar flyers o promociones en la página principal.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className={`border rounded-xl overflow-hidden flex flex-col sm:flex-row ${
                    promo.active === false
                      ? 'border-slate-200 bg-slate-50 opacity-65'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="sm:w-40 aspect-[16/10] sm:aspect-auto bg-[#0A192F] shrink-0 overflow-hidden">
                    <img
                      src={resolvePortalImage(promo.imageUrl, 'preset:past_action')}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 font-mono">
                          {promo.categoryLabel || 'Publicidad'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {promo.active === false ? 'Oculto' : 'Visible'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{promo.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{promo.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => togglePromoActive(promo.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        {promo.active === false ? (
                          <>
                            <Eye className="w-3 h-3" /> Mostrar
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Ocultar
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPromo(promo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePromo(promo.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bloque 3: Fotos y Comentarios de Campeonatos Pasados */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Campeonatos Pasados: Fotos y Comentarios ({pastChampionships.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={openCreatePast}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0A192F] hover:bg-[#122b50] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-red-400" />
            <span>Agregar Foto y Comentario</span>
          </button>
        </div>

        <div className="p-5">
          {pastChampionships.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              Aún no hay recuerdos registrados de campeonatos pasados.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pastChampionships.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-[#0A192F] overflow-hidden">
                      <img
                        src={resolvePortalImage(item.photoUrl, 'preset:past_trophy')}
                        alt={item.championshipName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        <span className="text-red-600">{item.championshipName}</span>
                        <span className="mx-1">·</span>
                        <span>{item.editionOrDate}</span>
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed flex gap-1.5">
                        <Quote className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>“{item.comment}”</span>
                      </p>
                      <p className="text-[11px] text-slate-500 pt-1">
                        <strong className="text-slate-800">{item.authorName}</strong> ·{' '}
                        {item.authorRole}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPast(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePast(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal: Agregar / Editar Publicidad */}
      {showPromoForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0A192F] text-white flex items-center justify-between border-b-2 border-red-600">
              <span className="font-bold text-sm">
                {editingPromoId ? 'Editar Anuncio Publicitario' : 'Nueva Publicidad para Portal'}
              </span>
              <button
                type="button"
                onClick={() => setShowPromoForm(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título del Anuncio *
                </label>
                <input
                  type="text"
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Ej: Preventa Especial Cuartos de Final"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción / Detalle Promocional *
                </label>
                <textarea
                  rows={3}
                  required
                  value={promoSubtitle}
                  onChange={(e) => setPromoSubtitle(e.target.value)}
                  placeholder="Ej: Compra tus entradas online y accede sin colas..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Etiqueta / Rubro
                  </label>
                  <input
                    type="text"
                    value={promoCategory}
                    onChange={(e) => setPromoCategory(e.target.value)}
                    placeholder="Ej: Preventa VIP"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Texto del Enlace
                  </label>
                  <input
                    type="text"
                    value={promoCtaLabel}
                    onChange={(e) => setPromoCtaLabel(e.target.value)}
                    placeholder="Comprar / Separar Entrada"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enlazar a Campeonato (Al hacer clic)
                </label>
                <select
                  value={promoTournamentId}
                  onChange={(e) => setPromoTournamentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Campeonato principal activo</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.edition})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Imagen o Flyer de Publicidad
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={promoImageUrl.startsWith('preset:') ? promoImageUrl : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') setPromoImageUrl(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    {PORTAL_PRESET_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                    {!promoImageUrl.startsWith('preset:') && (
                      <option value="custom">Imagen subida personalizada</option>
                    )}
                  </select>

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer border border-slate-300">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, setPromoImageUrl)}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromoForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingPromoId ? 'Guardar Cambios' : 'Publicar Anuncio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar / Editar Foto y Comentario de Campeonato Pasado */}
      {showPastForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#0A192F] text-white flex items-center justify-between border-b-2 border-red-600">
              <span className="font-bold text-sm">
                {editingPastId
                  ? 'Editar Recuerdo de Campeonato Pasado'
                  : 'Agregar Foto y Comentario de Campeonato Pasado'}
              </span>
              <button
                type="button"
                onClick={() => setShowPastForm(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePast} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Campeonato Pasado *
                  </label>
                  <input
                    type="text"
                    required
                    value={pastName}
                    onChange={(e) => setPastName(e.target.value)}
                    placeholder="Ej: Copa Verano 2025"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Edición o Fecha
                  </label>
                  <input
                    type="text"
                    value={pastEdition}
                    onChange={(e) => setPastEdition(e.target.value)}
                    placeholder="Ej: Febrero 2025"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comentario / Testimonio *
                </label>
                <textarea
                  rows={3}
                  required
                  value={pastComment}
                  onChange={(e) => setPastComment(e.target.value)}
                  placeholder="Ej: Excelente jornada deportiva, coliseo lleno y rápido ingreso con QR..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Autor del Comentario *
                  </label>
                  <input
                    type="text"
                    required
                    value={pastAuthor}
                    onChange={(e) => setPastAuthor(e.target.value)}
                    placeholder="Ej: María Torres"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol / Tribuna
                  </label>
                  <input
                    type="text"
                    value={pastRole}
                    onChange={(e) => setPastRole(e.target.value)}
                    placeholder="Ej: Espectadora · Jugadora"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Fotografía del Campeonato
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pastPhotoUrl.startsWith('preset:') ? pastPhotoUrl : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') setPastPhotoUrl(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    {PORTAL_PRESET_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                    {!pastPhotoUrl.startsWith('preset:') && (
                      <option value="custom">Fotografía subida personalizada</option>
                    )}
                  </select>

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer border border-slate-300">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, setPastPhotoUrl)}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPastForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0A192F] hover:bg-[#122b50] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingPastId ? 'Guardar Cambios' : 'Publicar Recuerdo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
