import React from 'react';
import { Download, Printer, Copy } from 'lucide-react';

interface ExportButtonsProps {
  onExportCsv?: () => void;
  onPrintReport?: () => void;
  onCopyResults?: () => void;
  className?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportCsv,
  onPrintReport,
  onCopyResults,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {onExportCsv && (
        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 px-3 py-1.5 button-text text-xs glass rounded-md hover:bg-[#5F209B] hover:text-white transition-none"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      )}
      {onPrintReport && (
        <button
          onClick={onPrintReport}
          className="flex items-center gap-2 px-3 py-1.5 button-text text-xs glass rounded-md hover:bg-[#5F209B] hover:text-white transition-none"
        >
          <Printer className="w-3 h-3" />
          Print PDF
        </button>
      )}
      {onCopyResults && (
        <button
          onClick={onCopyResults}
          className="flex items-center gap-2 px-3 py-1.5 button-text text-xs glass rounded-md hover:bg-[#5F209B] hover:text-white transition-none"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      )}
    </div>
  );
};

export default ExportButtons;