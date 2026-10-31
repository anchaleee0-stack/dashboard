// src/components/dashboard/DashboardOverview.tsx
'use client';

import React, { useState } from 'react';
import {
  DoorOpen,
  CalendarCheck2,
  Activity,
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

export interface DashboardMetrics {
  availableRoomsNow: number;
  totalActiveRooms: number;
  maintenanceRooms: number;
  bookingsToday: number;
  bookingsDeltaPercent: number;
  occupancyRate: number;
  peakHourRange: string;
  hourlyTrend: {
    hour: string;
    bookings: number;
    occupancy: number;
  }[];
  roomUsageRanking: {
    roomName: string;
    hoursUsed: number;
    colorCode: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  }[];
}

interface DashboardOverviewProps {
  metrics: DashboardMetrics;
}

export default function DashboardOverview({ metrics }: DashboardOverviewProps) {
  const [chartMode, setChartMode] = useState<'occupancy' | 'bookings'>('occupancy');

  const statCards = [
    {
      id: 'available',
      title: 'ห้องว่างตอนนี้ (Available Now)',
      value: `${metrics.availableRoomsNow} / ${metrics.totalActiveRooms}`,
      subtext:
        metrics.maintenanceRooms > 0
          ? `ปิดปรับปรุง ${metrics.maintenanceRooms} ห้อง`
          : 'พร้อมใช้งานทุกห้อง',
      badge: 'Real-time Live',
      icon: DoorOpen,
      accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      iconBg: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      pulseDot: 'bg-emerald-400',
    },
    {
      id: 'today-bookings',
      title: 'การจองวันนี้ (Bookings Today)',
      value: `${metrics.bookingsToday} รายการ`,
      subtext: `+${metrics.bookingsDeltaPercent}% จากค่าเฉลี่ยสัปดาห์นี้`,
      badge: 'Active Schedule',
      icon: CalendarCheck2,
      accentGradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      iconBg: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      pulseDot: 'bg-blue-400',
    },
    {
      id: 'occupancy',
      title: 'อัตราการใช้งาน (Occupancy Rate)',
      value: `${metrics.occupancyRate}%`,
      subtext: `ช่วงเวลาพีค: ${metrics.peakHourRange}`,
      badge: metrics.occupancyRate > 75 ? 'High Demand' : 'Optimal',
      icon: Activity,
      accentGradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
      iconBg: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
      badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      pulseDot: 'bg-violet-400',
    },
  ];

  return (
    <section className="space-y-6">
      {/* 1. Floating Gravity Stat Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {statCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              style={{ animationDelay: `${idx * 100}ms` }}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-slate-700 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.25)]"
            >
              {/* Ambient Floating Glow */}
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${card.accentGradient} blur-2xl transition-transform duration-700 group-hover:scale-150`}
              />

              <div className="relative z-10 flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${card.iconBg}`}
                >
                  <IconComponent className="h-6 w-6" />
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${card.badgeColor}`}
                >
                  <span className={`h-1.5 w-1.5 animate-ping rounded-full ${card.pulseDot}`} />
                  {card.badge}
                </span>
              </div>

              <div className="relative z-10 mt-5">
                <p className="text-sm font-medium text-slate-400">{card.title}</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="text-3xl font-bold tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">
                    {card.value}
                  </h3>
                  <ArrowUpRight className="h-5 w-5 text-slate-500 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-300 group-hover:opacity-100" />
                </div>
                <p className="mt-2 text-xs text-slate-400/90">{card.subtext}</p>
              </div>

              {/* Progress Bar เฉพาะการ์ด Occupancy Rate */}
              {card.id === 'occupancy' && (
                <div className="relative z-10 mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, metrics.occupancyRate)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Charts Section: Usage Trend (Recharts) & Top Rooms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* กราฟแนวโน้มการใช้งานตามช่วงเวลา (Peak Hours Area Chart) */}
        <div className="group relative col-span-1 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl transition-all duration-500 hover:border-slate-700/80 lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">
                  แนวโน้มการใช้งานและช่วงเวลาพีค (Peak Hours Trend)
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                วิเคราะห์ความหนาแน่นของการใช้ห้องประชุมรายชั่วโมง (08:00 - 18:00 น.)
              </p>
            </div>

            {/* ปุ่มสลับมุมมองกราฟ */}
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setChartMode('occupancy')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  chartMode === 'occupancy'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                อัตราความหนาแน่น (%)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('bookings')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  chartMode === 'bookings'
                    ? 'bg-blue-500/20 text-blue-300 shadow-sm ring-1 ring-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                จำนวนห้องที่ถูกจอง
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics.hourlyTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit={chartMode === 'occupancy' ? '%' : ''}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    color: '#F8FAFC',
                  }}
                  formatter={(value: number) =>
                    chartMode === 'occupancy'
                      ? [`${value}%`, 'อัตราการใช้งาน']
                      : [`${value} ห้อง`, 'จำนวนที่ถูกจอง']
                  }
                />
                <Area
                  type="monotone"
                  dataKey={chartMode}
                  stroke="#22D3EE"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* อันดับห้องประชุมที่ถูกใช้งานสูงสุด (Room Popularity Bar Chart & Status) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl transition-all duration-500 hover:border-slate-700/80">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">ห้องประชุมยอดนิยม</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">ชั่วโมงการใช้งานสะสมในสัปดาห์นี้</p>
            </div>
            <Clock className="h-5 w-5 text-slate-500" />
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.roomUsageRanking}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="roomName"
                  stroke="#CBD5E1"
                  fontSize={12}
                  width={95}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#F8FAFC',
                  }}
                  formatter={(value: number) => [`${value} ชม.`, 'เวลาใช้งานสะสม']}
                />
                <Bar dataKey="hoursUsed" radius={[0, 8, 8, 0]} barSize={16}>
                  {metrics.roomUsageRanking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.colorCode} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* สรุปสถานะสีห้องด้านล่าง */}
          <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> ว่างพร้อมใช้
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> ใช้งานอยู่
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> ปิดปรับปรุง
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
