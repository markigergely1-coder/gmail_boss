import { useState, useCallback } from 'react';
import { UploadCloud, File, Trash2, Download, Activity, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ParsedInvoiceRow {
  name: string;
  participation: number;
  amount: number;
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export function InvoiceMerger() {
  const [title, setTitle] = useState('Összesített Röplabda Elszámolás');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [mergedData, setMergedData] = useState<ParsedInvoiceRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    
    if (droppedFiles.length > 0) {
      const newFiles = droppedFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending' as const
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      const newFiles = selectedFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending' as const
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processPdfs = async () => {
    setIsProcessing(true);
    setMergedData([]);
    
    const allRows: ParsedInvoiceRow[] = [];
    
    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      const fileObj = updatedFiles[i];
      try {
        fileObj.status = 'processing';
        setFiles([...updatedFiles]);
        
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const items = textContent.items.map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5]
          }));
          
          // Group by approximate y coordinate to form lines
          const lines: {y: number, items: any[]}[] = [];
          items.forEach(item => {
            const line = lines.find(l => Math.abs(l.y - item.y) < 5);
            if (line) {
              line.items.push(item);
            } else {
              lines.push({ y: item.y, items: [item] });
            }
          });
          
          // Sort lines from top to bottom (y is usually from bottom to top in PDF, so sort descending)
          lines.sort((a, b) => b.y - a.y);
          
          lines.forEach(line => {
            // Sort items in line from left to right
            line.items.sort((a, b) => a.x - b.x);
            const lineStr = line.items.map(i => i.str).join(' ').trim();
            fullText += lineStr + '\n';
          });
        }

        const lines = fullText.split('\n');
        
        console.log("PDF Full Text:\n", fullText); // Debugging info in console
        
        for (const line of lines) {
            if (line.trim() === '' || line.toLowerCase().includes('generálva') || line.toLowerCase().includes('havi röplabda elszámolás')) {
                continue;
            }

            // Try to match "Name 1 2034 Ft"
            const match = line.match(/^(.+?)\s+(\d+)\s+([\d\s]+)\s*Ft/i);
            if (match) {
              const name = match[1].trim();
              if (name.toLowerCase().includes('név') || name.toLowerCase().includes('részvétel')) continue;
              
              const participation = parseInt(match[2].trim(), 10);
              const amountStr = match[3].replace(/\s/g, '');
              const amount = parseInt(amountStr, 10);
              
              if (!isNaN(participation) && !isNaN(amount)) {
                allRows.push({ name, participation, amount });
              }
            } else {
                const looseMatch = line.match(/(.+?)\s+(\d+)\s+([\d\s]+)\s*Ft/i);
                if (looseMatch) {
                  const name = looseMatch[1].trim();
                  if (name.toLowerCase().includes('név') || name.toLowerCase().includes('részvétel')) continue;
                  
                  const participation = parseInt(looseMatch[2].trim(), 10);
                  const amountStr = looseMatch[3].replace(/\s/g, '');
                  const amount = parseInt(amountStr, 10);
                  if (!isNaN(participation) && !isNaN(amount)) {
                    allRows.push({ name, participation, amount });
                  }
                }
            }
        }
        
        fileObj.status = 'success';
      } catch (err: any) {
        console.error(err);
        fileObj.status = 'error';
        fileObj.errorMessage = err.message;
      }
    }
    
    setFiles([...updatedFiles]);
    
    // Merge data
    const mergedMap = new Map<string, ParsedInvoiceRow>();
    allRows.forEach(row => {
      const key = row.name.toLowerCase().trim();
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        existing.participation += row.participation;
        existing.amount += row.amount;
      } else {
        mergedMap.set(key, { ...row });
      }
    });
    
    // Convert to array and sort by name
    const finalData = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setMergedData(finalData);
    setIsProcessing(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
    const titleX = (doc.internal.pageSize.width - titleWidth) / 2;
    doc.text(title, titleX, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const dateStr = `Generálva: ${new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    const dateWidth = doc.getStringUnitWidth(dateStr) * doc.getFontSize() / doc.internal.scaleFactor;
    const dateX = (doc.internal.pageSize.width - dateWidth) / 2;
    doc.text(dateStr, dateX, 30);
    
    doc.setTextColor(0, 0, 0);
    
    const tableBody = mergedData.map(row => [
      row.name, 
      row.participation.toString(), 
      `${row.amount} Ft`
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['Név', 'Részvétel', 'Fizetendő']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [74, 144, 226], // match brand color roughly
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      styles: {
        font: 'helvetica',
        cellPadding: 6,
        fontSize: 10,
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      }
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  const totalAmount = mergedData.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-panel border border-panel-border rounded-2xl p-6 md:p-8 backdrop-blur-md">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Generált PDF Címe
          </label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            placeholder="Pl.: 2026. Július - Augusztus Elszámolás"
          />
        </div>

        {/* Dropzone */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:bg-slate-800/30 transition-colors relative group"
        >
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Húzd ide a számla PDF-eket</h3>
            <p className="text-slate-400">Vagy kattints a böngészéshez (csak PDF formátum)</p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Feltöltött Fájlok ({files.length})</h4>
            <div className="space-y-3">
              <AnimatePresence>
                {files.map(file => (
                  <motion.div 
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <FileText className="w-6 h-6 text-brand-400" />
                      <div>
                        <p className="text-white font-medium">{file.file.name}</p>
                        <p className="text-xs text-slate-400">
                          {(file.file.size / 1024).toFixed(1)} KB
                          {file.status === 'processing' && <span className="ml-2 text-yellow-400">Feldolgozás...</span>}
                          {file.status === 'success' && <span className="ml-2 text-green-400">Kész</span>}
                          {file.status === 'error' && <span className="ml-2 text-red-400">Hiba: {file.errorMessage}</span>}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={processPdfs}
                disabled={isProcessing || files.length === 0}
                className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/20 flex items-center transition-all"
              >
                {isProcessing ? (
                  <><Activity className="w-5 h-5 mr-2 animate-pulse" /> Feldolgozás...</>
                ) : (
                  <><File className="w-5 h-5 mr-2" /> PDF-ek Egyesítése</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {mergedData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-panel border border-panel-border rounded-2xl p-6 md:p-8 backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Egyesített Eredmény</h3>
              <p className="text-slate-400 text-sm mt-1">Összesen {mergedData.length} fő, {totalAmount} Ft</p>
            </div>
            <button 
              onClick={generatePDF}
              className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-green-500/20 flex items-center transition-all"
            >
              <Download className="w-5 h-5 mr-2" />
              Új PDF Letöltése
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="py-3 px-4 text-sm font-medium text-slate-400">Név</th>
                  <th className="py-3 px-4 text-sm font-medium text-slate-400 text-center">Részvétel</th>
                  <th className="py-3 px-4 text-sm font-medium text-slate-400 text-right">Fizetendő</th>
                </tr>
              </thead>
              <tbody>
                {mergedData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{row.name}</td>
                    <td className="py-3 px-4 text-slate-300 text-center">{row.participation}</td>
                    <td className="py-3 px-4 text-slate-300 text-right">{row.amount} Ft</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
