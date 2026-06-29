/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  HelpCircle, 
  Percent, 
  ShieldCheck, 
  Coins, 
  Award,
  DollarSign
} from 'lucide-react';

export default function IncentiveViewer() {
  const [basePay, setBasePay] = useState<number>(50000);
  const [variablePay, setVariablePay] = useState<number>(20000);
  const [gateStatus, setGateStatus] = useState<'Full' | 'Watch' | 'Low' | 'Critical'>('Full');
  const [discretionaryOverride, setDiscretionaryOverride] = useState<boolean>(false);

  // Computations
  let multiplier = 1.0;
  let deductionReason = '100% Payout / No Deduction';

  if (gateStatus === 'Full') {
    multiplier = 1.0;
    deductionReason = 'Full KPI achievement (>=100%) triggers 100% payout.';
  } else if (gateStatus === 'Watch') {
    if (discretionaryOverride) {
      multiplier = 1.0;
      deductionReason = 'Admin Override: Discretionary 100% variable payout granted.';
    } else {
      multiplier = 0.9;
      deductionReason = 'Watch list (80-99%) triggers automatic 10% deduction.';
    }
  } else if (gateStatus === 'Low') {
    multiplier = 0.5;
    deductionReason = 'Low performance list (60-79%) triggers 50% penalty deduction.';
  } else if (gateStatus === 'Critical') {
    multiplier = 0.0;
    deductionReason = 'Critical low performance (<60%) forfeits all performance variable pay.';
  }

  const finalVariablePay = Math.round(variablePay * multiplier);
  const totalPayout = basePay + finalVariablePay;

  return (
    <div id="incentive_viewer_container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Description column */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rules & Deductions</span>
          <h2 className="text-xl font-bold font-display text-gray-900 mt-1">Incentive Gates</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Variables are directly mapped to monthly KPI Gates. Deductions are automated based on final weighted performance scores:
          </p>
          
          <div className="space-y-3 mt-6">
            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-xs">
              <span className="font-bold text-emerald-800 flex items-center gap-1">🟢 Full (≥100% Performance)</span>
              <p className="text-gray-600 mt-1">100% performance variable payout with zero deductions.</p>
            </div>

            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 text-xs">
              <span className="font-bold text-amber-800 flex items-center gap-1">🟡 Watch (80–99% Performance)</span>
              <p className="text-gray-600 mt-1">10% automatic deduction, unless Head of Digital triggers discretionary waiver.</p>
            </div>

            <div className="p-3 rounded-xl border border-orange-100 bg-orange-50/50 text-xs">
              <span className="font-bold text-orange-800 flex items-center gap-1">🟠 Low (60–79% Performance)</span>
              <p className="text-gray-600 mt-1">50% automatic penalty deduction on your variable pay.</p>
            </div>

            <div className="p-3 rounded-xl border border-red-100 bg-red-50/50 text-xs">
              <span className="font-bold text-red-800 flex items-center gap-1">🔴 Critical (&lt;60% Performance)</span>
              <p className="text-gray-600 mt-1">Zero variable payout. Ground for instant performance improvement review.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Calculator Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold font-display text-gray-900 mb-4">Variable Pay Payout Simulator</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Basic Base Payout (Fixed)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">INR</span>
                  <input
                    type="number"
                    value={basePay}
                    onChange={(e) => setBasePay(Number(e.target.value))}
                    className="pl-12 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Potential Monthly Performance Variable</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">INR</span>
                  <input
                    type="number"
                    value={variablePay}
                    onChange={(e) => setVariablePay(Number(e.target.value))}
                    className="pl-12 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">KPI Score Gate Status</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Full', 'Watch', 'Low', 'Critical'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setGateStatus(status);
                        if (status !== 'Watch') setDiscretionaryOverride(false);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        gateStatus === status 
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {gateStatus === 'Watch' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <span className="text-[11px] font-bold text-amber-800">Head of Digital Discretion Waiver</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={discretionaryOverride}
                      onChange={(e) => setDiscretionaryOverride(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Grant discretionary full payout? (waive 10% penalty)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Simulated Summary results column */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>Simulated Pay Slip</span>
                </div>
                
                <div className="space-y-3 mt-4 text-xs">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Fixed Basic:</span>
                    <span className="font-bold text-gray-800">INR {basePay.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Max Variable potential:</span>
                    <span className="font-semibold text-gray-500">INR {variablePay.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Gate Payout Multiplier:</span>
                    <span className="font-bold text-indigo-600">{Math.round(multiplier * 100)}%</span>
                  </div>

                  <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 p-2 rounded border border-emerald-200">
                    <span>Approved Variable:</span>
                    <span>INR {finalVariablePay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gross Simulated Payout</span>
                <p className="text-2xl font-extrabold text-gray-900 font-display mt-1">INR {totalPayout.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 mt-2 leading-tight bg-white p-2 rounded-lg border border-gray-100">
                  {deductionReason}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
