/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  UserX, 
  UserCheck, 
  Search, 
  Filter, 
  MapPin, 
  UserCog, 
  Calendar, 
  Lock,
  Mail,
  Layers,
  Key
} from 'lucide-react';

interface TeamUsersProps {
  token: string;
}

export default function TeamUsers({ token }: TeamUsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');

  // Form states for adding user
  const [name, setName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('SEO Executive');
  const [brandFocus, setBrandFocus] = useState<'GT' | 'HH' | 'ACR' | 'All'>('All');
  const [doj, setDoj] = useState(new Date().toISOString().split('T')[0]);
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const [onboardedUser, setOnboardedUser] = useState<any>(null);
  const [onboardedPass, setOnboardedPass] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("Received non-JSON response from server:", text.substring(0, 100));
      return { error: 'Invalid response from server. Please wait or try again.' };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setOnboardedUser(null);

    if (!name || !empCode || !email || !designation || !doj) {
      setError('Missing mandatory user fields');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          emp_code: empCode,
          email,
          designation,
          brand_focus: brandFocus,
          doj,
          role
        })
      });

      const data = await safeParseJson(res);
      if (res.status !== 211 && !res.ok) throw new Error(data.error || 'Failed to onboard user');

      setSuccess(`Onboarded ${name} successfully!`);
      setOnboardedUser(data.user);
      setOnboardedPass(data.tempPassword);

      // Reset Form fields
      setName('');
      setEmpCode('');
      setEmail('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleUserStatus = async (userObj: any) => {
    setError('');
    const nextStatus = userObj.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/users/${userObj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSuccess(`User state modified to ${nextStatus}.`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.emp_code.toLowerCase().includes(search.toLowerCase()) ||
                          u.designation.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = brandFilter === 'All' || u.brand_focus === brandFilter;
    return matchesSearch && matchesBrand;
  });

  return (
    <div id="team_users_container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Feedbacks */}
      {error && <div className="lg:col-span-3 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{error}</div>}
      {success && <div className="lg:col-span-3 p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-100">{success}</div>}

      {/* Column Left/Center: Team Ledger */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold font-display text-gray-900">Digital Marketing Team Registry</h2>
              <p className="text-xs text-gray-500">Monitor active user profiles and designations</p>
            </div>
            
            {/* Ledger Filters */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name/designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-600"
              >
                <option value="All">All Brands</option>
                <option value="GT">Galaxy Toyota</option>
                <option value="HH">Hans Hyundai</option>
                <option value="ACR">AutoCarRepair</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Member Code</th>
                  <th className="py-3 px-6">Profile details</th>
                  <th className="py-3 px-6">Role Focus</th>
                  <th className="py-3 px-6">System Status</th>
                  <th className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredUsers.map(u => {
                  const brandColor = u.brand_focus === 'GT' ? 'bg-[#C8102E]' : u.brand_focus === 'HH' ? 'bg-[#003189]' : u.brand_focus === 'ACR' ? 'bg-[#1A6B3A]' : 'bg-gray-800';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-600">{u.emp_code}</td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{u.designation}</div>
                        <div className="text-[10px] text-gray-400">{u.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded ${brandColor}`}>
                          {u.brand_focus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`p-1.5 rounded-lg border text-[11px] font-semibold transition ${
                              u.status === 'active'
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={u.status === 'active' ? 'Disable profile' : 'Activate profile'}
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Column Right: User Onboarding panel */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Onboarding Form */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold font-display text-gray-900 mb-1">Onboard Team Member</h3>
          <p className="text-xs text-gray-500 mb-6">Create credentials and define KPI mappings</p>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alka Rawat"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee Code</label>
              <input
                type="text"
                required
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                placeholder="EMP021"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alka@thesachdevgroup.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Brand Focus</label>
                <select
                  value={brandFocus}
                  onChange={(e: any) => setBrandFocus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-600"
                >
                  <option value="GT">Galaxy Toyota (GT)</option>
                  <option value="HH">Hans Hyundai (HH)</option>
                  <option value="ACR">AutoCarRepair (ACR)</option>
                  <option value="All">Centralized (All)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Platform Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-600"
                >
                  <option value="member">Member Executive</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-600"
              >
                <option value="Head of Digital & Technology">Head of Digital & Technology</option>
<option value="Sr. Digital Marketing Manager">Sr. Digital Marketing Manager</option>
<option value="PPC Manager">PPC Manager</option>
<option value="Digital Marketing Manager">Digital Marketing Manager</option>
<option value="SEO Manager">SEO Manager</option>
<option value="SEO TL">SEO TL</option>
<option value="Content Marketing Manager">Content Marketing Manager</option>
<option value="AI Video Maker / Editor">AI Video Maker / Editor</option>
<option value="Web Dev - ACR/Portals">Web Dev - ACR/Portals</option>
<option value="Web Dev - GT/HH">Web Dev - GT/HH</option>
<option value="Sr. Graphic Designer">Sr. Graphic Designer</option>
<option value="PPC Executive">PPC Executive</option>
<option value="Social Media Manager">Social Media Manager</option>
<option value="Video Presenter">Video Presenter</option>
<option value="CRM Tech Manager">CRM Tech Manager</option>
<option value="CRM Ops / IVR">CRM Ops / IVR</option>
<option value="Technology Manager">Technology Manager</option>
<option value="Automation & AI Engineer">Automation & AI Engineer</option>
<option value="AI Engineer Intern">AI Engineer Intern</option>
<option value="Digital Operation Executive">Digital Operation Executive</option>
<option value="Intern">Intern</option>
<option value="AI prompt Engineer">AI prompt Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date of Joining</label>
              <input
                type="date"
                required
                value={doj}
                onChange={(e) => setDoj(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow flex items-center justify-center gap-1 transition"
            >
              <UserPlus className="h-4 w-4" /> Create Account
            </button>
          </form>
        </div>

        {/* Temporary password notification panel */}
        {onboardedUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2 text-emerald-800">
              <UserCheck className="h-5 w-5" />
              <h4 className="font-bold text-sm">Account Ready for First Login</h4>
            </div>
            <div className="text-xs text-gray-700 space-y-1 bg-white p-3 rounded-xl border border-emerald-100 font-mono">
              <p>Username: <strong>{onboardedUser.email}</strong></p>
              <p className="text-indigo-600">Temp Pass: <strong>{onboardedPass}</strong></p>
            </div>
            <p className="text-[11px] text-gray-500 italic">User is forced to reset this password on their first login.</p>
          </motion.div>
        )}

      </div>

    </div>
  );
}
