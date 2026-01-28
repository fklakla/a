
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Trash2, CheckCircle2, Circle, Upload, X, AlertCircle, FileText, Loader2, Phone } from 'lucide-react';
import { Person, Stats } from './types';

const STORAGE_KEY = 'field_ops_data_v2';

// 高密度搜索框
const CompactSearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="relative group flex-1">
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
    <input
      type="text"
      inputMode="search"
      placeholder="搜索姓名/地址/电话..."
      className="w-full pl-7 pr-3 py-1.5 bg-slate-100 border-none rounded-md text-[11px] focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// 极致高密度栅格列表项 - 纯直线分割，姓名电话同行
const PersonGridItem: React.FC<{ 
  person: Person; 
  isLeft: boolean; 
  onClick: () => void 
}> = React.memo(({ person, isLeft, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex flex-col px-2.5 py-2 border-b border-slate-100 transition-colors cursor-pointer select-none active:bg-slate-100 ${
      isLeft ? 'border-r' : ''
    } ${person.isCompleted ? 'bg-emerald-50/40' : 'bg-white'}`}
  >
    {/* 第一行：姓名 + 手机号 + 状态图标 */}
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
        <span className={`text-[13px] font-bold truncate shrink-0 ${person.isCompleted ? 'text-emerald-700' : 'text-slate-900'}`}>
          {person.name}
        </span>
        {person.phone && (
          <span className="text-[10px] font-mono text-blue-500 truncate opacity-80">
            {person.phone}
          </span>
        )}
      </div>
      <div className="shrink-0">
        {person.isCompleted ? (
          <CheckCircle2 size={13} className="text-emerald-500" />
        ) : (
          <Circle size={13} className="text-slate-200" />
        )}
      </div>
    </div>

    {/* 第二行：地址 */}
    <div className={`text-[11px] truncate leading-normal mt-0.5 ${person.isCompleted ? 'text-emerald-600/70' : 'text-slate-400'}`}>
      {person.address}
    </div>
  </div>
));

const DetailModal: React.FC<{ person: Person; onClose: () => void; onToggle: () => void }> = ({ person, onClose, onToggle }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-black text-slate-900">详情处理</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="mb-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">人员信息</span>
              <p className="text-base font-bold text-slate-800 flex items-center gap-2 mt-1">
                {person.name} 
                <a href={`tel:${person.phone}`} className="text-blue-600 font-mono font-bold border-b border-blue-200">{person.phone}</a>
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">详细地址</span>
              <p className="text-[13px] text-slate-600 mt-1 leading-relaxed font-medium">{person.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 pb-2">
            <button
              onClick={() => { onToggle(); onClose(); }}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.96] shadow-lg ${
                person.isCompleted
                  ? 'bg-slate-100 text-slate-500 shadow-none'
                  : 'bg-blue-600 text-white shadow-blue-600/20'
              }`}
            >
              {person.isCompleted ? '设为待处理' : '确认任务完成'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-slate-400 text-xs font-bold"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(100);
  const scrollObserverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setPeople(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveToLocalStorage = (data: Person[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const togglePersonStatus = (id: string) => {
    setPeople(prev => {
      const next = prev.map(p => p.id === id ? { ...p, isCompleted: !p.isCompleted } : p);
      saveToLocalStorage(next);
      return next;
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < filteredPeople.length) {
          setDisplayLimit(prev => prev + 100);
        }
      },
      { threshold: 0.1 }
    );
    if (scrollObserverRef.current) observer.observe(scrollObserverRef.current);
    return () => observer.disconnect();
  }, [displayLimit, searchQuery, people]);

  const stats = useMemo((): Stats => {
    const total = people.length;
    const completed = people.filter(p => p.isCompleted).length;
    return { total, completed, pending: total - completed };
  }, [people]);

  const filteredPeople = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return people;
    return people.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.address.toLowerCase().includes(query) ||
      (p.phone && p.phone.includes(query))
    );
  }, [people, searchQuery]);

  const visiblePeople = useMemo(() => filteredPeople.slice(0, displayLimit), [filteredPeople, displayLimit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(buffer);
        let text = new TextDecoder('utf-8').decode(uint8Array);
        if (text.includes('\uFFFD')) text = new TextDecoder('gbk').decode(uint8Array);

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const delimiter = lines[0].includes(',') ? ',' : (lines[0].includes(';') ? ';' : '\t');
        const newPeople: Person[] = [];
        const now = Date.now();

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
          const parts = line.split(regex);
          if (parts.length >= 2) {
            newPeople.push({
              id: `p-${now}-${i}`,
              name: parts[0].replace(/^"|"$/g, '').trim(),
              address: parts[1].replace(/^"|"$/g, '').trim(),
              phone: parts[2]?.replace(/^"|"$/g, '').trim(),
              isCompleted: false
            });
          }
          if (i % 800 === 0) await new Promise(r => setTimeout(r, 0));
        }
        if (newPeople.length > 0) {
          const combined = [...people, ...newPeople];
          setPeople(combined);
          saveToLocalStorage(combined); 
          setDisplayLimit(100);
        } else {
          throw new Error("文件解析失败");
        }
      } catch (err: any) {
        setImportError(err.message);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col bg-white select-none overflow-hidden">
      {/* 极简固顶头部 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm safe-area-inset-top">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[15px] font-black text-slate-900 tracking-tighter">外勤助手</h1>
            <div className="flex items-center gap-4">
              <label className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                <Upload size={18} />
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              {people.length > 0 && (
                <button onClick={() => confirm("清空所有数据？") && (setPeople([]), saveToLocalStorage([]))} className="p-1.5 text-slate-300 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* 紧凑统计 */}
          <div className="flex items-center justify-between text-[10px] font-bold mb-2">
            <div className="flex gap-3">
              <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-400">共 {stats.total}</span>
              <span className="bg-emerald-50 px-2 py-0.5 rounded text-emerald-600">已 {stats.completed}</span>
              <span className="bg-amber-50 px-2 py-0.5 rounded text-amber-600">待 {stats.pending}</span>
            </div>
            <div className="text-blue-600 font-black">
              {Math.round((stats.completed / (stats.total || 1)) * 100)}%
            </div>
          </div>

          <div className="flex gap-2">
            <CompactSearchBar value={searchQuery} onChange={(v) => { setSearchQuery(v); setDisplayLimit(100); }} />
          </div>
        </div>
      </header>

      {/* 极致高密度布局 */}
      <main className="flex-1 overflow-y-auto">
        {people.length === 0 ? (
          <div className="py-32 flex flex-col items-center px-10 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-100 mb-4">
              <FileText size={32} />
            </div>
            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">请点击右上角导入任务</p>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            {visiblePeople.map((person, index) => (
              <PersonGridItem 
                key={person.id} 
                person={person} 
                isLeft={index % 2 === 0} 
                onClick={() => setSelectedPerson(person)} 
              />
            ))}
            
            <div ref={scrollObserverRef} className="col-span-2 h-20 flex items-center justify-center">
               {displayLimit < filteredPeople.length && <Loader2 size={14} className="animate-spin text-slate-200" />}
            </div>
          </div>
        )}
      </main>

      {/* 弹窗反馈 */}
      {importError && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] bg-red-600 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <AlertCircle size={16} /> <span className="flex-1">{importError}</span>
          <button onClick={() => setImportError(null)} className="p-1"><X size={16}/></button>
        </div>
      )}

      {isImporting && (
        <div className="fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-100">
            <Loader2 className="text-blue-600 animate-spin mb-2" size={24} />
            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">处理中...</span>
          </div>
        </div>
      )}

      {selectedPerson && (
        <DetailModal 
          person={selectedPerson} 
          onClose={() => setSelectedPerson(null)}
          onToggle={() => togglePersonStatus(selectedPerson.id)}
        />
      )}
    </div>
  );
};

export default App;
