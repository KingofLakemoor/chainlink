import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Wallet, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function WalletMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [filterText, setFilterText] = useState('');
  const { addToast } = useToast();

  const handleRunReconciliation = async (apply: boolean) => {
    if (apply) {
      const confirmText = prompt("⚠️ DANGER: You are about to apply live balance changes to production! Type 'APPLY' to confirm:");
      if (confirmText !== 'APPLY') {
        alert("Operation cancelled. Confirmation text did not match 'APPLY'.");
        return;
      }
    }

    setLoading(true);
    try {
      const { auth } = await import('../../../lib/firebase');
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch('/api/admin/reconcile-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apply })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to execute reconciliation');
      }

      setData(json);
      addToast({
        title: apply ? "Migration Applied!" : "Dry-Run Complete",
        body: apply 
          ? `Successfully migrated ${json.summary.usersWithChanges} accounts.`
          : `Dry-run audited ${json.summary.totalUsers} accounts.`
      });
    } catch (err: any) {
      console.error(err);
      addToast({ title: "Error", body: err.message });
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainlink_wallet_audit_${data.mode}_${data.timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = data?.results?.filter((r: any) => {
    const q = filterText.toLowerCase();
    return (
      r.email.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.userId.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-cyan-400" />
            Club 602 Wallet Migration & Reconciliation
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Dry-run audit and synchronize ChainLink user balances into the central Club 602 Links wallet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleRunReconciliation(false)}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Dry-Run Audit
          </Button>

          {data && (
            <Button
              onClick={handleDownloadJson}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </Button>
          )}

          {data && data.mode === 'DRY_RUN' && (
            <Button
              onClick={() => handleRunReconciliation(true)}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Apply Live Migration
            </Button>
          )}
        </div>
      </div>

      {/* Rules Explainer */}
      <Card className="border-cyan-900/30 bg-cyan-950/10">
        <CardContent className="pt-4 text-xs text-zinc-300 space-y-1">
          <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Active Reconciliation Rules
          </div>
          <div>1. <strong>ChainLink total ≥ 100:</strong> Becomes official base wallet balance.</div>
          <div>2. <strong>ChainLink total &lt; 100:</strong> Floor raised to 100 Links base.</div>
          <div>3. <strong>Core Wallet surplus &gt; 100:</strong> Added to ChainLink total if ChainLink &gt; Core wallet. If Core ≥ ChainLink, adopts Core balance.</div>
          <div>4. <strong>Automated Safety Backup:</strong> All existing profiles are backed up before mutations occur.</div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="text-zinc-500 text-xs font-medium">Total Users</div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">{data.summary.totalUsers}</div>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="text-zinc-500 text-xs font-medium">Accounts Changed</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{data.summary.usersWithChanges}</div>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="text-zinc-500 text-xs font-medium">Total Links (Old)</div>
            <div className="text-2xl font-bold font-mono text-zinc-400 mt-1">{data.summary.totalLinksBefore.toLocaleString()}</div>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="text-zinc-500 text-xs font-medium">Total Links (New)</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{data.summary.totalLinksAfter.toLocaleString()}</div>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="text-zinc-500 text-xs font-medium">Net Delta</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">+{data.summary.netDelta.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {data && (
        <Card className="border-zinc-800 bg-[#121212]">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-zinc-200">
              Audit Breakdown ({filteredResults.length} / {data.results.length} accounts)
            </CardTitle>
            <input
              type="text"
              placeholder="Search user, email, or id..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 w-64"
            />
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/60 border-y border-zinc-800 text-zinc-400">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-right">ChainLink Old</th>
                  <th className="p-3 text-right">Core Old</th>
                  <th className="p-3 text-right font-bold text-cyan-400">Final Balance</th>
                  <th className="p-3 text-right">Delta</th>
                  <th className="p-3">Calculation Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredResults.map((r: any) => (
                  <tr key={r.userId} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-sans font-medium text-white">{r.username}</td>
                    <td className="p-3 text-zinc-400 font-sans">{r.email}</td>
                    <td className="p-3 text-right text-zinc-400">{r.chainlinkLinks.toLocaleString()}</td>
                    <td className="p-3 text-right text-zinc-400">{r.coreLinks.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-cyan-400">{r.finalLinks.toLocaleString()}</td>
                    <td className={`p-3 text-right ${r.deltaChainlink > 0 ? 'text-emerald-400' : r.deltaChainlink < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                      {r.deltaChainlink > 0 ? `+${r.deltaChainlink}` : r.deltaChainlink}
                    </td>
                    <td className="p-3 font-sans text-zinc-400 text-[11px]">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
