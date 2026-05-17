import React, { useState, useEffect } from 'react';
import { Plus, User, MapPin, Loader2, Save, Package, Trash2 } from 'lucide-react';
import { Shipment } from '../lib/types';
import { FDX_LOGO_URL, FDX_LOGO_WHITE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPortal: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [newShipment, setNewShipment] = useState({
    customerName: '',
    packageName: '',
    origin: { lat: 0, lng: 0, name: '' },
    destination: { lat: 0, lng: 0, name: '' }
  });

  const geocode = async (query: string): Promise<{ lat: number, lng: number } | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
    return null;
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('swiftlog_admin_token');
    if (saved) {
      setAdminPassword(saved);
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShipments();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      
      if (res.ok) {
        sessionStorage.setItem('swiftlog_admin_token', adminPassword);
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Access Denied. Invalid Authorization Code.');
      }
    } catch (error) {
      setAuthError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    try {
      const res = await fetch('/api/shipments', {
        headers: { 'x-admin-password': adminPassword }
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('swiftlog_admin_token');
        return;
      }
      const data = await res.json();
      setShipments(data);
    } catch (error) {
      console.error("Failed to fetch shipments", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (id: string, progress: number) => {
    try {
      const res = await fetch(`/api/track/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ progress })
      });
      if (res.ok) {
        setShipments(prev => prev.map(s => s.id === id ? { ...s, progress } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteShipment = async (id: string) => {
    const confirmed = window.confirm('Delete this dispatch permanently? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword
        }
      });
      if (res.ok) {
        setShipments(prev => prev.filter(s => s.id !== id));
      } else {
        console.error('Failed to delete shipment', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeocoding(true);

    let originCoords = { lat: newShipment.origin.lat, lng: newShipment.origin.lng };
    let destCoords = { lat: newShipment.destination.lat, lng: newShipment.destination.lng };

    if (originCoords.lat === 0 && originCoords.lng === 0 && newShipment.origin.name) {
      const coords = await geocode(newShipment.origin.name);
      if (coords) originCoords = coords;
    }

    if (destCoords.lat === 0 && destCoords.lng === 0 && newShipment.destination.name) {
      const coords = await geocode(newShipment.destination.name);
      if (coords) destCoords = coords;
    }

    try {
      const payload = {
        ...newShipment,
        origin: { ...newShipment.origin, ...originCoords },
        destination: { ...newShipment.destination, ...destCoords }
      };

      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setShipments(prev => [...prev, data]);
      setIsCreating(false);
      setNewShipment({
        customerName: '',
        packageName: '',
        origin: { lat: 0, lng: 0, name: '' },
        destination: { lat: 0, lng: 0, name: '' }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeocoding(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900"><Loader2 className="animate-spin text-amber-500" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-fdx-purple flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        >
          <div className="text-center mb-8">
            <img src={FDX_LOGO_URL} alt="Fdx Logo" className="h-16 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-fdx-purple tracking-tight">Fleet Login</h1>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.3em] mt-2">Secure Operations Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Security Key</label>
              <input 
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Manager Passcode"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-fdx-orange transition-all font-mono placeholder:text-slate-300"
              />
            </div>
            
            {authError && (
              <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/5 py-2 rounded-lg border border-red-500/10">
                {authError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-fdx-orange text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl active:scale-95"
            >
              Authorize Access
            </button>
          </form>
          
          <p className="text-slate-400 text-[9px] text-center mt-8 uppercase font-bold tracking-tighter">
            Fdx Internal Logistics Portal
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      <header className="bg-fdx-purple text-white px-4 md:px-6 py-4 flex items-center justify-start shrink-0 sticky top-0 z-50 shadow-md">
        <img src={FDX_LOGO_WHITE_URL} alt="Fdx" className="h-8 md:h-10 w-auto" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl mb-8 md:mb-12 border border-slate-200 overflow-hidden"
              >
                <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
                  <Plus className="text-fdx-orange" /> Deploy Fdx Route
                </h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Identity Details</label>
                    <input 
                      type="text" required placeholder="Consignee Name"
                      className="w-full border-b-2 border-slate-100 py-2.5 focus:border-amber-500 outline-none transition-colors font-medium text-slate-900 text-sm"
                      value={newShipment.customerName}
                      onChange={e => setNewShipment(prev => ({ ...prev, customerName: e.target.value }))}
                    />
                    <input 
                      type="text" required placeholder="Package Description"
                      className="w-full border-b-2 border-slate-100 py-2.5 focus:border-amber-500 outline-none transition-colors font-medium text-slate-900 text-sm"
                      value={newShipment.packageName}
                      onChange={e => setNewShipment(prev => ({ ...prev, packageName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Logistics Nodes</label>
                    <input 
                      type="text" required placeholder="Origin City/Country"
                      className="w-full border-b-2 border-slate-100 py-2.5 focus:border-amber-500 outline-none transition-colors font-medium text-slate-900 text-sm"
                      value={newShipment.origin.name}
                      onChange={e => setNewShipment(prev => ({ ...prev, origin: { ...prev.origin, name: e.target.value } }))}
                    />
                    <input 
                      type="text" required placeholder="Destination Hub"
                      className="w-full border-b-2 border-slate-100 py-2.5 focus:border-amber-500 outline-none transition-colors font-medium text-slate-900 text-sm"
                      value={newShipment.destination.name}
                      onChange={e => setNewShipment(prev => ({ ...prev, destination: { ...prev.destination, name: e.target.value } }))}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch gap-3 md:col-span-2">
                    <button 
                      type="submit" 
                      disabled={isGeocoding}
                      className="flex-1 bg-fdx-purple text-white py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeocoding && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isGeocoding ? 'Calculating...' : 'Confirm Shipment'}
                    </button>
                    <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-4 border border-slate-200 rounded-xl md:rounded-2xl text-[10px] font-bold hover:bg-slate-50 transition-colors uppercase text-slate-600">Cancel</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
            <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Operational Dashboard</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start border-t border-slate-200 pt-3 sm:border-0 sm:pt-0">
              <button 
                onClick={() => setIsCreating(true)}
                className="text-[10px] font-black text-fdx-orange uppercase tracking-tighter hover:brightness-110 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Dispatch
              </button>
              <button 
                onClick={() => {
                  sessionStorage.removeItem('swiftlog_admin_token');
                  setIsAuthenticated(false);
                  setAdminPassword('');
                }}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter"
              >
                Secure Exit
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {shipments.map(shipment => (
              <div key={shipment.id} className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-slate-50 rotate-45 translate-x-12 -translate-y-12 md:translate-x-16 md:-translate-y-16 transition-colors group-hover:bg-purple-50"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
                    <div className="flex gap-4 md:gap-5 items-center">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-fdx-purple rounded-xl md:rounded-2xl flex items-center justify-center text-white font-mono text-base md:text-lg font-black shadow-lg">
                        {shipment.id.split('-')[1]}
                      </div>
                      <div>
                        <h3 className="font-black text-lg md:text-xl text-slate-900 font-mono flex items-center gap-2 flex-wrap">
                          {shipment.id}
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">
                            {shipment.packageName}
                          </span>
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-tighter"><User className="w-3 h-3" /> {shipment.customerName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 md:gap-10 w-full sm:w-auto">
                      <div className="text-left sm:text-right flex-1 sm:flex-none">
                        <p className="text-[8px] uppercase font-black text-slate-300 tracking-widest mb-1">Origin</p>
                        <p className="text-[11px] md:text-sm font-black text-slate-700 uppercase">{shipment.origin.name || 'WH'}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                      <div className="text-right flex-1 sm:flex-none">
                        <p className="text-[8px] uppercase font-black text-slate-300 tracking-widest mb-1">Target</p>
                        <p className="text-[11px] md:text-sm font-black text-slate-700 uppercase">{shipment.destination.name || 'Hub'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Simulation</span>
                         <span className="bg-purple-100 text-fdx-purple px-1.5 py-0.5 rounded text-[7px] font-black">LIVE</span>
                      </div>
                      <span className="font-mono text-fdx-orange font-black text-base md:text-lg">{shipment.progress}%</span>
                    </div>
                    
                    <div className="relative pt-1">
                      <label htmlFor={`shipment-progress-${shipment.id}`} className="sr-only">Shipment progress</label>
                      <input 
                        id={`shipment-progress-${shipment.id}`}
                        type="range" 
                        min="0" max="100" 
                        value={shipment.progress}
                        onChange={(e) => updateProgress(shipment.id, parseInt(e.target.value))}
                        aria-label="Shipment progress"
                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-fdx-orange"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t border-slate-50 gap-3">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Current Pulse: <span className="text-fdx-purple">{shipment.status}</span></p>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => updateProgress(shipment.id, 100)}
                          className="text-[9px] font-black uppercase bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-purple-50 hover:border-fdx-purple transition-all text-slate-600 text-center"
                        >
                          Force Delivery Completion
                        </button>
                        <button
                          onClick={() => deleteShipment(shipment.id)}
                          className="text-[9px] font-black uppercase bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
          <span>Fdx Fleet Command &copy; 2024</span>
          <span>System Integrity: Optimal</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminPortal;
