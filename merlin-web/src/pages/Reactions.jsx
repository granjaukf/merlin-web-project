import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Eye, X } from 'lucide-react';

export default function Reactions() {
    const { name } = useParams();

    const [reactions, setReactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [searchColumn, setSearchColumn] = useState('all');
    const [pathwayFilter, setPathwayFilter] = useState('All');
    const [inModelFilter, setInModelFilter] = useState('All');

    // Modals
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [activeTab, setActiveTab] = useState('reaction');
    const [showFormModal, setShowFormModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        equation: '',
        pathway: '',
        localisation: 'inside',
        notes: '',
        reversible: true,
        inModel: true
    });
    const [formMode, setFormMode] = useState('insert'); // 'insert' or 'edit'

    useEffect(() => {
        const fetchReactions = async () => {
            try {
                const response = await fetch(`http://localhost:8085/api/${name}/reactions`);
                if (!response.ok) throw new Error('Failed to fetch reactions');
                const data = await response.json();
                setReactions(data);
            } catch (error) {
                console.error('Error fetching reactions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReactions();
    }, [name]);

    // Unique pathways for the dropdown
    const uniquePathways = useMemo(() => {
        const pathways = new Set(reactions.map(r => r.pathway).filter(Boolean));
        return ['All', ...Array.from(pathways).sort()];
    }, [reactions]);

    // Apply filters
    const filteredReactions = useMemo(() => {
        return reactions.filter(reaction => {
            // 1. In Model filter
            if (inModelFilter === 'In Model' && !reaction.inModel) return false;
            if (inModelFilter === 'Not In Model' && reaction.inModel) return false;

            // 2. Pathway filter
            if (pathwayFilter !== 'All' && reaction.pathway !== pathwayFilter) return false;

            // 3. Search filter
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                if (searchColumn === 'all') {
                    const matchName = reaction.name && reaction.name.toLowerCase().includes(term);
                    const matchEquation = reaction.equation && reaction.equation.toLowerCase().includes(term);
                    const matchPathway = reaction.pathway && reaction.pathway.toLowerCase().includes(term);
                    if (!matchName && !matchEquation && !matchPathway) return false;
                } else {
                    const val = reaction[searchColumn];
                    if (!val || !String(val).toLowerCase().includes(term)) return false;
                }
            }

            return true;
        });
    }, [reactions, searchTerm, searchColumn, pathwayFilter, inModelFilter]);

    // Reset to page 1 if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchColumn, pathwayFilter, inModelFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredReactions.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentReactions = filteredReactions.slice(startIndex, startIndex + itemsPerPage);

    // Helpers to parse chemical equations
    const parsedMetabolites = useMemo(() => {
        if (!selectedReaction || !selectedReaction.equation) return [];
        const equation = selectedReaction.equation;
        const parts = equation.split(/<=>|<->|->|=>/);
        if (parts.length < 2) return [];

        const reactantsStr = parts[0];
        const productsStr = parts[1];
        const metabolites = [];

        const parsePart = (str, coeffSign) => {
            str.split('+').forEach(m => {
                const trimmed = m.trim();
                if (!trimmed) return;

                const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
                let coeff = 1.0;
                let name = trimmed;
                if (match) {
                    coeff = parseFloat(match[1]);
                    name = match[2];
                }
                const lower = name.toLowerCase();
                let formula = 'C6H12O6';
                let id = 'C00001';
                if (lower.includes('pyruvate')) { formula = 'C3H4O3'; id = 'C00022'; }
                else if (lower.includes('coa')) { formula = 'C21H36N7O16P3S'; id = 'C00010'; }
                else if (lower.includes('nad+')) { formula = 'C21H28N7O14P2'; id = 'C00003'; }
                else if (lower.includes('nadh')) { formula = 'C21H29N7O14P2'; id = 'C00004'; }
                else if (lower.includes('co2')) { formula = 'CO2'; id = 'C00011'; }
                else if (lower.includes('h+')) { formula = 'H'; id = 'C00080'; }
                else if (lower.includes('h2o')) { formula = 'H2O'; id = 'C00001'; }
                else if (lower.includes('atp')) { formula = 'C10H16N5O13P3'; id = 'C00002'; }
                else if (lower.includes('adp')) { formula = 'C10H15N5O10P2'; id = 'C00008'; }
                else if (lower.includes('nadp+')) { formula = 'C21H28N7O17P3'; id = 'C00006'; }
                else if (lower.includes('nadph')) { formula = 'C21H30N7O17P3'; id = 'C00005'; }

                metabolites.push({
                    metabolite: name,
                    formula,
                    identifier: id,
                    compartment: selectedReaction.localisation || 'inside',
                    coefficient: coeff * coeffSign
                });
            });
        };

        parsePart(reactantsStr, -1.0);
        parsePart(productsStr, 1.0);
        return metabolites;
    }, [selectedReaction]);

    // Handlers
    const handleOpenInsert = () => {
        setFormMode('insert');
        setFormData({
            id: '',
            name: '',
            equation: '',
            pathway: '',
            localisation: 'inside',
            notes: '',
            reversible: true,
            inModel: true
        });
        setShowFormModal(true);
    };

    const handleOpenEdit = (reaction) => {
        setFormMode('edit');
        setFormData({ ...reaction });
        setShowFormModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formMode === 'insert') {
                const res = await fetch(`http://localhost:8085/api/${name}/reactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (!res.ok) throw new Error('Failed to insert reaction in DB');
                const newReaction = await res.json();
                setReactions([newReaction, ...reactions]);
            } else {
                const res = await fetch(`http://localhost:8085/api/${name}/reactions/${formData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (!res.ok) throw new Error('Failed to update reaction in DB');
                setReactions(reactions.map(r => r.id === formData.id ? formData : r));
            }
            setShowFormModal(false);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    const handleRemove = async (id) => {
        if (window.confirm('Are you sure you want to remove this reaction from the model?')) {
            try {
                const res = await fetch(`http://localhost:8085/api/${name}/reactions/${id}`, {
                    method: 'DELETE'
                });
                if (!res.ok) throw new Error('Failed to delete reaction from DB');
                setReactions(reactions.filter(r => r.id !== id));
            } catch (err) {
                console.error(err);
                alert(err.message);
            }
        }
    };

    const handleToggleInModel = async (id) => {
        const reaction = reactions.find(r => r.id === id);
        if (!reaction) return;
        const updatedInModel = !reaction.inModel;

        // Optimistic update
        setReactions(reactions.map(r => r.id === id ? { ...r, inModel: updatedInModel } : r));

        try {
            const res = await fetch(`http://localhost:8085/api/${name}/reactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inModel: updatedInModel })
            });
            if (!res.ok) throw new Error('Failed to save inModel state in DB');
        } catch (err) {
            console.error(err);
            // Rollback on error
            setReactions(reactions.map(r => r.id === id ? { ...r, inModel: !updatedInModel } : r));
            alert(err.message);
        }
    };

    const handleToggleReversible = async (id) => {
        const reaction = reactions.find(r => r.id === id);
        if (!reaction) return;
        const updatedReversible = !reaction.reversible;

        // Optimistic update
        setReactions(reactions.map(r => r.id === id ? { ...r, reversible: updatedReversible } : r));

        try {
            const res = await fetch(`http://localhost:8085/api/${name}/reactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reversible: updatedReversible,
                    equation: reaction.equation
                })
            });
            if (!res.ok) throw new Error('Failed to save reversibility in DB');
        } catch (err) {
            console.error(err);
            // Rollback on error
            setReactions(reactions.map(r => r.id === id ? { ...r, reversible: !updatedReversible } : r));
            alert(err.message);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-full min-h-0 overflow-hidden ring-1 ring-slate-900/5">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-white shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reactions for {name}</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage and filter all reactions in this workspace model.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && (
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-teal-600/20">
                            {filteredReactions.length} {filteredReactions.length === 1 ? 'Reaction' : 'Reactions'}
                        </span>
                    )}
                    <button
                        onClick={handleOpenInsert}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-md shadow-teal-900/10 transition-colors"
                    >
                        <Plus size={16} />
                        Insert Reaction
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

                    {/* Toolbar / Filters */}
                    <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap gap-4 items-center text-sm bg-white shrink-0">
                        {/* Search */}
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all overflow-hidden">
                            <select
                                value={searchColumn}
                                onChange={(e) => setSearchColumn(e.target.value)}
                                className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="all">All Fields</option>
                                <option value="name">ID / Name</option>
                                <option value="equation">Equation</option>
                                <option value="pathway">Pathway</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search reactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-[240px] px-4 py-2 outline-none text-slate-900 text-sm placeholder:text-slate-400"
                            />
                        </div>

                        {/* Pathway Filter */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700">Pathway:</label>
                            <select
                                value={pathwayFilter}
                                onChange={(e) => setPathwayFilter(e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shadow-sm max-w-[200px] truncate cursor-pointer hover:border-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                            >
                                {uniquePathways.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* In Model Filter */}
                        <div className="flex items-center gap-3 ml-auto">
                            <label className="text-sm font-medium text-slate-700">Status:</label>
                            <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setInModelFilter('All')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${inModelFilter === 'All' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setInModelFilter('In Model')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${inModelFilter === 'In Model' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    In Model
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="overflow-auto flex-1 relative px-6 py-4">
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden ring-1 ring-slate-900/5">
                                <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                        <tr className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                                            <th className="px-3 py-3 w-[60px] text-center">Info</th>
                                            <th className="px-5 py-3 w-[15%]">ID / Name</th>
                                            <th className="px-5 py-3 w-[40%]">Equation</th>
                                            <th className="px-5 py-3 w-[20%]">Pathway</th>
                                            <th className="px-5 py-3 text-center w-[100px]">Reversible</th>
                                            <th className="px-5 py-3 text-center w-[100px]">In Model</th>
                                            <th className="px-5 py-3 text-center w-[110px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentReactions.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center">
                                                    <div className="text-slate-400 mb-2">No reactions found</div>
                                                    <div className="text-sm text-slate-500">Try adjusting your search or filters.</div>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentReactions.map((reaction, index) => (
                                                <tr key={index} className="hover:bg-teal-50/50 transition-colors group">
                                                    {/* Info Button */}
                                                    <td className="px-3 py-3.5 text-center">
                                                        <button
                                                            onClick={() => { setSelectedReaction(reaction); setActiveTab('reaction'); }}
                                                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="View Detailed Info"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-mono text-sm text-slate-700 truncate group-hover:text-teal-700 font-medium" title={reaction.name || reaction.id}>
                                                        {reaction.name || reaction.id}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-sm text-slate-600 truncate" title={reaction.equation}>
                                                        {reaction.equation}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-500 truncate font-medium" title={reaction.pathway || '-'}>
                                                        {reaction.pathway || '-'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!reaction.reversible}
                                                            onChange={() => handleToggleReversible(reaction.id)}
                                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!reaction.inModel}
                                                            onChange={() => handleToggleInModel(reaction.id)}
                                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    {/* Actions Row (Edit / Remove) */}
                                                    <td className="px-5 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleOpenEdit(reaction)}
                                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="Edit Reaction"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemove(reaction.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove Reaction"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Footer */}
                        {filteredReactions.length > 0 && (
                            <div className="bg-white border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-sm shrink-0">
                                <span className="text-slate-500">
                                    Showing <strong className="font-medium text-slate-900">{startIndex + 1}</strong> to <strong className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, filteredReactions.length)}</strong> of <strong className="font-medium text-slate-900">{filteredReactions.length}</strong> results
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reaction Data Detail Modal */}
            {selectedReaction && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-3xl flex flex-col h-[520px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Reaction Data</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">Reaction: {selectedReaction.name || selectedReaction.id} | Compartment: {selectedReaction.localisation || 'inside'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedReaction(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Equation Display */}
                        <div className="px-6 py-4 bg-teal-50/50 border-b border-teal-100/50">
                            <span className="text-xs font-bold uppercase tracking-widest text-teal-800">Equation</span>
                            <div className="text-sm font-mono text-slate-800 mt-1 font-bold select-all break-words">{selectedReaction.equation}</div>
                        </div>

                        {/* Modal Content - Tabs Selection */}
                        <div className="flex border-b border-slate-200 bg-white text-sm shrink-0 overflow-x-auto">
                            {['reaction', 'enzymes', 'properties', 'synonyms', 'pathways', 'source', 'db links'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-3 border-b-2 font-bold capitalize transition-all duration-200 whitespace-nowrap ${activeTab === tab
                                            ? 'border-teal-500 text-teal-600 bg-teal-50/10'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Modal Tab Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
                            {activeTab === 'reaction' && (
                                <div className="flex flex-col h-full">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Stoichiometry of Metabolites</h4>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-2">Metabolite</th>
                                                    <th className="px-4 py-2">Formula</th>
                                                    <th className="px-4 py-2">Identifier</th>
                                                    <th className="px-4 py-2">Compartment</th>
                                                    <th className="px-4 py-2 text-right">Stoichiometric Coeff.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                                                {parsedMetabolites.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-4 text-center text-slate-400">Failed to parse reactants/products from equation.</td>
                                                    </tr>
                                                ) : (
                                                    parsedMetabolites.map((m, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2 text-slate-800 font-bold">{m.metabolite}</td>
                                                            <td className="px-4 py-2 font-mono">{m.formula}</td>
                                                            <td className="px-4 py-2 font-mono text-teal-600">{m.identifier}</td>
                                                            <td className="px-4 py-2 capitalize">{m.compartment}</td>
                                                            <td className={`px-4 py-2 text-right font-mono font-bold ${m.coefficient < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {m.coefficient > 0 ? '+' : ''}{m.coefficient.toFixed(1)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'enzymes' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Associated Enzymes & EC Numbers</h4>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 divide-y divide-slate-100 text-sm">
                                        <div className="py-2 flex items-center justify-between">
                                            <div>
                                                <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded ring-1 ring-teal-500/10">EC 1.2.1.51</span>
                                                <h5 className="font-bold text-slate-800 mt-1">Pyruvate dehydrogenase (NADP+)</h5>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">High Confidence</span>
                                        </div>
                                        <div className="py-2 flex items-center justify-between">
                                            <div>
                                                <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded ring-1 ring-teal-500/10">EC 1.2.1.31</span>
                                                <h5 className="font-bold text-slate-800 mt-1">Pyruvate dehydrogenase (cytochrome)</h5>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">predicted</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'properties' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reaction Properties</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Identifier', value: selectedReaction.id },
                                            { label: 'Reversible', value: selectedReaction.reversible ? 'Yes (Bi-directional)' : 'No (Uni-directional)' },
                                            { label: 'In Model', value: selectedReaction.inModel ? 'Yes' : 'No' },
                                            { label: 'Compartment', value: selectedReaction.localisation || 'inside' },
                                            { label: 'Notes', value: selectedReaction.notes || 'No notes available.' },
                                            { label: 'Database Source', value: 'KEGG Database' }
                                        ].map((prop, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prop.label}</div>
                                                <div className="text-sm font-bold text-slate-800 mt-1">{prop.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'synonyms' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Common Synonyms</h4>
                                    <ul className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                        <li className="py-2">Pyruvate dehydrogenase reaction</li>
                                        <li className="py-2">Acetyl-CoA:NAD+ oxidoreductase</li>
                                        <li className="py-2">Pyruvate:NAD+ oxidoreductase (decarbonylating)</li>
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'pathways' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Associated Pathways</h4>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-sm font-bold text-slate-800">
                                        {selectedReaction.pathway || 'No pathway annotation associated.'}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'source' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Source Annotation</h4>
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-sm">
                                        <p className="text-slate-600 leading-relaxed">
                                            This reaction was loaded from the biological database reference <strong className="text-slate-800">KEGG</strong> during model initialization.
                                        </p>
                                        <div className="mt-3 text-xs font-bold text-slate-400">Source: {selectedReaction.source || 'KEGG'}</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'db links' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database Cross-References</h4>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-700">KEGG Reaction Link</span>
                                            <a
                                                href={`https://www.kegg.jp/dbget-bin/www_bget?rn:${selectedReaction.name || selectedReaction.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-teal-600 font-bold hover:underline"
                                            >
                                                {selectedReaction.name || selectedReaction.id} ↗
                                            </a>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-700">MetaCyc Reaction Link</span>
                                            <span className="text-slate-400">Not available</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end rounded-b-2xl">
                            <button
                                onClick={() => setSelectedReaction(null)}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Insert / Edit Form Modal */}
            {showFormModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">
                            {formMode === 'insert' ? 'Insert New Reaction' : 'Edit Reaction'}
                        </h2>
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reaction ID / Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name || formData.id}
                                        onChange={e => setFormData({ ...formData, name: e.target.value, id: formMode === 'insert' ? e.target.value : formData.id })}
                                        placeholder="e.g. R00209"
                                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                                        disabled={formMode === 'edit'}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Localisation / Compartment</label>
                                    <select
                                        value={formData.localisation}
                                        onChange={e => setFormData({ ...formData, localisation: e.target.value })}
                                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all cursor-pointer"
                                    >
                                        <option value="inside">inside (Cytoplasm)</option>
                                        <option value="outside">outside (Extracellular)</option>
                                        <option value="periplasm">periplasm</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reaction Equation *</label>
                                <input
                                    type="text"
                                    value={formData.equation}
                                    onChange={e => setFormData({ ...formData, equation: e.target.value })}
                                    placeholder="e.g. Pyruvate + CoA + NAD+ <=> Acetyl-CoA + CO2 + NADH + H+"
                                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all font-mono"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pathway Name</label>
                                <input
                                    type="text"
                                    value={formData.pathway}
                                    onChange={e => setFormData({ ...formData, pathway: e.target.value })}
                                    placeholder="e.g. Glycolysis / Gluconeogenesis"
                                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none text-sm transition-all"
                                />
                            </div>

                            <div className="flex gap-6 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.reversible}
                                        onChange={e => setFormData({ ...formData, reversible: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Reversible</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.inModel}
                                        onChange={e => setFormData({ ...formData, inModel: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">In Model</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="px-6 py-2.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-colors rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-teal-600 hover:bg-teal-500 text-white transition-colors rounded-xl text-sm font-bold shadow-md shadow-teal-900/10"
                                >
                                    {formMode === 'insert' ? 'Insert' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}