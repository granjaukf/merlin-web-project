import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, Trash2, Pencil, Download, Dna, Info, BarChart3, HelpCircle, FileSpreadsheet, X, Check } from 'lucide-react';

export default function Genes() {
  const { name } = useParams();
  const [genes, setGenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [filterType, setFilterType] = useState<'all' | 'encoded'>('all');

  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGeneForDetail, setSelectedGeneForDetail] = useState<any>(null);
  const [detailTabs, setDetailTabs] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('synonyms');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [upsertMode, setUpsertMode] = useState<'create' | 'edit'>('create');
  const [upsertError, setUpsertError] = useState('');
  const [upsertLoading, setUpsertLoading] = useState(false);
  const [upsertForm, setUpsertForm] = useState({
    id: null,
    locusTag: '',
    name: '',
    query: '',
    transcriptionDirection: '',
    leftEndPosition: '',
    rightEndPosition: '',
    origin: 'MANUAL'
  });

  // Fetch genes
  const fetchGenes = async () => {
    setLoading(true);
    try {
      const isEncoded = filterType === 'encoded';
      const response = await fetch(`http://localhost:8085/api/${name}/genes?encodedOnly=${isEncoded}`);
      if (!response.ok) throw new Error('Failed to fetch genes');
      const data = await response.json();
      setGenes(data);
    } catch (error) {
      console.error('Error fetching genes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`http://localhost:8085/api/${name}/genes/statistics`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchGenes();
  }, [name, filterType]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    }
  }, [name, activeTab]);

  // Filter genes locally for search
  const filteredGenes = useMemo(() => {
    return genes.filter(gene => {
      const term = searchTerm.toLowerCase();
      const matchLocus = gene.locusTag && gene.locusTag.toLowerCase().includes(term);
      const matchName = gene.name && gene.name.toLowerCase().includes(term);
      const matchIdentifier = gene.identifier && gene.identifier.toLowerCase().includes(term);
      return matchLocus || matchName || matchIdentifier;
    });
  }, [genes, searchTerm]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredGenes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGenes = filteredGenes.slice(startIndex, startIndex + itemsPerPage);

  // Open Details Modal
  const handleOpenDetails = async (gene: any) => {
    setSelectedGeneForDetail(gene);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/genes/${gene.id}/detail`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setDetailTabs(data);
      if (data) {
        const keys = Object.keys(data).filter(k => k !== 'identifier');
        if (keys.length > 0) {
          setActiveDetailTab(keys[0]);
        }
      }
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (gene: any) => {
    setUpsertMode('edit');
    setUpsertForm({
      id: gene.id,
      locusTag: gene.locusTag || '',
      name: gene.name || '',
      query: gene.identifier || '',
      transcriptionDirection: gene.transcriptionDirection || '',
      leftEndPosition: gene.leftEndPosition || '',
      rightEndPosition: gene.rightEndPosition || '',
      origin: gene.origin || 'MANUAL'
    });
    setUpsertError('');
    setShowUpsertModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setUpsertMode('create');
    setUpsertForm({
      id: null,
      locusTag: '',
      name: '',
      query: '',
      transcriptionDirection: '',
      leftEndPosition: '',
      rightEndPosition: '',
      origin: 'MANUAL'
    });
    setUpsertError('');
    setShowUpsertModal(true);
  };

  // Submit create or edit
  const handleUpsertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upsertForm.locusTag.trim()) {
      setUpsertError('Locus Tag field is required.');
      return;
    }

    setUpsertLoading(true);
    setUpsertError('');
    try {
      const url = upsertMode === 'create'
        ? `http://localhost:8085/api/${name}/genes`
        : `http://localhost:8085/api/${name}/genes/${upsertForm.id}`;
      
      const method = upsertMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upsertForm)
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Error saving gene');
      }

      setShowUpsertModal(false);
      fetchGenes();
      if (activeTab === 'stats') fetchStats();
    } catch (err: any) {
      setUpsertError(err.message || 'Network error saving gene.');
    } finally {
      setUpsertLoading(false);
    }
  };

  // Delete single gene
  const handleDeleteGene = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this gene?')) return;
    try {
      const response = await fetch(`http://localhost:8085/api/${name}/genes/${id}?encodedOnly=${filterType === 'encoded'}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove gene');
      fetchGenes();
      if (activeTab === 'stats') fetchStats();
    } catch (error) {
      console.error(error);
      alert('Error removing gene.');
    }
  };

  // Delete all genes
  const handleDeleteAll = async () => {
    const isEncoded = filterType === 'encoded';
    const msg = isEncoded 
      ? 'Are you sure you want to completely remove ALL encoding genes from this workspace?'
      : 'Are you sure you want to completely remove ALL genes from this workspace?';
    if (!window.confirm(msg)) return;

    try {
      const response = await fetch(`http://localhost:8085/api/${name}/genes?encodedOnly=${isEncoded}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to clear genes');
      fetchGenes();
      if (activeTab === 'stats') fetchStats();
    } catch (error) {
      console.error(error);
      alert('Error clearing genes.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Locus Tag', 'Identifier', 'Name', 'Subunits', 'Proteins'];
    const rows = genes.map(g => [g.id, g.locusTag, g.identifier, g.name, g.subunits, g.proteins]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `genes_${name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden ring-1 ring-slate-900/5 font-sans">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-white shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Genes for {name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Detailed catalog of genome genes, sequence info, and encoded proteins.
          </p>
        </div>

        {/* Tab Selector & Insert Button */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <Dna size={14} />
              Genes
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <BarChart3 size={14} />
              Statistics
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-md shadow-teal-900/10 transition-colors"
          >
            <Plus size={16} />
            Insert Gene
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 bg-slate-50/50 flex-1">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mr-3" />
          <span className="text-sm font-medium">Loading data...</span>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-50/30">
          {activeTab === 'list' ? (
            <>
              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap gap-4 items-center text-sm bg-white shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search genes..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-[280px] pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all"
                  />
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        filterType === 'all'
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterType('encoded')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        filterType === 'encoded'
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Encoding Genes
                    </button>
                  </div>
                </div>

                {/* Extra Actions */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleExportCSV}
                    disabled={genes.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    Export CSV
                  </button>

                  <button
                    onClick={handleDeleteAll}
                    disabled={genes.length === 0}
                    className="px-3 py-2 bg-red-50 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 size={14} />
                    Remove All
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 relative px-6 py-4 flex flex-col">
                  <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden ring-1 ring-slate-900/5 flex-1 flex flex-col min-h-0">
                    {filteredGenes.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-3">
                        <Dna size={48} className="text-slate-300 animate-bounce" />
                        <div>
                          <p className="font-bold text-slate-700 text-sm">No genes found</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                            No records found matching your filters.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                          <tr className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                            <th className="px-4 py-3 w-[60px] text-center">Info</th>
                            <th className="px-4 py-3">Locus Tag</th>
                            <th className="px-4 py-3">Identifier</th>
                            <th className="px-4 py-3">Names</th>
                            <th className="px-4 py-3 w-[120px] text-center">Subunits</th>
                            <th className="px-4 py-3 w-[120px] text-center">Proteins</th>
                            <th className="px-4 py-3 w-[120px] text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                          {currentGenes.map((gene) => (
                            <tr key={gene.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleOpenDetails(gene)}
                                  className="p-1.5 bg-slate-50 text-slate-500 hover:text-teal-600 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-lg transition-all"
                                  title="View gene details"
                                >
                                  <Info size={14} />
                                </button>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                                {gene.locusTag}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                {gene.identifier || '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-medium">
                                {gene.name || <span className="text-slate-400 italic">n/d</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  gene.subunits > 0 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {gene.subunits}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  gene.proteins > 0 ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {gene.proteins}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEdit(gene)}
                                    className="p-1 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-all"
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGene(gene.id)}
                                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="Remove"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  </div>
                </div>

                {/* Pagination footer */}
                {filteredGenes.length > itemsPerPage && (
                  <div className="px-6 py-4 border-t border-slate-200/80 bg-white flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-500">
                      Showing <strong className="font-medium text-slate-900">{startIndex + 1}</strong> to <strong className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, filteredGenes.length)}</strong> of <strong className="font-medium text-slate-900">{filteredGenes.length}</strong> results
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Stats View */
            <div className="overflow-auto flex-1 px-6 py-5">
              {loadingStats ? (
                <div className="flex items-center justify-center p-12 text-slate-400">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mr-3" />
                  <span className="text-sm font-medium">Loading stats...</span>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {[
                    { title: 'Total Genes', value: stats.totalGenes, desc: 'Total genes in workspace' },
                    { title: 'Unnamed Genes', value: stats.genesWithNoName, desc: 'Locus tags with no name' },
                    { title: 'Total Synonyms', value: stats.synonymsCount, desc: 'Synonym records count' },
                    { title: 'Avg Synonyms', value: stats.averageSynonyms?.toFixed(2), desc: 'Synonyms per gene' },
                    { title: 'Protein Encoding', value: stats.proteinsEncoded, desc: 'Genes encoding proteins' },
                    { title: 'Only Enzymes', value: stats.onlyEnzymes, desc: 'Only enzyme activity' },
                    { title: 'Only Transporters', value: stats.onlyTransporters, desc: 'Only transport activity' },
                    { title: 'Enzymes & Transporters', value: stats.bothEnzymesTransporters, desc: 'Dual activity' },
                    { title: 'Genes in Model', value: stats.genesInModel, desc: 'Associated with metabolic network' }
                  ].map((s, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 hover:border-teal-500/30 p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">{s.title}</h4>
                      <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-teal-600 transition-colors">{s.value}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <BarChart3 size={40} className="text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">Failed to retrieve statistics</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailModal && selectedGeneForDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-2xl h-[550px] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Info size={18} className="text-teal-600" />
                  Gene Details: {selectedGeneForDetail.locusTag}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ID: #{selectedGeneForDetail.id} | Query: {selectedGeneForDetail.identifier || '-'}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailTabs(null);
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Tab Sidebar */}
              <div className="w-44 bg-slate-50/50 border-r border-slate-200/80 p-3 flex flex-col gap-1 overflow-y-auto">
                {detailTabs && Object.keys(detailTabs).filter(k => k !== 'identifier').map((tabKey) => (
                  <button
                    key={tabKey}
                    onClick={() => setActiveDetailTab(tabKey)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                      activeDetailTab === tabKey
                        ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tabKey}
                  </button>
                ))}
              </div>

              {/* Tab Display Panel */}
              <div className="flex-1 p-5 overflow-y-auto bg-white">
                {loadingDetail ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading details...</span>
                  </div>
                ) : detailTabs && detailTabs[activeDetailTab] && detailTabs[activeDetailTab].length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {activeDetailTab === 'sequence' ? (
                      detailTabs.sequence.map((seq: string[], sIdx: number) => (
                        <div key={sIdx} className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{seq[0]}</span>
                          <p className="text-xs font-mono break-all text-slate-800 leading-relaxed max-h-48 overflow-y-auto select-all">{seq[1]}</p>
                        </div>
                      ))
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                            {activeDetailTab === 'synonyms' && <th className="pb-2">Synonym</th>}
                            {activeDetailTab === 'orthologs' && (
                              <>
                                <th className="pb-2">Ortholog</th>
                                <th className="pb-2">Homologue Identifier</th>
                                <th className="pb-2">Similarity</th>
                              </>
                            )}
                            {activeDetailTab === 'encoded proteins' && (
                              <>
                                <th className="pb-2">Protein</th>
                                <th className="pb-2">Class</th>
                                <th className="pb-2">ID</th>
                              </>
                            )}
                            {activeDetailTab === 'compartments' && (
                              <>
                                <th className="pb-2">Compartment</th>
                                <th className="pb-2">Score</th>
                                <th className="pb-2">Primary</th>
                              </>
                            )}
                            {activeDetailTab === 'reactions' && (
                              <>
                                <th className="pb-2">Reaction</th>
                                <th className="pb-2">Equation / Name</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                          {detailTabs[activeDetailTab].map((row: string[], rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50">
                              {row.map((cell: string, cIdx: number) => (
                                <td key={cIdx} className="py-2.5 pr-4 font-medium max-w-xs truncate" title={cell}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <HelpCircle size={32} className="text-slate-300" />
                    <span className="text-xs font-semibold">No details available.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insert / Edit Form Modal */}
      {showUpsertModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {upsertMode === 'create' ? 'Insert New Gene' : 'Edit Gene'}
            </h2>
            <form onSubmit={handleUpsertSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Locus Tag *</label>
                <input
                  type="text"
                  value={upsertForm.locusTag}
                  onChange={e => setUpsertForm({ ...upsertForm, locusTag: e.target.value })}
                  placeholder="e.g. FAZ87_RS00010"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                  disabled={upsertLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gene Name</label>
                <input
                  type="text"
                  value={upsertForm.name}
                  onChange={e => setUpsertForm({ ...upsertForm, name: e.target.value })}
                  placeholder="e.g. pdeA"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                  disabled={upsertLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Query / Sequence ID</label>
                <input
                  type="text"
                  value={upsertForm.query}
                  onChange={e => setUpsertForm({ ...upsertForm, query: e.target.value })}
                  placeholder="e.g. WP_001309635.1"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                  disabled={upsertLoading}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Direction</label>
                  <select
                    value={upsertForm.transcriptionDirection}
                    onChange={e => setUpsertForm({ ...upsertForm, transcriptionDirection: e.target.value })}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all cursor-pointer"
                    disabled={upsertLoading}
                  >
                    <option value="">n/d</option>
                    <option value="FORWARD">+</option>
                    <option value="REVERSE">-</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Start Pos</label>
                  <input
                    type="text"
                    value={upsertForm.leftEndPosition}
                    onChange={e => setUpsertForm({ ...upsertForm, leftEndPosition: e.target.value })}
                    placeholder="100"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                    disabled={upsertLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">End Pos</label>
                  <input
                    type="text"
                    value={upsertForm.rightEndPosition}
                    onChange={e => setUpsertForm({ ...upsertForm, rightEndPosition: e.target.value })}
                    placeholder="800"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                    disabled={upsertLoading}
                  />
                </div>
              </div>

              {upsertError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                  {upsertError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpsertModal(false)}
                  className="px-6 py-2.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-colors rounded-xl"
                  disabled={upsertLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-teal-600 hover:bg-teal-500 text-white transition-colors rounded-xl text-sm font-bold shadow-md shadow-teal-900/10 flex items-center gap-1.5"
                  disabled={upsertLoading}
                >
                  {upsertLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
