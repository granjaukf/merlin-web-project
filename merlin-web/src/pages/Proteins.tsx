import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Eye, BarChart3, HelpCircle, FileSpreadsheet, X, Plus, Pencil, Trash2 } from 'lucide-react';

const PROTEIN_CLASSES = ['ENZYME', 'TRANSPORTER', 'COMPLEX', 'OTHER'];

const emptyForm = { name: '', classType: 'ENZYME', ecNumber: '' };

export default function Proteins() {
  const { name } = useParams();
  const [proteins, setProteins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [filterType, setFilterType] = useState<'all' | 'in_model'>('all');

  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProteinForDetail, setSelectedProteinForDetail] = useState<any>(null);
  const [detailTabs, setDetailTabs] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('reactions');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Insert / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'insert' | 'edit'>('insert');
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formTarget, setFormTarget] = useState<any>(null);

  // ── Fetch proteins ──────────────────────────────────────────────────────────

  const fetchProteins = async () => {
    setLoading(true);
    try {
      const isEncoded = filterType === 'in_model';
      const response = await fetch(`http://localhost:8085/api/${name}/proteins?encodedOnly=${isEncoded}`);
      if (!response.ok) throw new Error('Failed to fetch proteins');
      setProteins(await response.json());
    } catch (error) {
      console.error('Error fetching proteins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`http://localhost:8085/api/${name}/proteins/statistics`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats({
        totalProteins: data.totalProteins,
        totalEnzymes: data.totalEnzymes,
        unnamedProteins: 0,
        synonymsCount: data.synonymsCount,
        avgSynonyms: data.averageSynonyms,
        transporters: data.onlyTransporters,
        complexes: data.complexes,
        associatedToGenes: data.associatedToGenes,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchProteins(); }, [name, filterType]);
  useEffect(() => { if (activeTab === 'stats') fetchStats(); }, [name, activeTab]);

  // ── Local filtering ─────────────────────────────────────────────────────────

  const filteredProteins = useMemo(() => {
    return proteins.filter(p => {
      const term = searchTerm.toLowerCase();
      return (p.name && p.name.toLowerCase().includes(term))
        || (p.ecNumber && p.ecNumber.toLowerCase().includes(term))
        || (p.abbreviation && p.abbreviation.toLowerCase().includes(term));
    });
  }, [proteins, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

  const totalPages = Math.ceil(filteredProteins.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProteins = filteredProteins.slice(startIndex, startIndex + itemsPerPage);

  // ── Detail modal ────────────────────────────────────────────────────────────

  const handleOpenDetails = async (protein: any) => {
    setSelectedProteinForDetail(protein);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/proteins/${protein.id}/detail`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setDetailTabs(data);
      const keys = Object.keys(data);
      if (keys.length > 0) setActiveDetailTab(keys[0]);
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Form (Insert / Edit) ────────────────────────────────────────────────────

  const handleOpenInsert = () => {
    setFormMode('insert');
    setFormData({ ...emptyForm });
    setFormTarget(null);
    setShowForm(true);
  };

  const handleOpenEdit = (p: any) => {
    setFormMode('edit');
    setFormData({
      name: p.name || '',
      classType: p.classType || 'ENZYME',
      ecNumber: p.ecNumber || '',
    });
    setFormTarget(p);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formMode === 'insert') {
        const res = await fetch(`http://localhost:8085/api/${name}/proteins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to insert protein');
        await fetchProteins();
      } else {
        const res = await fetch(`http://localhost:8085/api/${name}/proteins/${formTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to update protein');
        setProteins(prev => prev.map(p => p.id === formTarget.id ? { ...p, ...formData } : p));
      }
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (p: any) => {
    if (!window.confirm(`Remove protein "${p.name}" from the workspace?`)) return;
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/proteins/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete protein');
      setProteins(prev => prev.filter(x => x.id !== p.id));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ── CSV Export ───────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ['Name', 'EC Number', 'Identifier', 'Reactions', 'Genes', 'In Model'];
    const rows = proteins.map(p => [p.name, p.ecNumber, p.abbreviation, p.numReactions, p.numGenes, p.inModel]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `proteins_${name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden ring-1 ring-slate-900/5 font-sans">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-white shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Proteins for {name}</h2>
          <p className="text-sm text-slate-500 mt-1">Detailed catalog of genome proteins, enzymes, reactions and encoding genes.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            >Proteins</button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            ><BarChart3 size={14} />Statistics</button>
          </div>

          {!loading && activeTab === 'list' && (
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-teal-600/20">
              {filteredProteins.length} {filteredProteins.length === 1 ? 'Protein' : 'Proteins'}
            </span>
          )}

          <button
            onClick={handleOpenInsert}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-md shadow-teal-900/10 transition-colors"
          ><Plus size={16} />Insert Protein</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters Bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, EC number, class..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-xs"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200 shadow-inner text-sm font-medium">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 rounded-md transition-all duration-200 ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >All</button>
                <button
                  onClick={() => setFilterType('in_model')}
                  className={`px-4 py-1.5 rounded-md transition-all duration-200 ${filterType === 'in_model' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >In Model</button>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-xs"
              ><FileSpreadsheet size={14} className="text-emerald-600" />Export CSV</button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/80 backdrop-blur-xs">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading proteins list...</span>
              </div>
            ) : currentProteins.length > 0 ? (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none z-10">
                  <tr>
                    <th className="py-3 px-6 w-12 text-center">Info</th>
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-6">EC Number</th>
                    <th className="py-3 px-6">Identifier</th>
                    <th className="py-3 px-6 text-center">Reactions</th>
                    <th className="py-3 px-6 text-center">Genes</th>
                    <th className="py-3 px-6 text-center">In Model</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {currentProteins.map((p, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleOpenDetails(p)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="View Details"
                        ><Eye size={16} /></button>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900 max-w-sm truncate group-hover:text-teal-700 transition-colors" title={p.name}>{p.name}</td>
                      <td className="py-3.5 px-6 font-mono text-xs">{p.ecNumber || '-'}</td>
                      <td className="py-3.5 px-6 font-medium text-slate-500">{p.abbreviation || '-'}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-800">{p.numReactions}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-800">{p.numGenes}</td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${p.inModel ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                          {p.inModel ? 'true' : 'false'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Protein"
                          ><Pencil size={14} /></button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Protein"
                          ><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-white">
                <HelpCircle size={40} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No proteins found matching filters</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="bg-white border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-sm shrink-0 select-none">
            <span className="text-slate-500">
              Showing <strong className="font-medium text-slate-900">{startIndex + 1}</strong> to <strong className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, filteredProteins.length)}</strong> of <strong className="font-medium text-slate-900">{filteredProteins.length}</strong> results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
              >Previous</button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
              >Next</button>
            </div>
          </div>
        </>
      ) : (
        /* Statistics Tab */
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/50 relative">
          {loadingStats ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading statistics...</span>
            </div>
          ) : stats ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Number of proteins', value: stats.totalProteins, desc: 'Total proteins loaded' },
                  { title: 'Proteins with no name', value: stats.unnamedProteins, desc: 'Missing nomenclature' },
                  { title: 'Protein synonyms', value: stats.synonymsCount, desc: 'Identified aliases' },
                  { title: 'Average synonyms per protein', value: stats.avgSynonyms, desc: 'Average alias frequency' },
                  { title: 'Enzyme proteins', value: stats.totalEnzymes, desc: 'Catalytic proteins' },
                  { title: 'Transporter proteins', value: stats.transporters, desc: 'Transmembrane transporters' },
                  { title: 'Complex proteins', value: stats.complexes, desc: 'Multi-subunit assemblies' },
                  { title: 'Associated to genes', value: stats.associatedToGenes, desc: 'Genomically encoded' },
                ].map((s, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-teal-500/30 transition-all group">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">{s.title}</h4>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-teal-600 transition-colors">{s.value}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl">
              <BarChart3 size={40} className="text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Failed to load statistics</p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {showDetailModal && selectedProteinForDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-3xl flex flex-col h-[520px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center rounded-t-2xl shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Protein Data</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedProteinForDetail.name} | EC: {selectedProteinForDetail.ecNumber || '-'}
                </p>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setDetailTabs(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              ><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white text-sm shrink-0 overflow-x-auto">
              {detailTabs && Object.keys(detailTabs).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setActiveDetailTab(tabKey)}
                  className={`px-5 py-3 border-b-2 font-bold capitalize transition-all duration-200 whitespace-nowrap ${activeDetailTab === tabKey ? 'border-teal-500 text-teal-600 bg-teal-50/10' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  {tabKey === 'reactions' ? 'Encoded Reactions' : tabKey}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
              {loadingDetail ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading details...</span>
                </div>
              ) : detailTabs && detailTabs[activeDetailTab] && detailTabs[activeDetailTab].length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        {activeDetailTab === 'reactions' && (<><th className="px-4 py-2">Reaction</th><th className="px-4 py-2">Equation</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">In Model</th><th className="px-4 py-2">Reversible</th></>)}
                        {activeDetailTab === 'encoding genes' && (<><th className="px-4 py-2">Gene Key</th><th className="px-4 py-2">Locus Tag</th></>)}
                        {activeDetailTab === 'pathways' && (<><th className="px-4 py-2">Code</th><th className="px-4 py-2">Name</th></>)}
                        {activeDetailTab === 'gene-protein-reaction' && (<><th className="px-4 py-2">Reaction ID</th><th className="px-4 py-2">Boolean Rule</th></>)}
                        {activeDetailTab === 'synonyms' && (<th className="px-4 py-2">Synonym</th>)}
                        {activeDetailTab === 'compartments' && (<th className="px-4 py-2">Compartment</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium bg-white">
                      {detailTabs[activeDetailTab].map((row: string[], rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} className="px-4 py-2.5 max-w-xs truncate" title={cell}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 select-none">
                  <HelpCircle size={32} className="text-slate-300" />
                  <span className="text-xs font-semibold">No details available.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Insert / Edit Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {formMode === 'insert' ? 'Insert Protein' : 'Edit Protein'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              ><X size={20} /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  placeholder="e.g. Pyruvate kinase"
                />
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Class</label>
                <select
                  value={formData.classType}
                  onChange={e => setFormData({ ...formData, classType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                >
                  {PROTEIN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* EC Number */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">EC Number</label>
                <input
                  value={formData.ecNumber}
                  onChange={e => setFormData({ ...formData, ecNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  placeholder="e.g. 2.7.1.40"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm shadow-teal-900/10 transition-all"
                >{formMode === 'insert' ? 'Insert' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
