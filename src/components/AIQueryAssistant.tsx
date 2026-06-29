/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';

interface AIQueryAssistantProps {
  token: string;
}

export default function AIQueryAssistant({ token }: AIQueryAssistantProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const samplePrompts = [
    "Audit team utilization and highlight gaps",
    "Identify under-performing KPIs on Watch list",
    "How did central SPOCs perform in GT leads targets?",
    "Summarize timesheet approvals pending queue"
  ];

  const handleQuery = async (customQuery?: string) => {
    setError('');
    setResponse('');
    const finalQuery = customQuery || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: finalQuery })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      setResponse(data.report);
      setQuery('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
  };

  return (
    <div id="ai_query_assistant_container" className="space-y-6 font-sans">
      
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden border border-indigo-950">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Bot className="h-48 w-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20">
            🤖 AI-Powered Auditor
          </span>
          <h2 className="text-2xl font-bold font-display tracking-tight mt-1">Timesheet & KPI Intelligence</h2>
          <p className="text-xs text-indigo-200 max-w-xl">
            Query deep insights into team performance, time utilization gaps, conversion metrics, and monthly scorecard summaries using natural language.
          </p>
        </div>
      </div>

      {/* Query panel and Response container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Prompt triggers column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Audit Guidelines</span>
            <h3 className="text-base font-bold font-display text-gray-900 mt-1 mb-4">Sample Auditing Queries</h3>
            
            <div className="space-y-3">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuery(p)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center justify-between gap-2 transition disabled:opacity-50"
                >
                  <span>{p}</span>
                  <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-start gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Auditor evaluates real-time data from timesheets, clock logs, and KPI actuals.</span>
          </div>
        </div>

        {/* Console / Auditor workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            
            {/* Query bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask the Performance Auditor anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) handleQuery();
                }}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                id="send_ai_query_btn"
                onClick={() => handleQuery()}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Audit</span>
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
                ⚠️ {error}
              </div>
            )}

            {/* Results Terminal screen */}
            <div className="bg-gray-900 rounded-2xl p-6 text-gray-300 min-h-[300px] flex flex-col justify-between font-mono text-xs relative">
              
              {loading ? (
                <div className="flex flex-col items-center justify-center space-y-3 absolute inset-0 bg-gray-900/90 rounded-2xl">
                  <Bot className="h-8 w-8 text-indigo-400 animate-bounce" />
                  <p className="text-gray-400">Interrogating KPI & Attendance indices...</p>
                </div>
              ) : null}

              {response ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">🟢 AUDIT REPORT RECEIVED</span>
                    <button
                      onClick={copyResponse}
                      className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
                      title="Copy report markdown"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[350px] leading-relaxed text-gray-200 select-text whitespace-pre-wrap">
                    {response}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 py-12 text-gray-500 text-center">
                  <Bot className="h-10 w-10 text-gray-700" />
                  <p className="font-semibold text-gray-400">Terminal Idle</p>
                  <p className="text-gray-600 max-w-xs">Ask a question or select a sample query above to compile real-time performance reports.</p>
                </div>
              )}

              <div className="border-t border-gray-800 pt-3 mt-4 flex justify-between text-[9px] text-gray-600">
                <span>Model: gemini-2.5-flash-auditor</span>
                <span>Workspace: Sec-Port-3000</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
