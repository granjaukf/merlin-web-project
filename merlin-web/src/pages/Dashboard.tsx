import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Upload, Dna, Activity, FlaskConical, Binary, Layers, HelpCircle } from 'lucide-react';
import GenomeImportModal from '../components/GenomeImportModal';

interface WorkspaceStats {
  isCompartmentalised: boolean;
  totalReactions: number;
  totalGenes: number;
  totalGenesInModel: number;
  totalProteins: number;
  totalEnzymes: number;
  totalMetabolites: number;
}

export default function Dashboard() {
  const { name } = useParams();
  const [showImport, setShowImport] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    if (!name) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8085/api/${name}/stats`);
      if (!response.ok) {
        throw new Error('Failed to load workspace statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [name]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{name}</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Workspace Dashboard</p>
          </div>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
        >
          <Upload size={16} />
          Importar Genoma
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[300px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-medium">Carregando estatísticas do modelo...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center shadow-sm">
          <p className="text-red-700 font-semibold text-sm">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reaction Stats Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reações</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalReactions}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Reações metabólicas no modelo</p>
            </div>
          </div>

          {/* Genes Stats Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Dna size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Genes</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalGenes}</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-bold text-teal-600">{stats.totalGenesInModel}</span> integrados no modelo
              </p>
            </div>
          </div>

          {/* Proteins / Enzymes Stats Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Binary size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proteínas</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalProteins}</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Sendo <span className="font-bold text-indigo-600">{stats.totalEnzymes}</span> enzimas identificadas
              </p>
            </div>
          </div>

          {/* Metabolites Stats Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FlaskConical size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metabolitos</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalMetabolites}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Compostos e metabolitos totais</p>
            </div>
          </div>

          {/* Status Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.isCompartmentalised ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                <Layers size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Estado de Compartimentalização</h4>
                <p className="text-xs text-slate-500 mt-0.5">Identificação da localização intracelular e extracellular das reações</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              stats.isCompartmentalised
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {stats.isCompartmentalised ? 'Compartimentalizado' : 'Não Compartimentalizado'}
            </span>
          </div>
        </div>
      ) : null}

      {showImport && name && (
        <GenomeImportModal workspaceName={name} onClose={() => {
          setShowImport(false);
          fetchStats(); // refresh statistics after upload is closed
        }} />
      )}
    </div>
  );
}
