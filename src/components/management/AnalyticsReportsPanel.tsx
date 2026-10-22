'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  AnalyticsDataset, 
  ManagementReport, 
  ManagementReportType 
} from '@/types';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Download, 
  Printer, 
  FileText, 
  Layers, 
  RefreshCw, 
  Filter, 
  Share2, 
  Calendar, 
  ChevronRight, 
  Users, 
  ShieldAlert, 
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';

interface AnalyticsReportsPanelProps {
  onNavigateTab: (tab: string, filter?: { filterKey?: string; filterValue?: string }) => void;
}

export default function AnalyticsReportsPanel({ onNavigateTab }: AnalyticsReportsPanelProps) {
  const { 
    managementAnalytics, 
    isAnalyticsLoading, 
    fetchManagementAnalytics, 
    managementPeriod, 
    setManagementPeriod,
    generateOperationalReport,
    language 
  } = useApp();

  const isMalay = language === 'bm' || language === 'ms-MY';

  // Sub-tabs: 'analytics' | 'reports' | 'hotspots'
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'reports' | 'hotspots'>('analytics');

  // Report Generator state
  const [selectedReportType, setSelectedReportType] = useState<ManagementReportType>('monthly');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ManagementReport | null>(null);

  const handlePeriodChange = (period: '7d' | '30d' | '90d') => {
    setManagementPeriod(period);
    fetchManagementAnalytics(period);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateOperationalReport(selectedReportType);
      if (report) {
        setGeneratedReport(report);
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    window.open(`/api/management/export?period=${managementPeriod}`, '_blank');
  };

  if (!managementAnalytics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#9E1315] mx-auto" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {isMalay ? 'Sedang memuatkan data analitik operasi...' : 'Loading operational analytics and performance telemetry...'}
        </p>
      </div>
    );
  }

  const dataset = managementAnalytics;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#9E1315]" />
            <span>{isMalay ? 'Pusat Analitik & Laporan Pengurusan' : 'Operational Analytics & Reports'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isMalay 
              ? `Data operasi berkanun (Zon Masa: ${dataset.timezone}). Dikemas kini: ${new Date(dataset.lastRefreshed).toLocaleTimeString('en-MY')}`
              : `Deterministic telemetry (Timezone: ${dataset.timezone}). Refreshed: ${new Date(dataset.lastRefreshed).toLocaleTimeString('en-MY')}`}
          </p>
        </div>

        {/* Action Controls & Date Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            {(['7d', '30d', '90d'] as const).map((p) => {
              const labels = { '7d': '7D', '30d': '30D', '90d': '90D' };
              const isSelected = managementPeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#9E1315] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchManagementAnalytics(managementPeriod)}
            disabled={isAnalyticsLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'analytics'
              ? 'border-[#9E1315] text-[#9E1315]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isMalay ? 'Metrik Prestasi' : 'Operational Metrics'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hotspots')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'hotspots'
              ? 'border-[#9E1315] text-[#9E1315]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{isMalay ? 'Tumpuan Geografi (GIS)' : 'Geographic Hotspots'}</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300 rounded-full font-mono">
            {dataset.incidentMetrics.hotspots.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'reports'
              ? 'border-[#9E1315] text-[#9E1315]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isMalay ? 'Penjana Laporan Berkanun' : 'On-Demand Reports'}</span>
        </button>
      </div>

      {/* 3. Sub-Tab Content */}

      {/* A. OPERATIONAL METRICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Key KPI Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isMalay ? 'Jumlah Insiden Dilaporkan' : 'Total Incident Reports'}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {dataset.incidentMetrics.total}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {dataset.incidentMetrics.resolved} Resolved
                </span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {dataset.incidentMetrics.open} Open
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isMalay ? 'Kadar Penyelesaian' : 'Resolution Rate'}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {dataset.incidentMetrics.resolutionRatePercent}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Target: &gt; 80% monthly velocity
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mean Time to Resolution (MTTR)
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {dataset.incidentMetrics.meanTimeToResolutionHours}h
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Average contractor turnaround
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isMalay ? 'Tunggakan &gt; 48 Jam' : 'Backlog &gt; 48 Hours'}
              </div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${dataset.incidentMetrics.backlogOver48h > 0 ? 'text-[#9E1315]' : 'text-slate-400'}`}>
                {dataset.incidentMetrics.backlogOver48h}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {dataset.incidentMetrics.backlogOver48h > 0 ? 'Requires priority attention' : 'Zero SLA violations'}
              </div>
            </div>
          </div>

          {/* Category Distribution & Moderation Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isMalay ? 'Pecahan Insiden Mengikut Kategori' : 'Incidents by Hazard Category'}
                  </h3>
                  <p className="text-xs text-slate-500">Distribution of civic complaints</p>
                </div>
                <button
                  onClick={() => onNavigateTab('incidents')}
                  className="text-xs font-bold text-[#9E1315] hover:underline cursor-pointer"
                >
                  Manage Incidents
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {dataset.incidentMetrics.byCategory.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{cat.label}</span>
                      <span className="text-slate-500 font-mono">{cat.count} ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(cat.percentage, 4)}%`,
                          backgroundColor: cat.color || '#9E1315',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moderation Operational Health */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isMalay ? 'Kesihatan Sistem Moderasi Komuniti' : 'Moderation Operational Health'}
                  </h3>
                  <p className="text-xs text-slate-500">Dual-engine triage queue & background pipeline</p>
                </div>
                <button
                  onClick={() => onNavigateTab('moderation')}
                  className="text-xs font-bold text-[#9E1315] hover:underline cursor-pointer"
                >
                  Open Queue
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Unified Cases</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {dataset.moderationMetrics.totalCases}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {dataset.moderationMetrics.pendingReview} pending review
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Violations Removed</div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {dataset.moderationMetrics.removedCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Soft-deleted with audit
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Reports Dismissed</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {dataset.moderationMetrics.dismissedCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {dataset.moderationMetrics.falsePositiveRatePercent}% false-positive rate
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">AI Job Outbox</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {dataset.moderationMetrics.jobQueue.total}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${dataset.moderationMetrics.jobQueue.failed > 0 ? 'text-[#9E1315]' : 'text-emerald-600'}`}>
                    {dataset.moderationMetrics.jobQueue.failed > 0 ? `${dataset.moderationMetrics.jobQueue.failed} failed jobs` : 'All jobs healthy'}
                  </div>
                </div>
              </div>

              {/* Reason tags */}
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Report Reasons</div>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.moderationMetrics.byReason.map((r) => (
                    <span 
                      key={r.reason}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {r.reason}: <span className="font-bold">{r.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Time Series Activity Overview */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isMalay ? 'Aliran Aktiviti Komuniti Bersepadu' : 'Township Engagement & Operational Velocity'}
                </h3>
                <p className="text-xs text-slate-500">Cross-module trends over the selected period</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9E1315]" /> Incidents
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Posts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Exchange
                </span>
              </div>
            </div>

            {/* SVG Visual Activity Chart */}
            {(() => {
              const totalPts = dataset.timeSeries.length;
              const labelStep = totalPts <= 7 ? 1 : totalPts <= 15 ? 2 : totalPts <= 35 ? 5 : 10;
              const barWidth = totalPts > 25 ? 'w-0.5 sm:w-1' : totalPts > 12 ? 'w-1 sm:w-1.5' : 'w-1.5 sm:w-2';
              const gapClass = totalPts > 25 ? 'gap-0.5' : totalPts > 12 ? 'gap-1' : 'gap-1.5 sm:gap-3';
              const maxVal = Math.max(...dataset.timeSeries.map((t) => t.incidents + t.posts + t.exchange), 10);

              return (
                <div className={`h-44 w-full min-w-0 overflow-x-hidden pt-4 flex items-end border-b border-slate-100 dark:border-slate-800 ${gapClass}`}>
                  {dataset.timeSeries.map((pt, idx) => {
                    const incHeight = (pt.incidents / maxVal) * 100;
                    const postHeight = (pt.posts / maxVal) * 100;
                    const exchHeight = (pt.exchange / maxVal) * 100;
                    const shouldShowLabel = idx % labelStep === 0 || idx === totalPts - 1;
                    const tooltipAlign = idx < 2 ? 'left-0' : idx > totalPts - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';

                    return (
                      <div key={idx} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip on hover */}
                        <div className={`absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md ${tooltipAlign}`}>
                          {pt.label}: {pt.incidents} inc • {pt.posts} posts • {pt.exchange} exch
                        </div>

                        <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-32">
                          <div 
                            className={`${barWidth} rounded-t-sm bg-[#9E1315] transition-all`}
                            style={{ height: `${Math.max(incHeight, 4)}%` }}
                          />
                          <div 
                            className={`${barWidth} rounded-t-sm bg-blue-600 transition-all`}
                            style={{ height: `${Math.max(postHeight, 4)}%` }}
                          />
                          <div 
                            className={`${barWidth} rounded-t-sm bg-emerald-600 transition-all`}
                            style={{ height: `${Math.max(exchHeight, 4)}%` }}
                          />
                        </div>
                        <div className="h-4 w-full flex items-center justify-center overflow-hidden">
                          {shouldShowLabel ? (
                            <span className="text-[9px] text-slate-400 font-mono truncate w-full text-center block scale-90">
                              {pt.label}
                            </span>
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* B. GEOGRAPHIC HOTSPOTS (GIS) */}
      {activeSubTab === 'hotspots' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/60 flex items-start gap-4">
            <MapPin className="w-6 h-6 text-[#9E1315] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                {isMalay ? 'Analisis Tumpuan Geografi Bandar Elmina (Sime Darby GIS)' : 'Bandar Elmina Geographic Hotspots (Sime Darby GIS)'}
              </h3>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1 leading-relaxed">
                {isMalay
                  ? 'Berdasarkan koordinat GPS sebenar laporan insiden. Tiada koordinat atau lokasi tiruan digunakan. Kluster yang mencatatkan lebih daripada 2 aduan ditandakan sebagai zon tumpuan pembaikan.'
                  : 'Derived strictly from verified GPS telemetry. No synthetic coordinates are generated. High-density incident clusters indicate recurring civil or drainage issues requiring municipal attention.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dataset.incidentMetrics.hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {hotspot.precinct}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                    {hotspot.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Total Reports</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{hotspot.count}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Unresolved</div>
                      <div className={`text-lg font-black mt-0.5 ${hotspot.unresolvedCount > 0 ? 'text-[#9E1315]' : 'text-emerald-600'}`}>
                        {hotspot.unresolvedCount}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Hazard: <strong className="text-slate-800 dark:text-slate-200">{hotspot.primaryCategory.replace('_', ' ')}</strong>
                  </span>
                  <button
                    onClick={() => onNavigateTab('resilience')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9E1315] hover:underline cursor-pointer"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C. ON-DEMAND REPORT GENERATOR & VIEWER */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Report Builder Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isMalay ? 'Penjana Laporan Pengurusan Berasaskan Bukti' : 'Evidence-Based Management Report Generator'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isMalay 
                    ? 'Hasilkan laporan rasmi untuk mesyuarat JMB, audit keselamatan, atau semakan penyelenggaraan.'
                    : 'Generate official briefings for JMB meetings, safety reviews, or municipal audits.'}
                </p>
              </div>

              {/* Action Trigger */}
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#9E1315] hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReport ? (isMalay ? 'Menjana Laporan...' : 'Compiling Report...') : (isMalay ? 'Jana Laporan' : 'Generate Report')}</span>
              </button>
            </div>

            {/* Report Type Selector Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {[
                { type: 'daily' as const, label: 'Daily Briefing' },
                { type: 'weekly' as const, label: 'Weekly Summary' },
                { type: 'monthly' as const, label: 'Monthly JMB Executive' },
                { type: 'incident_focus' as const, label: 'Incident Deep Dive' },
                { type: 'moderation_focus' as const, label: 'Moderation & Safety Audit' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setSelectedReportType(item.type)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedReportType === item.type
                      ? 'bg-[#9E1315] text-white border-[#9E1315] shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Report Viewer */}
          {generatedReport && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md p-8 sm:p-10 space-y-8 printable-report">
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#9E1315]">
                    Sime Darby Property • Bandar Elmina JMB
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {generatedReport.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                    <span>Period: <strong>{generatedReport.reportingPeriod.label}</strong></span>
                    <span>•</span>
                    <span>Officer: <strong>{generatedReport.generatedBy}</strong></span>
                    <span>•</span>
                    <span>Date: <strong>{new Date(generatedReport.generatedAt).toLocaleDateString('en-MY')}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Executive Summary
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  {generatedReport.executiveSummary}
                </p>
              </div>

              {/* 2. Key Metrics Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Key Operational Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {generatedReport.keyMetrics.map((km, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 font-medium">{km.name}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{km.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Incidents & Moderation Overviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. Civic Incident & Infrastructure Status
                  </h4>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {generatedReport.incidentOverview.bottleneckSummary}
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    4. Community Trust & Moderation Audit
                  </h4>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {generatedReport.moderationOverview.summary}
                  </div>
                </div>
              </div>

              {/* 4. Recommended Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  5. Actionable Follow-Up Recommendations
                </h4>
                <div className="space-y-2">
                  {generatedReport.recommendedFollowUp.map((rec, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3"
                    >
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-0.5 ${
                        rec.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {rec.priority}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{rec.recommendation}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{rec.rationalEvidence}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signatures & Provenance */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-6 text-xs text-slate-400">
                <div>
                  <div>Model: {generatedReport.provenance.modelUsed}</div>
                  <div>Records Analyzed: {generatedReport.provenance.recordsAnalyzed}</div>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-slate-300 dark:border-slate-700 w-48 ml-auto" />
                  <div className="font-bold text-slate-700 dark:text-slate-300 mt-1">Authorized Management Sign-Off</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
