import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Upload } from 'lucide-react';
import GenomeImportModal from '../components/GenomeImportModal';

export default function Dashboard() {
  const { name } = useParams();
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="flex flex-col gap-6">
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
      
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <p className="text-slate-500">
          This is the dashboard for <strong className="text-slate-800">{name}</strong>.
          <br/>
          Use the sidebar on the left to navigate through the Model data.
        </p>
      </div>

      {showImport && name && (
        <GenomeImportModal workspaceName={name} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
