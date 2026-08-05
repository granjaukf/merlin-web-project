import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface GenomeImportModalProps {
  workspaceName: string;
  onClose: () => void;
}

export default function GenomeImportModal({ workspaceName, onClose }: GenomeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('protein');
  const [taxonomyID, setTaxonomyID] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !taxonomyID.trim()) return;

    setImporting(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(
        `http://localhost:8085/api/${workspaceName}/import-fasta?type=${type}&taxonomyID=${taxonomyID}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        let errorMsg = 'Erro ao carregar ficheiro FASTA';
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

      const data = await res.json();

      setSuccess('Ficheiro importado com sucesso para a base de dados!');
      setFile(null);
      setTaxonomyID('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro durante o envio do ficheiro.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          disabled={importing}
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Importar Ficheiro de Genoma</h3>
        <p className="text-xs text-slate-500 mb-6">Importe ficheiros locais (.faa, .fna, .gbff) para a base de dados do workspace.</p>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">ID de Taxonomia *</label>
            <input
              type="text"
              value={taxonomyID}
              onChange={e => setTaxonomyID(e.target.value)}
              placeholder="e.g. 511145"
              className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition-all"
              disabled={importing}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tipo de Ficheiro *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm transition-all"
              disabled={importing}
            >
              <option value="protein">Proteína (.faa)</option>
              <option value="cds">Sequências Codificantes CDS (.fna)</option>
              <option value="genomic">Genómico (.fna)</option>
              <option value="rna">Sequências RNA (.fna)</option>
              <option value="genbank">Ficheiro GenBank (.gbff / .gbk)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ficheiro *</label>
            <div className="border border-dashed border-white/10 rounded-xl bg-slate-950/20 p-6 flex flex-col items-center justify-center relative hover:bg-slate-950/40 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".faa,.fna,.gbff,.gbk"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importing}
                required={!file}
              />
              <Upload className="text-slate-500 mb-2" size={24} />
              {file ? (
                <div className="flex items-center gap-1 text-teal-400 font-medium text-sm">
                  <FileText size={16} />
                  <span>{file.name}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 text-center">
                  Clique ou arraste um ficheiro compatível (.faa, .fna, .gbff)
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-400 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white font-medium transition-colors"
              disabled={importing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={importing || !file || !taxonomyID.trim()}
              className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 transition-colors rounded-lg text-sm font-bold shadow-md shadow-teal-500/10 flex items-center gap-1.5"
            >
              {importing && (
                <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              )}
              {importing ? 'A importar...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
