
import React, { useState, useEffect } from "react";
import { Deal } from "@/entities/Deal";
import { LimitedPartner } from "@/entities/LimitedPartner";
import { CapitalActivity } from "@/entities/CapitalActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Briefcase, TrendingUp, Building2, PieChart, PiggyBank, PackagePlus } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

// Colors for the pie chart
const SECTOR_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalFundValue: 0,
    totalInvested: 0,
    totalCommitted: 0,
    totalUndeployed: 0,
    activeDeals: 0,
    totalLPs: 0,
    avgIRR: 0,
    avgMOIC: 0
  });
  const [recentDeals, setRecentDeals] = useState([]);
  const [sectorData, setSectorData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [deals, lps, capitalActivities] = await Promise.all([
        Deal.list('-created_date'),
        LimitedPartner.list(),
        CapitalActivity.list('-date')
      ]);

      // Calculate stats
      const totalInvested = deals.reduce((sum, deal) => sum + (deal.investment_amount || 0), 0);
      const totalCommitted = lps.reduce((sum, lp) => sum + (lp.commitment_amount || 0), 0);
      const totalUndeployed = totalCommitted - totalInvested;

      const totalFundValue = deals.reduce((sum, deal) => {
        if (deal.valuation_snapshots && deal.valuation_snapshots.length > 0) {
          const latestSnapshot = deal.valuation_snapshots.reduce((latest, current) =>
            new Date(current.date) > new Date(latest.date) ? current : latest
          );
          return sum + latestSnapshot.valuation;
        }
        return sum + (deal.investment_amount || 0);
      }, 0);

      const activeDeals = deals.filter(deal => deal.status === 'active').length;

      const dealsWithMetrics = deals.map(deal => {
        let currentValuation = deal.investment_amount || 0;
        if (deal.valuation_snapshots && deal.valuation_snapshots.length > 0) {
          const latestSnapshot = deal.valuation_snapshots.reduce((latest, current) =>
            new Date(current.date) > new Date(latest.date) ? current : latest
          );
          currentValuation = latestSnapshot.valuation;
        }

        const moic = (deal.investment_amount > 0 && currentValuation > 0) ? (currentValuation / deal.investment_amount) : 0;

        let yearsHeld = 0;
        if (deal.entry_date) {
            const entryDate = new Date(deal.entry_date);
            const currentDate = new Date();
            if (entryDate < currentDate) {
                yearsHeld = (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            }
        }

        const MIN_HOLDING_PERIOD_YEARS = 30 / 365.25;
        const irr = (yearsHeld > MIN_HOLDING_PERIOD_YEARS && moic > 0) ? (Math.pow(moic, 1 / yearsHeld) - 1) * 100 : 0;

        return { ...deal, calculated_moic: moic, calculated_irr: irr, current_valuation: currentValuation };
      });

      const validIrrDeals = dealsWithMetrics.filter(d => d.calculated_irr > 0 && isFinite(d.calculated_irr));
      const avgIRR = validIrrDeals.length > 0
        ? validIrrDeals.reduce((sum, deal) => sum + deal.calculated_irr, 0) / validIrrDeals.length
        : 0;

      const validMoicDeals = dealsWithMetrics.filter(d => d.calculated_moic > 0 && isFinite(d.calculated_moic));
      const avgMOIC = validMoicDeals.length > 0
        ? validMoicDeals.reduce((sum, deal) => sum + deal.calculated_moic, 0) / validMoicDeals.length
        : 0;

      setStats({
        totalFundValue,
        totalInvested,
        totalCommitted,
        totalUndeployed,
        activeDeals,
        totalLPs: lps.length,
        avgIRR,
        avgMOIC
      });

      setRecentDeals(deals.slice(0, 5));

      // Sector Distribution Data for Pie Chart
      const sectorMap = {};
      dealsWithMetrics.forEach(deal => {
        const sector = deal.sector || 'Other';
        if (!sectorMap[sector]) {
          sectorMap[sector] = 0;
        }
        sectorMap[sector] += deal.investment_amount || 0;
      });

      const pieChartData = Object.entries(sectorMap)
        .filter(([sector, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          percentage: ((value / totalInvested) * 100).toFixed(1)
        }));
      setSectorData(pieChartData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Fund Overview</h1>
        <p className="text-slate-600">Monitor your fund's performance and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <PiggyBank className="w-8 h-8 text-cyan-600" />
              <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Committed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">${stats.totalCommitted.toLocaleString()}</div>
            <p className="text-sm text-slate-600 mt-1">Total Committed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">Deployed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">${stats.totalInvested.toLocaleString()}</div>
            <p className="text-sm text-slate-600 mt-1">Total Invested</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-lime-50 to-green-50 border-lime-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <PackagePlus className="w-8 h-8 text-lime-600" />
              <Badge className="bg-lime-100 text-lime-800 border-lime-200">Undeployed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">${stats.totalUndeployed.toLocaleString()}</div>
            <p className="text-sm text-slate-600 mt-1">Undeployed Capital</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <DollarSign className="w-8 h-8 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Total AUM</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">${stats.totalFundValue.toLocaleString()}</div>
            <p className="text-sm text-slate-600 mt-1">Current Fund Value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Briefcase className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.activeDeals}</div>
            <p className="text-sm text-slate-600 mt-1">Active Deals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">Partners</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.totalLPs}</div>
            <p className="text-sm text-slate-600 mt-1">Limited Partners</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <PieChart className="w-8 h-8 text-rose-600" />
              <Badge className="bg-rose-100 text-rose-800 border-rose-200">IRR</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.avgIRR.toFixed(1)}%</div>
            <p className="text-sm text-slate-600 mt-1">Average IRR</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Building2 className="w-8 h-8 text-teal-600" />
              <Badge className="bg-teal-100 text-teal-800 border-teal-200">MOIC</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.avgMOIC.toFixed(1)}x</div>
            <p className="text-sm text-slate-600 mt-1">Average MOIC</p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Distribution Pie Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Investment by Sector</CardTitle>
          <p className="text-slate-600">Distribution of capital across sectors</p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Investment']}
                labelFormatter={(label) => `Sector: ${label}`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => `${value} (${entry.payload.percentage}%)`}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Deals */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Recent Deals</CardTitle>
          <p className="text-slate-600">Latest investment activity</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{deal.name}</h3>
                    <p className="text-sm text-slate-600">{deal.sector || 'No Sector'} • {deal.stage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-800">${deal.investment_amount?.toLocaleString()}</div>
                  <Badge
                    className={`mt-1 ${
                      deal.status === 'active' ? 'bg-green-100 text-green-800' :
                      deal.status === 'exited' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {deal.status}
                  </Badge>
                </div>
              </div>
            ))}
            {recentDeals.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                No deals found. Add your first deal to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
