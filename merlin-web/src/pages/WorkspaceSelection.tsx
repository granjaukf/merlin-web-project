import React, { useState, useEffect } from 'react';
import { Database, Plus, Network, Beaker, ArrowRight, Search, Download, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import merlinLogo from '../assets/merlin_logo.png';
import reconstructionGraphic from '../assets/reconstruction_white.png';

const API_BASE = 'http://localhost:8085/api';

export default function WorkspaceSelection() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // NCBI search state
  const [assemblies, setAssemblies] = useState([]);
  const [searchingAssemblies, setSearchingAssemblies] = useState(false);
  const [selectedAssemblyUid, setSelectedAssemblyUid] = useState('');
  const [isGenBank, setIsGenBank] = useState(false);
  const [importingGenome, setImportingGenome] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchWorkspaces = () => {
    setLoading(true);
    fetch(`${API_BASE}/workspaces`)
      .then(r => r.json())
      .then(data => setWorkspaces(data))
      .catch(err => console.error("Error fetching workspaces:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const searchNCBI = async () => {
    if (!taxId.trim()) return;
    setSearchingAssemblies(true);
    setError('');
    setAssemblies([]);
    try {
      const res = await fetch(`${API_BASE}/workspaces/ncbi-search?taxonomyID=${taxId}`);
      if (!res.ok) throw new Error('Falha ao pesquisar no NCBI');
      const data = await res.json();
      setAssemblies(data);
      if (data.length > 0) {
        setSelectedAssemblyUid(data[0].uid);
      } else {
        setError('Nenhuma montagem encontrada para este ID de Taxonomia.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pesquisar no NCBI.');
    } finally {
      setSearchingAssemblies(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      // 1. Criar base de dados do workspace
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, taxonomyID: taxId })
      });

      if (!res.ok) {
        let errorMsg = 'Falha ao criar workspace';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (e) {
          try {
            errorMsg = await res.text() || errorMsg;
          } catch (textErr) {}
        }
        throw new Error(errorMsg);
      }

      // 2. Se selecionou montagem NCBI, descarrega e importa
      if (taxId && selectedAssemblyUid) {
        setImportingGenome(true);
        const importRes = await fetch(`${API_BASE}/${name}/import-ncbi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxonomyID: taxId, uid: selectedAssemblyUid, isGenBank })
        });
        if (!importRes.ok) {
          let errorMsg = 'Falha ao importar dados do NCBI';
          try {
            const importData = await importRes.json();
            errorMsg = importData.error || errorMsg;
          } catch (e) {
            try {
              errorMsg = await importRes.text() || errorMsg;
            } catch (textErr) {}
          }
          throw new Error(errorMsg);
        }
      }

      // Sucesso
      const createdName = name;
      setName('');
      setTaxId('');
      setAssemblies([]);
      setSelectedAssemblyUid('');
      setShowCreate(false);
      fetchWorkspaces();
      navigate(`/workspace/${createdName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
      setImportingGenome(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openDelete = (ws) => {
    setDeleteTarget(ws);
    setDeleteConfirm('');
    setDeleteError('');
    setShowDelete(true);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!deleteTarget || deleteConfirm !== deleteTarget) return;

    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(deleteTarget)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        let errorMsg = 'Falha ao apagar workspace';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (err) {}
        throw new Error(errorMsg);
      }
      setShowDelete(false);
      fetchWorkspaces();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#181c20] text-slate-100 font-sans flex flex-col selection:bg-teal-500/20 selection:text-teal-300">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-8 py-5 bg-[#111417] border-b border-white/5 shadow-md z-10 relative shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src={merlinLogo} alt="merlin" className="h-8 object-contain" />
          <span className="font-extrabold text-2xl tracking-tight text-white font-sans lowercase">merlin</span>
        </div>
      </header>

      {/* Main split-screen container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 lg:p-12 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center overflow-hidden">
        {/* Left Side: Brand, Description, Graphic */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl py-6">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Metabolic Models <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">Reconstruction</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-xl">
            merlin makes it easier to reconstruct genome-scale metabolic models. It is a simple, graphical and user-oriented solution that guides you along the entire curation process.
          </p>
          <div className="w-full max-w-xl relative bg-[#111417]/40 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
            <img src={reconstructionGraphic} alt="Reconstruction Process" className="w-full h-auto object-contain opacity-95 hover:opacity-100 transition-opacity duration-500" />
          </div>
        </div>

        {/* Right Side: Launcher panel for Workspaces */}
        <div className="w-full lg:w-[420px] shrink-0 bg-[#111417]/85 border border-white/5 shadow-2xl rounded-2xl flex flex-col h-[550px] overflow-hidden backdrop-blur-md">
          {/* Header of launcher */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Workspaces</h2>
              <p className="text-sm text-slate-400 mt-0.5">Select or create a workspace</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors rounded-lg text-sm font-bold shadow-md shadow-teal-500/20"
            >
              <Plus size={15} />
              New Workspace
            </button>
          </div>

          {/* Launcher search / filter */}
          {workspaces.length > 0 && (
            <div className="p-4 border-b border-white/5 bg-slate-950/20">
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950 border border-white/5 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none text-sm transition-all"
              />
            </div>
          )}

          {/* Workspace List area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 py-12">
                <div className="w-6 h-6 border-2 border-white/10 border-t-teal-500 rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading</span>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-slate-950/10 text-slate-500">
                <Database size={40} className="mb-3 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-400 mb-1">No workspaces</h3>
                <p className="text-xs mb-4 max-w-[200px] text-center text-slate-500">Create a workspace to begin reconstruction.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors rounded-lg text-xs font-bold border border-teal-500/20"
                >
                  Create Workspace
                </button>
              </div>
            ) : (
              filteredWorkspaces.map(ws => (
                <div
                  key={ws}
                  onClick={() => navigate(`/workspace/${ws}`)}
                  className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-teal-500/40 hover:bg-white/[0.05] rounded-xl transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 text-slate-500 rounded-lg group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors shadow-inner">
                      <Database size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-base group-hover:text-teal-400 transition-colors">{ws}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                        <span className="flex items-center gap-1"><Beaker size={11} className="text-emerald-500" />Model</span>
                        <span className="flex items-center gap-1"><Network size={11} className="text-blue-500" />Pathways</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDelete(ws); }}
                      className="p-1.5 bg-slate-950/60 rounded-full border border-white/5 text-slate-500 hover:bg-red-500 hover:text-white hover:border-red-400/40 transition-all duration-200"
                      title={`Apagar workspace ${ws}`}
                      aria-label={`Apagar workspace ${ws}`}
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="bg-slate-950/60 p-1.5 rounded-full border border-white/5 group-hover:bg-teal-500 group-hover:text-slate-950 transition-all duration-200">
                      <ArrowRight size={12} className="text-slate-500 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-4">Create New Workspace</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Workspace Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. ecoli_model"
                  className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition-all"
                  disabled={creating}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Taxonomy ID (Opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="e.g. 511145"
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition-all"
                    disabled={creating}
                  />
                  {taxId.trim() && (
                    <button
                      type="button"
                      onClick={searchNCBI}
                      disabled={searchingAssemblies || creating}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {searchingAssemblies ? (
                        <div className="w-3.5 h-3.5 border border-teal-400/20 border-t-teal-400 rounded-full animate-spin" />
                      ) : (
                        <Search size={14} />
                      )}
                      Pesquisar
                    </button>
                  )}
                </div>
              </div>

              {assemblies.length > 0 && (
                <>
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Montagem NCBI (Assembly)</label>
                    <select
                      value={selectedAssemblyUid}
                      onChange={e => setSelectedAssemblyUid(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition-all"
                      disabled={creating}
                    >
                      {assemblies.map((asm: any) => (
                        <option key={asm.uid} value={asm.uid}>
                          {asm.assemblyName} ({asm.assemblyLevel || 'Nível n/d'}) - {asm.speciesName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
                    <input
                      type="checkbox"
                      id="isGenBank"
                      checked={isGenBank}
                      onChange={e => setIsGenBank(e.target.checked)}
                      className="rounded bg-slate-950 border-white/10 text-teal-500 focus:ring-0 focus:ring-offset-0"
                      disabled={creating}
                    />
                    <label htmlFor="isGenBank" className="text-xs text-slate-400 cursor-pointer select-none">
                      Usar base de dados GenBank (por defeito usa RefSeq)
                    </label>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-400 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setAssemblies([]);
                    setSelectedAssemblyUid('');
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white font-medium transition-colors"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 transition-colors rounded-lg text-sm font-bold shadow-md shadow-teal-500/10 flex items-center gap-1.5"
                >
                  {(creating || importingGenome) && (
                    <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  )}
                  {importingGenome
                    ? 'A descarregar genoma...'
                    : creating
                    ? 'A criar...'
                    : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Workspace</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Esta ação é <span className="text-red-400 font-bold">permanente</span>. Todos os dados do workspace{' '}
              <span className="text-white font-bold">{deleteTarget}</span> serão apagados.
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Para confirmar, escreva o nome do workspace abaixo:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget}
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm transition-all"
              disabled={deleting}
              autoFocus
            />
            {deleteError && (
              <div className="mt-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 rounded-lg text-sm font-medium">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white font-medium transition-colors"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== deleteTarget}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors rounded-lg text-sm font-bold shadow-md shadow-red-500/10 flex items-center gap-1.5"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
                Apagar Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
