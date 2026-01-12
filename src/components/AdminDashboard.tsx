import { useEffect, useState } from 'react';
import { Package, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Analytics {
  unclaimedItems: number;
  claimedItems: number;
  recoveryRate: number;
}

interface AdminDashboardProps {
  campus: string;
  building: string;
}

export default function AdminDashboard({ campus, building }: AdminDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics>({
    unclaimedItems: 0,
    claimedItems: 0,
    recoveryRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [campus, building]);

  const loadAnalytics = async () => {
    setLoading(true);

    const [unclaimedResult, claimedResult] = await Promise.all([
      supabase
        .from('items')
        .select('id', { count: 'exact' })
        .eq('campus_slug', campus)
        .eq('status', 'available'),
      supabase
        .from('items')
        .select('id', { count: 'exact' })
        .eq('campus_slug', campus)
        .eq('status', 'picked_up')
    ]);

    const unclaimedItems = unclaimedResult.count || 0;
    const claimedItems = claimedResult.count || 0;
    const totalItems = unclaimedItems + claimedItems;
    const recoveryRate = totalItems > 0 ? (claimedItems / totalItems) * 100 : 0;

    setAnalytics({
      unclaimedItems,
      claimedItems,
      recoveryRate
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analytics Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Unclaimed Items</h3>
          <p className="text-3xl font-bold text-slate-900">{analytics.unclaimedItems}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Claimed Items</h3>
          <p className="text-3xl font-bold text-slate-900">{analytics.claimedItems}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Recovery Rate</h3>
          <p className="text-3xl font-bold text-slate-900">{analytics.recoveryRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
