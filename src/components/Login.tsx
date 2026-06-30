/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, User, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for password reset & forgot password
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [tempPassExposed, setTempPassExposed] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId, password })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an unexpected response. Please try again in a few seconds.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.user.must_reset_password) {
        // Switch to reset password mode, saving token and user info
        setTempToken(data.token);
        setMode('reset');
      } else {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger reset');
      }

      setMessage(data.message);
      if (data.tempPassword) {
        setTempPassExposed(data.tempPassword);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      // Automatically login after successful password reset
      setMessage('Password reset successful! Logging you in...');
      setTimeout(async () => {
        // Fetch fresh user profile details
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId, password: newPassword })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          onLoginSuccess(loginData.user, loginData.token);
        } else {
          setMode('login');
          setPassword('');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_screen_container" className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
      >
        {/* Brand visual header */}
        <div className="text-center">
          <div className="flex justify-center space-x-2 mb-2">
            <span className="h-3 w-8 rounded-full bg-[#C8102E]" title="Galaxy Toyota"></span>
            <span className="h-3 w-8 rounded-full bg-[#003189]" title="Hans Hyundai"></span>
            <span className="h-3 w-8 rounded-full bg-[#1A6B3A]" title="AutoCarRepair.in"></span>
          </div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-gray-900">
            Digital & Tech Portal
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'login' && 'Centralized Team Performance Platform'}
            {mode === 'forgot' && 'Reset your temporary credentials'}
            {mode === 'reset' && 'First Login: Force Password Reset'}
          </p>
        </div>

        {error && (
          <div id="login_error" className="p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100 animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div id="login_success" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-start gap-2 border border-emerald-100">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{message}</p>
              {tempPassExposed && (
                <div className="mt-2 p-2 bg-emerald-100 border border-emerald-200 rounded text-xs font-mono select-all">
                  Temp Pass: <strong>{tempPassExposed}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'login' && (
          <form id="login_form" className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    id="empId_input"
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="Enter Employee ID"
                    className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    id="password_input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              id="login_submit_btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            </form>
        )}

        {mode === 'forgot' && (
          <form id="forgot_form" className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registered Email Address</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="forgot_email_input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@thesachdevgroup.com"
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                id="forgot_submit_btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition"
              >
                {loading ? 'Dispatched...' : 'Generate Temp Password'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-xs text-gray-600 hover:text-gray-900 underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form id="reset_form" className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-100 font-medium">
                ⚠️ Secure Password Policy: Please establish a new personal password before accessing your dashboard.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  id="new_password_input"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  id="confirm_password_input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                />
              </div>
            </div>

            <button
              id="reset_submit_btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition"
            >
              {loading ? 'Updating Credentials...' : 'Save & Enter Platform'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}


