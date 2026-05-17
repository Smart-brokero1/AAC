import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowLeft, Package, MapPin, Truck, HelpCircle, Calculator, Store, Headset, User, ChevronDown, Info } from 'lucide-react';
import { Shipment } from '../lib/types';
import TrackingMap from './TrackingMap';
import ShipmentTimeline from './ShipmentTimeline';
import { FDX_LOGO_WHITE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const TrackingView: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Socket setup for real-time updates in local development only.
  useEffect(() => {
    if (!shipment?.id || import.meta.env.PROD) {
      return;
    }

    let socket: any;
    let active = true;

    const connectSocket = async () => {
      const { io } = await import('socket.io-client');
      if (!active) return;
      socket = io();
      socket.on(`shipment_update:${shipment.id}`, (updatedShipment: Shipment) => {
        setShipment(updatedShipment);
      });
    };

    connectSocket();

    return () => {
      active = false;
      socket?.disconnect?.();
    };
  }, [shipment?.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/track/${trackingId}`);
      if (!res.ok) throw new Error("Tracking ID not found");
      const data = await res.json();
      setShipment(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">
      {/* Fdx Style Header */}
      <header className="bg-fdx-purple text-white px-4 md:px-8 py-3 flex items-center justify-start sticky top-0 z-[100]">
        <img 
          src={FDX_LOGO_WHITE_URL} 
          alt="Fdx Logo" 
          className="h-10 md:h-12 w-auto cursor-pointer" 
          onClick={() => setShipment(null)}
        />
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!shipment ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              {/* Hero Section */}
              <section className="relative bg-white pt-12 md:pt-24 pb-32 md:pb-48 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
                  <div className="flex-1 z-10 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-light text-slate-800 leading-tight mb-6">
                      Keep your automotive supply chain moving
                    </h1>
                    <p className="text-slate-600 text-sm md:text-base max-w-md mb-8 leading-relaxed">
                      From tires to transmissions, Fdx handles every part. Reach customers fast with flexible delivery options and logistics that scale with you.
                    </p>
                    <button className="text-fdx-purple font-black uppercase text-sm tracking-widest border-b-2 border-fdx-purple pb-1 hover:text-fdx-orange hover:border-fdx-orange transition-all">
                      GEAR UP TO SHIP
                    </button>
                  </div>
                  
                  <div className="flex-1 relative mt-12 md:mt-0">
                    <picture>
                      <source media="(min-width: 768px)" srcSet="/Auto_hero.gif" />
                      <img src="/hero_mobile_v2.gif" alt="Automotive Parts Shipping" className="w-full h-auto object-cover rounded-2xl" />
                    </picture>
                  </div>
                </div>
              </section>

              {/* Tracking Widget Container - Overlapping */}
              <section className="px-4 -mt-24 md:-mt-32 relative z-20">
                <div className="max-w-5xl mx-auto bg-[#F2F2F2] rounded-3xl p-6 md:p-12 shadow-xl border border-white">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Short Links */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 flex-1">
                      <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Calculator className="w-7 h-7 text-slate-700" />
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight">Get a<br />quote</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Package className="w-7 h-7 text-slate-700" />
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight">Ship<br />now</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Store className="w-7 h-7 text-slate-700" />
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight">Find Fdx<br />locations</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Headset className="w-7 h-7 text-slate-700" />
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight">Contact<br />support</span>
                      </div>
                    </div>

                    {/* Search Field */}
                    <form onSubmit={handleSearch} className="flex-1 w-full max-w-lg flex flex-col sm:flex-row shadow-sm rounded-lg overflow-hidden border border-slate-300">
                      <input 
                        type="text" 
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="Tracking number"
                        className="flex-1 px-4 py-3 sm:px-6 sm:py-4 bg-white text-base sm:text-lg font-light text-slate-700 outline-none italic border-b sm:border-b-0 sm:border-r border-slate-200"
                      />
                      <button 
                        type="submit"
                        disabled={loading}
                        className="bg-fdx-orange text-white px-4 py-3 sm:px-8 sm:py-4 font-black uppercase text-sm tracking-widest hover:brightness-110 transition-all flex items-center justify-center min-w-[100px] sm:min-w-[120px]"
                      >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "TRACK"}
                      </button>
                    </form>
                  </div>
                </div>
              </section>


              
              {error && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150]">
                   <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-3"
                   >
                     <HelpCircle className="w-5 h-5" />
                     {error}
                   </motion.div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden bg-white"
            >
              {/* Top/Left Side: Map and Basic Info */}
              <div className="md:flex-[1.2] flex flex-col min-w-0 bg-slate-100 relative h-[45vh] min-h-[300px] md:h-full shrink-0">
                <div className="absolute inset-0 map-grid-bg opacity-30"></div>
                
                <div className="p-3 md:p-6 flex justify-between items-center z-10 absolute top-0 left-0 right-0">
                  <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Active Pulse</span>
                  </div>
                </div>

                <div className="flex-1 relative z-0">
                  <TrackingMap shipment={shipment} />
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 z-10 hidden md:grid grid-cols-2 gap-4">
                  <div className="bg-white/90 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin</p>
                    <p className="text-xs font-bold text-slate-900 truncate">{shipment.origin.name}</p>
                  </div>
                  <div className="bg-white/90 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                    <p className="text-xs font-bold text-slate-900 truncate">{shipment.destination.name}</p>
                  </div>
                </div>
              </div>

              {/* Bottom/Right Side: Sidebar */}
              <aside className="w-full md:w-[380px] md:flex-none bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 flex-1 md:overflow-y-auto">
                <div className="p-4 md:p-6 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Product Description</h2>
                      <div className="text-lg md:text-2xl font-black text-slate-900 border-b-2 md:border-b-4 border-fdx-orange inline-block pb-0.5">
                        {shipment.packageName}
                      </div>
                    </div>
                    <span className="bg-purple-100 text-fdx-purple px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase self-start">
                      {shipment.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight mb-0.5">Reference No.</div>
                      <div className="text-[11px] font-mono font-bold text-slate-400">{shipment.id}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[8px] text-slate-500 uppercase font-black tracking-tight mb-0.5">Recipient</div>
                      <div className="text-[11px] font-bold text-slate-900 truncate">{shipment.customerName}</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                  <ShipmentTimeline shipment={shipment} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                    <span>Fdx Enterprise &copy; 2024</span>
                    <button aria-label="Help" title="Help" className="hover:text-fdx-purple"><HelpCircle className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TrackingView;
