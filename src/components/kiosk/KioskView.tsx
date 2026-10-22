'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  PhoneCall, 
  ShieldAlert, 
  Droplet, 
  Clock, 
  MapPin, 
  Building2, 
  AlertTriangle, 
  Trees, 
  ArrowLeft,
  QrCode,
  CheckCircle2,
  BellRing
} from 'lucide-react';

export default function KioskView() {
  const { incidents, setActiveTab, t } = useApp();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const emergencyContacts = [
    { title: 'Elmina Auxiliary Police Control Room', number: '03-7839 8888', note: '24-Hour Patrol • Rapid Response' },
    { title: 'Kota Damansara Fire & Rescue Station', number: '03-6140 7444', note: 'Fire & Flood Emergency' },
    { title: 'Elmina JMB Management Office', number: '03-7832 1100', note: 'Operating Hours: 8:30 AM - 5:30 PM' },
    { title: 'National Emergency Response Service', number: '999', note: 'Police / Ambulance / Civil Defense' },
  ];

  const criticalIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between select-none">
      {/* Kiosk Top Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Hub</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-lg">
              TE
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>TESDH Wall-Mounted Tablet Kiosk</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  Guardhouse 1
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-wider">
            {currentTime || '08:30:00 AM'}
          </div>
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main Grid for Tablet Wall Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 flex-1">
        {/* Left 2 Cols: Live Resilience Board & Monsoon Warning */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Weather / Flood Warning Ticker */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-700/50 p-5 rounded-3xl shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0">
                <Droplet className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Bandar Elmina Monsoon Retention Basin Status: NORMAL / CONTROLLED
                </span>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-snug">
                  Automated pumping stations operating at 100% capacity. Wetland water control gates open at safe retention levels.
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block shrink-0">
              <span className="text-xs font-bold text-emerald-300 bg-emerald-900/80 px-3 py-1 rounded-full border border-emerald-600/40">
                Updated: 10 mins ago
              </span>
            </div>
          </div>

          {/* Active Incidents Monitor */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Active Field Incidents ({criticalIncidents.length})</span>
              </h2>
              <span className="text-xs text-slate-400">Live Guardhouse Broadcast</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {criticalIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        inc.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <h3 className="text-xs font-bold text-white">{inc.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{inc.locationName}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-3 py-1 rounded-xl border border-indigo-700/50 block">
                      {inc.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {inc.assignedTeam || 'Field Operations Team'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Emergency Contacts & Visitor Access Guidelines */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Emergency Hotlines Card */}
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Elmina Emergency Hotlines</span>
            </h2>

            <div className="space-y-2.5">
              {emergencyContacts.map((contact, idx) => (
                <div key={idx} className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{contact.title}</span>
                    <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      {contact.number}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{contact.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visitor Pass QR Notice */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950/60 rounded-3xl p-5 border border-emerald-900/50 shadow-xl text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-emerald-400">
              <QrCode className="w-7 h-7" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Visitor & Contractor Registration
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please ensure visitor vehicle registration numbers are pre-submitted via the resident app or scan the QR code at the guardhouse registration desk.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>© 2026 Sime Darby Property • TESDH Township Ecosystem</span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Guardhouse Hub Network Online
        </span>
      </div>
    </div>
  );
}
