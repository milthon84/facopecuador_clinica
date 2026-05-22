"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Activity,
  Heart,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  document_number?: string;
  phone?: string;
  email?: string;
}

interface EditarFichaClientPageProps {
  patient: Patient;
}

export default function EditarFichaClientPage({ patient }: EditarFichaClientPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ficha" | "odontogram">("ficha");

  // Collapsed sections by default (as requested by user)
  const [medicalHistoryExpanded, setMedicalHistoryExpanded] = useState(false);
  const [stomatognathicExpanded, setStomatognathicExpanded] = useState(false);
  
  // Permanent physical details
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");

  // Loading record from database
  const [loadingRecord, setLoadingRecord] = useState(true);

  // Pathologies / Medical history checkboxes
  const [medicalHistory, setMedicalHistory] = useState({
    alergia_antibiotico: false,
    alergia_anestesia: false,
    hemorragias: false,
    vih_sida: false,
    tuberculosis: false,
    diabetes: false,
    asma: false,
    hipertension: false,
    cardiovasculares: false,
    otros: "",
  });

  // Stomatognathic exam
  const [stomatognathic, setStomatognathic] = useState({
    labios: { status: "normal", desc: "" },
    mejillas: { status: "normal", desc: "" },
    maxilar_superior: { status: "normal", desc: "" },
    maxilar_inferior: { status: "normal", desc: "" },
    lengua: { status: "normal", desc: "" },
    paladar: { status: "normal", desc: "" },
    amigdalas: { status: "normal", desc: "" },
    otros: { status: "normal", desc: "" },
  });

  // Odontogram configuration
  const [dentitionMode, setDentitionMode] = useState<"adulta" | "infantil">("adulta");
  const [selectedTool, setSelectedTool] = useState<string>("caries");
  const [odontogram, setOdontogram] = useState<Record<string, any>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load existing patient records if they exist
  useEffect(() => {
    async function loadRecord() {
      try {
        const res = await fetch(`/api/admin/dental-records?patient_id=${patient.id}`);
        if (!res.ok) throw new Error("Error fetching record");
        const data = await res.json();
        
        if (data.record) {
          const rec = data.record;
          if (rec.date_of_birth) setBirthDate(rec.date_of_birth.substring(0, 10));
          if (rec.sex) setSex(rec.sex);
          if (rec.address) setAddress(rec.address);
          
          if (rec.medical_history) {
            setMedicalHistory((prev) => ({
              ...prev,
              ...rec.medical_history,
            }));
          }
          
          if (rec.stomatognathic_exam) {
            setStomatognathic((prev) => ({
              ...prev,
              ...rec.stomatognathic_exam,
            }));
          }
          
          if (rec.odontogram_state) {
            setOdontogram(rec.odontogram_state);
          }
        }
      } catch (err) {
        console.error("No se pudo cargar ficha dental anterior:", err);
      } finally {
        setLoadingRecord(false);
      }
    }
    loadRecord();
  }, [patient.id]);

  // Handle Odontogram interactions
  const handleSurfaceClick = (toothNum: number, surface: string, tool: string) => {
    setOdontogram((prev) => {
      const tooth = prev[toothNum] || { general: "sano", surfaces: {} };
      const surfaces = { ...tooth.surfaces };

      if (["corona", "perdida", "extraccion"].includes(tool)) {
        return {
          ...prev,
          [toothNum]: {
            ...tooth,
            general: tooth.general === tool ? "sano" : tool,
          },
        };
      } else if (tool === "sano") {
        delete surfaces[surface];
        return {
          ...prev,
          [toothNum]: {
            ...tooth,
            surfaces,
          },
        };
      } else {
        surfaces[surface] = surfaces[surface] === tool ? "sano" : tool;
        return {
          ...prev,
          [toothNum]: {
            ...tooth,
            surfaces,
          },
        };
      }
    });
  };

  const handleClearTooth = (toothNum: number) => {
    setOdontogram((prev) => {
      const updated = { ...prev };
      delete updated[toothNum];
      return updated;
    });
  };

  const handleResetAllOdontogram = () => {
    if (confirm("¿Estás seguro de que quieres restablecer todo el odontograma? Se perderán los cambios sin guardar.")) {
      setOdontogram({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/dental-records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient.id,
          date_of_birth: birthDate || null,
          sex: sex || null,
          address: address || null,
          medical_history: medicalHistory,
          stomatognathic_exam: stomatognathic,
          odontogram_state: odontogram,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocurrió un error al guardar");

      setSuccessMsg("¡Ficha dental permanente guardada con éxito!");
      
      // Navigate to reload data properly bypassing client cache
      window.location.replace(`/admin/pacientes/${patient.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar la ficha dental.");
      setIsSubmitting(false);
    }
  };

  // Dentition mappings
  const adultUpperQuad1 = [18, 17, 16, 15, 14, 13, 12, 11];
  const adultUpperQuad2 = [21, 22, 23, 24, 25, 26, 27, 28];
  const adultLowerQuad4 = [48, 47, 46, 45, 44, 43, 42, 41];
  const adultLowerQuad3 = [31, 32, 33, 34, 35, 36, 37, 38];

  const childUpperQuad5 = [55, 54, 53, 52, 51];
  const childUpperQuad6 = [61, 62, 63, 64, 65];
  const childLowerQuad8 = [85, 84, 83, 82, 81];
  const childLowerQuad7 = [71, 72, 73, 74, 75];

  const tools = [
    { id: "caries", label: "Caries (Rojo)", color: "bg-red-500 border-red-600 text-white", desc: "Daño en esmalte/superficie" },
    { id: "sellante_necesario", label: "Sellante Req.", color: "bg-blue-100 border-blue-400 text-blue-700", desc: "Requiere aplicación profiláctica" },
    { id: "sellante_realizado", label: "Sellante Realiz.", color: "bg-blue-600 border-blue-700 text-white", desc: "Sellante ya colocado" },
    { id: "corona", label: "Corona (Dorado)", color: "bg-gold-50 border-gold-500 text-gold-700 ring-2 ring-gold-200", desc: "Corona protésica (Afecta todo el diente)" },
    { id: "perdida", label: "Ausente", color: "bg-white border-red-400 text-red-600 ring-2 ring-red-100", desc: "Diente ausente o perdido" },
    { id: "extraccion", label: "Extracción", color: "bg-white border-amber-500 text-amber-700 ring-2 ring-amber-100", desc: "Requiere extracción indicada" },
    { id: "sano", label: "Borrador", color: "bg-ink-900 text-white border-ink-900", desc: "Limpiar/Borrar anomalías" },
  ];

  const hasRiskFactors = Object.entries(medicalHistory).some(([k, v]) => k !== "otros" && v === true);
  const hasStomatognathicAlterations = Object.values(stomatognathic).some(
    (exam: any) => exam?.status === "alteracion"
  );

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <Link
        href={`/admin/pacientes/${patient.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900 mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Volver al Perfil del Paciente
      </Link>

      <div className="bg-ink-900 text-white rounded-3xl p-6 mb-6 shadow-md border border-ink-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gold-400 font-bold mb-1">Edición de Ficha Clínica Permanente</div>
            <h1 className="text-2xl font-bold text-gold-500">{patient.full_name}</h1>
            <p className="text-xs text-lilac-200 mt-0.5">
              Cédula: {patient.document_number || "No registrada"} · Tel: {patient.phone || "No registrado"}
            </p>
          </div>
          <div className="bg-ink-850 border border-gold-900/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-gold-400">
            <Sparkles size={18} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Editor Directo</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold text-sm">Error al guardar</div>
            <div className="text-xs">{errorMsg}</div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold text-sm">Éxito</div>
            <div className="text-xs">{successMsg}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-lilac-100 mb-6 overflow-x-auto gap-2 bg-white p-1.5 rounded-2xl shadow-sm border">
        <button
          type="button"
          onClick={() => setActiveTab("ficha")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "ficha"
              ? "bg-lilac-100 text-lilac-900 shadow-sm"
              : "text-ink-600 hover:bg-lilac-50/50"
          }`}
        >
          <Activity size={16} /> 1. Datos Físicos y Antecedentes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("odontogram")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "odontogram"
              ? "bg-lilac-100 text-lilac-900 shadow-sm"
              : "text-ink-600 hover:bg-lilac-50/50"
          }`}
        >
          <Sparkles size={16} className="text-gold-600" /> 2. Odontograma Consolidado
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tab 1: Ficha y Antecedentes */}
        {activeTab === "ficha" && (
          <div className="space-y-6">
            <div className="card p-6 bg-white border border-lilac-100 shadow-sm">
              <h2 className="text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
                <Info className="text-gold-500" size={18} /> Datos Físicos del Paciente
              </h2>
              {loadingRecord ? (
                <div className="text-xs text-ink-600 animate-pulse py-4">Cargando datos clínicos de la ficha...</div>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-700 uppercase mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full text-sm rounded-xl border border-lilac-200 px-3 py-2 bg-lilac-50/20 focus:border-lilac-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 uppercase mb-1">Sexo</label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full text-sm rounded-xl border border-lilac-200 px-3 py-2 bg-lilac-50/20 focus:border-lilac-500 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 uppercase mb-1">Dirección de Domicilio</label>
                    <input
                      type="text"
                      placeholder="Calle Principal, Nro, Ciudad"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-sm rounded-xl border border-lilac-200 px-3 py-2 bg-lilac-50/20 focus:border-lilac-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="card bg-white border border-lilac-100 shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setMedicalHistoryExpanded(!medicalHistoryExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-lilac-50/20 transition-all text-left outline-none"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Heart className="text-red-500 animate-pulse" size={18} />
                  <h2 className="text-lg font-bold text-ink-900">
                    Antecedentes Médicos (Historia de Salud)
                  </h2>
                  {!medicalHistoryExpanded && hasRiskFactors && (
                    <span className="bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-100 flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={12} /> Antecedente Clínico Detectado
                    </span>
                  )}
                </div>
                {medicalHistoryExpanded ? (
                  <ChevronUp className="text-ink-500 shrink-0" size={20} />
                ) : (
                  <ChevronDown className="text-ink-500 shrink-0" size={20} />
                )}
              </button>

              {medicalHistoryExpanded && (
                <div className="px-6 pb-6 pt-0 border-t border-lilac-50">
                  <p className="text-xs text-ink-600 mb-4 pt-4">
                    Marque los antecedentes clínicos que apliquen para el paciente en su historia de salud permanente.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: "alergia_antibiotico", label: "Alergia a Antibióticos" },
                      { id: "alergia_anestesia", label: "Alergia a la Anestesia" },
                      { id: "hemorragias", label: "Problemas de Hemorragias" },
                      { id: "vih_sida", label: "VIH / SIDA" },
                      { id: "tuberculosis", label: "Tuberculosis" },
                      { id: "diabetes", label: "Diabetes Mellitus" },
                      { id: "asma", label: "Asma Bronquial" },
                      { id: "hipertension", label: "Hipertensión Arterial" },
                      { id: "cardiovasculares", label: "Enfermedades Cardíacas" },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-lilac-50 hover:bg-lilac-50/30 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={(medicalHistory as any)[item.id] || false}
                          onChange={(e) =>
                            setMedicalHistory((prev) => ({
                              ...prev,
                              [item.id]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-lilac-600 border-lilac-300 focus:ring-lilac-500"
                        />
                        <span className="text-sm text-ink-900 font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-ink-700 uppercase mb-1">Otros Antecedentes / Observaciones</label>
                    <textarea
                      rows={2}
                      placeholder="Detallar alergias adicionales, medicamentos consumidos regularmente, cirugías recientes..."
                      value={medicalHistory.otros || ""}
                      onChange={(e) =>
                        setMedicalHistory((prev) => ({
                          ...prev,
                          otros: e.target.value,
                        }))
                      }
                      className="w-full text-sm rounded-xl border border-lilac-200 px-3 py-2 bg-lilac-50/20 focus:border-lilac-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="card bg-white border border-lilac-100 shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setStomatognathicExpanded(!stomatognathicExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-lilac-50/20 transition-all text-left outline-none"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="text-gold-600" size={18} />
                  <h2 className="text-lg font-bold text-ink-900">
                    Examen del Sistema Estomatognático
                  </h2>
                  {!stomatognathicExpanded && hasStomatognathicAlterations && (
                    <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                      <AlertTriangle size={12} /> Alteración Detectada
                    </span>
                  )}
                </div>
                {stomatognathicExpanded ? (
                  <ChevronUp className="text-ink-500 shrink-0" size={20} />
                ) : (
                  <ChevronDown className="text-ink-500 shrink-0" size={20} />
                )}
              </button>

              {stomatognathicExpanded && (
                <div className="px-6 pb-6 pt-0 border-t border-lilac-50">
                  <p className="text-xs text-ink-600 mb-4 pt-4">
                    Identifique si alguna de las siguientes zonas presenta anomalías patológicas.
                  </p>

                  <div className="space-y-4">
                    {[
                      { id: "labios", label: "1. Labios" },
                      { id: "mejillas", label: "2. Mejillas" },
                      { id: "maxilar_superior", label: "3. Maxilar Superior" },
                      { id: "maxilar_inferior", label: "4. Maxilar Inferior" },
                      { id: "lengua", label: "5. Lengua" },
                      { id: "paladar", label: "6. Paladar" },
                      { id: "amigdalas", label: "7. Amígdalas" },
                      { id: "otros", label: "8. Otros (Higiene, etc.)" },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-lilac-50 hover:bg-lilac-50/10"
                      >
                        <div className="sm:w-1/3">
                          <span className="text-sm font-semibold text-ink-900">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-4 sm:w-1/4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`exam_${item.id}`}
                              value="normal"
                              checked={(stomatognathic as any)[item.id]?.status === "normal"}
                              onChange={() =>
                                setStomatognathic((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...(prev as any)[item.id],
                                    status: "normal",
                                  },
                                }))
                              }
                              className="w-4 h-4 text-lilac-600 focus:ring-lilac-500"
                            />
                            <span className="text-xs font-semibold text-ink-700">Normal</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`exam_${item.id}`}
                              value="alteracion"
                              checked={(stomatognathic as any)[item.id]?.status === "alteracion"}
                              onChange={() =>
                                setStomatognathic((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...(prev as any)[item.id],
                                    status: "alteracion",
                                  },
                                }))
                              }
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-xs font-semibold text-red-700">Alteración</span>
                          </label>
                        </div>
                        <div className="flex-1">
                          {(stomatognathic as any)[item.id]?.status === "alteracion" && (
                            <input
                              type="text"
                              placeholder="Describa la alteración estomatognática hallada..."
                              value={(stomatognathic as any)[item.id]?.desc || ""}
                              onChange={(e) =>
                                setStomatognathic((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...(prev as any)[item.id],
                                    desc: e.target.value,
                                  },
                                }))
                              }
                              className="w-full text-xs rounded-xl border border-red-200 px-3 py-1.5 bg-red-50/20 focus:border-red-400 outline-none text-red-900"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center bg-gold-600 hover:bg-gold-700 disabled:bg-gold-300 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando Ficha...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Guardar Ficha Permanente
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("odontogram")}
                className="inline-flex items-center justify-center bg-white border border-lilac-200 text-ink-700 hover:bg-lilac-50/50 font-medium text-sm px-6 py-2.5 rounded-xl transition-all gap-1"
              >
                Continuar a Odontograma <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Odontograma */}
        {activeTab === "odontogram" && (
          <div className="space-y-6">
            <div className="card p-6 bg-white border border-lilac-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
                    <Sparkles className="text-gold-600" size={18} /> Odontograma Clínico Permanente
                  </h2>
                  <p className="text-xs text-ink-600 mt-0.5">
                    Modifique las condiciones consolidadas del paciente. Esto actualizará su ficha clínica permanente.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDentitionMode("adulta")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dentitionMode === "adulta"
                        ? "bg-gold-600 text-white shadow-sm"
                        : "bg-lilac-50 text-ink-700 hover:bg-lilac-100"
                    }`}
                  >
                    Dentición Adulta
                  </button>
                  <button
                    type="button"
                    onClick={() => setDentitionMode("infantil")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dentitionMode === "infantil"
                        ? "bg-gold-600 text-white shadow-sm"
                        : "bg-lilac-50 text-ink-700 hover:bg-lilac-100"
                    }`}
                  >
                    Dentición Infantil
                  </button>
                </div>
              </div>

              {/* Tools Palette */}
              <div className="bg-lilac-50/55 rounded-2xl p-4 border border-lilac-100 mb-6">
                <div className="text-xs font-bold text-ink-700 uppercase mb-2">Herramienta Seleccionada</div>
                <div className="flex flex-wrap gap-2">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTool(t.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-start gap-0.5 text-left ${
                        selectedTool === t.id
                          ? `${t.color} scale-105 shadow-md`
                          : "bg-white border-lilac-100 text-ink-700 hover:border-lilac-300 hover:bg-lilac-50/20"
                      }`}
                    >
                      <span className="font-bold">{t.label}</span>
                      <span className="text-[10px] opacity-80 font-normal">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphic Odontogram */}
              <div className="border border-lilac-100 rounded-2xl p-4 overflow-x-auto bg-lilac-50/10">
                <div className="min-w-[760px] space-y-8 select-none py-4">
                  {dentitionMode === "adulta" ? (
                    <>
                      {/* Upper teeth */}
                      <div>
                        <div className="text-center text-[10px] font-bold text-lilac-800 uppercase tracking-widest mb-3">Piezas Superiores (Dentición Adulta)</div>
                        <div className="flex justify-between items-center relative">
                          <div className="flex gap-2 flex-1 justify-end pr-4">
                            {adultUpperQuad1.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>

                          {/* Center Divider Line */}
                          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gold-500/80 w-0 z-10" />

                          {/* Quad 2 */}
                          <div className="flex gap-2 flex-1 justify-start pl-4">
                            {adultUpperQuad2.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Lower teeth */}
                      <div className="pt-4 border-t border-lilac-100">
                        <div className="text-center text-[10px] font-bold text-lilac-800 uppercase tracking-widest mb-3">Piezas Inferiores (Dentición Adulta)</div>
                        <div className="flex justify-between items-center relative">
                          {/* Quad 4 */}
                          <div className="flex gap-2 flex-1 justify-end pr-4">
                            {adultLowerQuad4.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>

                          {/* Center Divider Line */}
                          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gold-500/80 w-0 z-10" />

                          {/* Quad 3 */}
                          <div className="flex gap-2 flex-1 justify-start pl-4">
                            {adultLowerQuad3.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Children Upper */}
                      <div>
                        <div className="text-center text-[10px] font-bold text-lilac-800 uppercase tracking-widest mb-3">Piezas Superiores (Dentición Infantil)</div>
                        <div className="flex justify-between items-center relative">
                          {/* Quad 5 */}
                          <div className="flex gap-3 flex-1 justify-end pr-6">
                            {childUpperQuad5.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>

                          {/* Center Divider Line */}
                          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gold-500/80 w-0 z-10" />

                          {/* Quad 6 */}
                          <div className="flex gap-3 flex-1 justify-start pl-6">
                            {childUpperQuad6.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Children Lower */}
                      <div className="pt-4 border-t border-lilac-100">
                        <div className="text-center text-[10px] font-bold text-lilac-800 uppercase tracking-widest mb-3">Piezas Inferiores (Dentición Infantil)</div>
                        <div className="flex justify-between items-center relative">
                          {/* Quad 8 */}
                          <div className="flex gap-3 flex-1 justify-end pr-6">
                            {childLowerQuad8.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>

                          {/* Center Divider Line */}
                          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gold-500/80 w-0 z-10" />

                          {/* Quad 7 */}
                          <div className="flex gap-3 flex-1 justify-start pl-6">
                            {childLowerQuad7.map((tNum) => (
                              <Tooth
                                key={tNum}
                                toothNum={tNum}
                                state={odontogram[tNum]}
                                selectedTool={selectedTool}
                                onSurfaceClick={handleSurfaceClick}
                                onClearTooth={handleClearTooth}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-5">
                <button
                  type="button"
                  onClick={handleResetAllOdontogram}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                >
                  <RotateCcw size={14} /> Restablecer Odontograma
                </button>
                <div className="text-xs text-ink-500 italic">
                  *Los cambios modifican directamente la ficha clínica del paciente.
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("ficha")}
                className="inline-flex items-center justify-center bg-white border border-lilac-200 text-ink-700 hover:bg-lilac-50/50 font-medium text-sm px-6 py-2.5 rounded-xl transition-all gap-1"
              >
                <ChevronLeft size={16} /> Volver a Antecedentes
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center bg-gold-600 hover:bg-gold-700 disabled:bg-gold-300 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando Ficha...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Guardar Ficha Permanente
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function Tooth({
  toothNum,
  state = {},
  selectedTool,
  onSurfaceClick,
  onClearTooth,
}: {
  toothNum: number;
  state: any;
  selectedTool: string;
  onSurfaceClick: (toothNum: number, surface: string, tool: string) => void;
  onClearTooth: (toothNum: number) => void;
}) {
  const general = state.general || "sano";
  const surfaces = state.surfaces || {};

  const handlePartClick = (surfaceKey: string) => {
    onSurfaceClick(toothNum, surfaceKey, selectedTool);
  };

  const getSurfaceColorClass = (surfKey: string) => {
    const cond = surfaces[surfKey];
    if (cond === "caries") return "fill-red-500 hover:fill-red-600 stroke-red-600";
    if (cond === "sellante_necesario") return "fill-blue-100 hover:fill-blue-200 stroke-blue-500 stroke-dasharray-[2_2]";
    if (cond === "sellante_realizado") return "fill-blue-500 hover:fill-blue-600 stroke-blue-600";
    return "fill-white hover:fill-gold-50 stroke-lilac-200";
  };

  const centerColorClass = getSurfaceColorClass("center");

  return (
    <div className="flex flex-col items-center p-1.5 bg-white rounded-xl border border-lilac-50 hover:border-lilac-200 transition-all shadow-sm">
      <div className="text-[10px] font-bold text-ink-800 mb-1">{toothNum}</div>
      <div className="relative w-[50px] h-[50px]">
        <svg viewBox="0 0 60 60" className="w-full h-full">
          {/* Top (Vestibular) */}
          <polygon
            points="0,0 60,0 42,18 18,18"
            className={`transition-colors cursor-pointer stroke-[1px] ${getSurfaceColorClass("top")}`}
            onClick={() => handlePartClick("top")}
          />
          {/* Bottom (Lingual/Palatino) */}
          <polygon
            points="0,60 60,60 42,42 18,42"
            className={`transition-colors cursor-pointer stroke-[1px] ${getSurfaceColorClass("bottom")}`}
            onClick={() => handlePartClick("bottom")}
          />
          {/* Left (Distal/Mesial) */}
          <polygon
            points="0,0 18,18 18,42 0,60"
            className={`transition-colors cursor-pointer stroke-[1px] ${getSurfaceColorClass("left")}`}
            onClick={() => handlePartClick("left")}
          />
          {/* Right (Mesial/Distal) */}
          <polygon
            points="60,0 42,18 42,42 60,60"
            className={`transition-colors cursor-pointer stroke-[1px] ${getSurfaceColorClass("right")}`}
            onClick={() => handlePartClick("right")}
          />
          {/* Center (Oclusal) */}
          <rect
            x="18"
            y="18"
            width="24"
            height="24"
            className={`transition-colors cursor-pointer stroke-[1px] ${centerColorClass}`}
            onClick={() => handlePartClick("center")}
          />

          {/* Overlays for whole-tooth state */}
          {general === "corona" && (
            <circle
              cx="30"
              cy="30"
              r="27"
              fill="none"
              stroke="#C9A961"
              strokeWidth="3.5"
              className="pointer-events-none"
            />
          )}

          {general === "perdida" && (
            <>
              <line x1="5" y1="5" x2="55" y2="55" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" className="pointer-events-none" />
              <line x1="55" y1="5" x2="5" y2="55" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" className="pointer-events-none" />
            </>
          )}

          {general === "extraccion" && (
            <line x1="5" y1="55" x2="55" y2="5" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" className="pointer-events-none" />
          )}
        </svg>
      </div>
      
      {/* Clear action under tooth */}
      {(general !== "sano" || Object.keys(surfaces).length > 0) && (
        <button
          type="button"
          onClick={() => onClearTooth(toothNum)}
          className="text-[9px] text-red-500 hover:text-red-700 mt-1 font-semibold transition-colors"
          title="Limpiar"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
