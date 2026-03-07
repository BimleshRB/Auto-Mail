"use client";

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp, Database, AlertCircle, Loader2, PlayCircle, Trash2, Bot, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export function LeadDatabase({ profile, showNotification }: { profile: any, showNotification: Function }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [globalRole, setGlobalRole] = useState(profile?.jobPreferences?.roles?.[0] || 'Software Engineer');
  const [dispatchLimit, setDispatchLimit] = useState<number | ''>(20);
  
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<string>('Default Campaign');
  
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'applied' | 'failed'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Custom Confirmation Modal
  const [confirmDetails, setConfirmDetails] = useState<{ isOpen: boolean, action: 'delete' | 'clean' | null }>({ isOpen: false, action: null });

  const filteredLeads = leads.filter(l => statusFilter === 'all' || l.status === statusFilter);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [activeCampaign]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/leads/campaigns');
      if (res.ok) {
        const data = await res.json();
        const apiCampaigns = data.campaigns || [];
        const uniqueCampaigns = Array.from(new Set([...apiCampaigns, 'Default Campaign'])).sort();
        setCampaigns(uniqueCampaigns as string[]);
        
        if (!uniqueCampaigns.includes(activeCampaign)) {
          setActiveCampaign('Default Campaign');
        }
      }
    } catch (err) {
      console.error("Failed to fetch campaigns");
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const queryParams = activeCampaign ? `?campaignName=${encodeURIComponent(activeCampaign)}` : '';
      const res = await fetch(`/api/leads${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setSelectedIds(new Set()); 
      }
    } catch (err) {
      console.error("Failed to fetch leads");
    }
    setLoading(false);
  };

  const handleSelectAll = () => {
    const filteredIds = filteredLeads.map(l => l._id as string);
    if (filteredIds.length === 0) return;
    
    const allSessionSelected = filteredIds.every(id => selectedIds.has(id));
    const newSelected = new Set(selectedIds);
    
    if (allSessionSelected) {
      filteredIds.forEach(id => newSelected.delete(id));
    } else {
      filteredIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setConfirmDetails({ isOpen: true, action: 'delete' });
  };

  const executeDelete = async () => {
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        showNotification(`Deleted ${selectedIds.size} leads.`, "success");
        fetchLeads();
      } else {
        showNotification("Failed to delete leads.", "error");
      }
    } catch (error) {
      showNotification("Error deleting leads.", "error");
    }
  };

  const handleCleanSelected = async () => {
    if (selectedIds.size === 0) return;
    setConfirmDetails({ isOpen: true, action: 'clean' });
  };

  const executeClean = async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/leads/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Clean complete. Validated ${data.processedCount} domains. Deleted ${data.deletedCount} invalid leads.`, 'success');
        fetchLeads();
      } else {
        showNotification(`Failed to clean leads: ${data.error}`, 'error');
      }
    } catch (err) {
      showNotification("Error during clean operation.", "error");
    }
    setExecuting(false);
    setSelectedIds(new Set());
  };

  const autoVerifySelected = async () => {
    let unverifiedLeads = leads.filter(l => selectedIds.has(l._id as string) && l.status === 'pending');
    
    if (unverifiedLeads.length === 0) {
      showNotification("No pending leads selected to verify.", "error");
      return;
    }

    setExecuting(true);
    let verifyCount = 0;
    let failCount = 0;

    for (const lead of unverifiedLeads) {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: lead.hrEmail })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          await fetch('/api/leads', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: lead._id, 
              verificationStatus: data.status 
            })
          });

          setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, verificationStatus: data.status } : l));
          verifyCount++;
        } else {
           if (data.error && data.error.includes("429")) {
              showNotification("Verification API Quota hit. Pausing background verification.", "error");
              break;
           }
           failCount++;
        }
        
        // Pacing to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error("Verification Sync Error", err);
      }
    }

    setExecuting(false);
    showNotification(`Verification Complete: ${verifyCount} completed, ${failCount} failed.`, verifyCount > 0 ? "success" : "error");
  };

  const autoApplySelected = async () => {
    let selectedPending = leads.filter(l => selectedIds.has(l._id as string) && (l.status === 'pending' || l.status === 'failed'));
    
    if (selectedPending.length === 0) {
      showNotification("No pending or failed leads selected to apply.", "error");
      return;
    }

    if (dispatchLimit !== '' && selectedPending.length > dispatchLimit) {
      selectedPending = selectedPending.slice(0, dispatchLimit);
      showNotification(`Limiting execution to ${dispatchLimit} leads.`, "success");
    }

    setExecuting(true);
    let successCount = 0;

    for (const lead of selectedPending) {
      let promptSuccess = false;
      let template = '';
      let subject = '';
      let retries = 0;
      
      while (!promptSuccess && retries < 5) {
        try {
          const promptRes = await fetch('/api/generate-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hrName: lead.hrName,
              companyName: lead.companyName,
              targetRole: globalRole || lead.targetRole
            })
          });

          const promptData = await promptRes.json();
          
          if (!promptRes.ok) {
             const errorMsg = promptData.error || "";
             console.error("AI Generation Error: " + errorMsg);
             
             // Check if it's a known Rate Limit / Quota error
             if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
                showNotification(`API limits reached. Auto-pausing background runner for 40 seconds... (Attempt ${retries + 1}/5)`, "warning");
                await new Promise(resolve => setTimeout(resolve, 40000)); // sleep 40s to wait out the Gemini RPM window
                retries++;
                continue; // retry generation
             }
             
             // Permanent Error
             await fetch('/api/leads', {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id: lead._id, status: 'failed' })
             });
             setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'failed' } : l));
             break; // break retry loop, move to next lead
          }

          template = promptData.template;
          subject = `Application for ${globalRole || lead.targetRole}`;
          promptSuccess = true;
          
        } catch (err) {
          console.error("Network Error during Generation:", err);
          break; // break retry loop, move to next lead
        }
      }

      if (!promptSuccess) {
         continue; // Only proceed to Send if generation completely succeeded
      }

      try {
        const sendRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             hrEmail: lead.hrEmail,
             subject: subject,
             emailBody: template,
          })
        });

        const sendData = await sendRes.json();
        
        if (sendRes.ok) {
          await fetch('/api/leads', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: lead._id, 
              status: 'applied',
              generatedTemplate: template,
              subject: subject
            })
          });

          setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'applied', generatedTemplate: template, subject: subject } : l));
          successCount++;
        } else {
           console.error("Nodemailer Dispatch Error: " + sendData.error);
           await fetch('/api/leads', {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ id: lead._id, status: 'failed' })
           });
           setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'failed' } : l));
        }

        // Add a 2-second sleep to pace the API organically
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        console.error("Fatal Loop Error:", err);
        await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lead._id, status: 'failed' })
        });
        setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'failed' } : l));
      }
    }

    setExecuting(false);
    setSelectedIds(new Set()); 
    showNotification(`Campaign Finished! Applied to ${successCount} out of ${selectedPending.length} selected leads.`, "success");
  };

  const cardClasses = "border-white/5 shadow-2xl backdrop-blur-2xl bg-zinc-900/60 rounded-3xl overflow-hidden ring-1 ring-white/10 relative";

  return (
    <Card className={cardClasses}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30" />
      <CardHeader className="pb-6 pt-8 px-6 lg:px-8">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-white mb-2">
              <div className="p-2 rounded-lg bg-zinc-800/80 ring-1 ring-white/10 shadow-inner">
                <Database className="w-5 h-5 text-zinc-300" />
              </div>
              Lead Database
              
              <div className="ml-4 flex items-center gap-2 text-sm font-medium relative">
                <span className="text-zinc-500">List:</span>
                
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center justify-between gap-2 min-w-[160px] bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span className="truncate max-w-[140px] font-semibold tracking-wide">{activeCampaign}</span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute top-11 right-0 w-[240px] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ring-1 ring-white/5">
                        <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
                          {campaigns.map(c => (
                            <div 
                              key={c}
                              onClick={() => {
                                setActiveCampaign(c);
                                setDropdownOpen(false);
                              }}
                              className={`px-3 py-2.5 mx-1 my-0.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors ${activeCampaign === c ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                            >
                              <span className="truncate">{c}</span>
                              {activeCampaign === c && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-zinc-500 text-sm font-medium">Manage leads across your campaigns and execute AI email dispatches.</CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center justify-start gap-4 w-full mt-4 xl:mt-0">
            {selectedIds.size > 0 && (
              <>
                <Button 
                variant="outline" 
                onClick={handleCleanSelected}
                disabled={executing || selectedIds.size === 0}
                className="h-10 px-4 rounded-xl border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-bold tracking-wide transition-all gap-2 shrink-0"
              >
                <ShieldAlert className="w-4 h-4" />
                Clean Mails
              </Button>
              
              <Button 
                variant="outline" 
                onClick={autoVerifySelected}
                disabled={executing || leads.filter(l => selectedIds.has(l._id as string) && l.status === 'pending').length === 0}
                className="h-10 px-4 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold tracking-wide transition-all gap-2 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Selected
              </Button>
              </>
            )}

            {selectedIds.size > 0 && (
              <Button 
                onClick={handleDeleteSelected}
                disabled={executing}
                className="h-10 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold tracking-wide transition-all gap-2 shrink-0"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
              </Button>
            )}

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 xl:border-l border-white/10 xl:pl-3 shrink-0">
                <Label className="text-xs text-zinc-400 whitespace-nowrap">Applying For:</Label>
                <Input 
                  value={globalRole} 
                  onChange={e => setGlobalRole(e.target.value)}
                  className="h-10 w-[140px] sm:w-40 bg-zinc-900/80 border-white/10 text-white placeholder-zinc-500 font-medium"
                  placeholder="e.g. Software Engineer"
                />
              </div>
            )}

            {selectedIds.size > 0 && (
               <div className="flex items-center gap-2 shrink-0">
                 <Label className="text-xs text-zinc-400 whitespace-nowrap">Limit:</Label>
                 <Input 
                   type="number"
                   min="1"
                   value={dispatchLimit} 
                   onChange={e => setDispatchLimit(e.target.value === '' ? '' : Number(e.target.value))}
                   className="h-10 w-20 bg-zinc-900/80 border-white/10 text-white font-medium text-center"
                   placeholder="Max"
                 />
               </div>
            )}

            <Button 
              onClick={autoApplySelected}
              disabled={executing || leads.filter(l => selectedIds.has(l._id as string) && (l.status === 'pending' || l.status === 'failed')).length === 0}
              className="h-10 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_25px_rgba(8,145,178,0.4)] border border-cyan-400/20 font-bold text-white tracking-wide transition-all gap-2 shrink-0"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {executing ? "Applying..." : "Apply Selected"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 lg:px-8 pb-8">
        
        {/* Lead Data Table Controls */}
        <div className="flex items-center justify-between mb-4 px-2 mt-4">
          <div className="flex space-x-2 bg-zinc-950/50 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
            {(['all', 'pending', 'applied', 'failed'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === filter ? 'bg-indigo-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="text-xs text-zinc-500 font-medium tracking-wide">
            {selectedIds.size > 0 && <span className="text-indigo-400 font-bold mr-2">{selectedIds.size} selected</span>}
            Showing {filteredLeads.length} of {leads.length} leads in "{activeCampaign}"
          </div>
        </div>

        {/* Lead Data Table */}
        <div className="space-y-4">
          <div className="flex items-center text-sm font-bold tracking-wider text-zinc-400 uppercase pb-2 border-b border-white/10 px-2 mt-4 ml-2 mr-2">
            <div className="w-[10%] flex items-center pr-2">
              <input 
                type="checkbox" 
                checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l._id as string))}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-white/10 bg-zinc-900 cursor-pointer"
              />
            </div>
            <div className="w-[30%]">Target Details</div>
            <div className="w-[30%]">Company & Role</div>
            <div className="w-[30%] text-right pr-6">Pipeline Status</div>
          </div>
          
          {loading ? (
             <div className="py-10 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin" /> Loading Leads...
             </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">No leads match the current view. Upload a CSV or change the filter.</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-3 custom-scrollbar px-1">
              {filteredLeads.map((lead, i) => (
                <div key={i} className="flex flex-col rounded-xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
                  <div className="flex items-center p-4 cursor-pointer" onClick={() => lead.status === 'applied' && setExpandedLeadId(expandedLeadId === lead._id ? null : (lead._id as string))}>
                    <div className="w-[10%] flex items-center pr-2" onClick={e => e.stopPropagation()}>
                       <input 
                          type="checkbox" 
                          checked={selectedIds.has(lead._id as string)}
                          onChange={() => toggleSelect(lead._id as string)}
                          className="w-4 h-4 rounded border-white/10 bg-zinc-900 cursor-pointer"
                        />
                    </div>
                    <div className="flex flex-col w-[30%]">
                      <span className="font-semibold text-white truncate pr-4">{lead.hrName}</span>
                      <span className="text-xs text-zinc-500 truncate pr-4">{lead.hrEmail}</span>
                    </div>
                    <div className="flex flex-col w-[30%]">
                      <span className="text-sm font-medium text-emerald-100 truncate pr-4">{lead.companyName}</span>
                      <span className="text-xs text-zinc-500 truncate pr-4">{lead.targetRole || 'Software Engineer'}</span>
                    </div>
                    <div className="w-[30%] flex justify-end items-center gap-3 pr-2">
                    
                      {/* Verification Status Badge */}
                      {lead.verificationStatus === 'valid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      )}
                      {lead.verificationStatus === 'bounced' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" /> Bounced
                        </span>
                      )}
                      {lead.verificationStatus === 'catch-all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                          <ShieldAlert className="w-3 h-3" /> Catch-All
                        </span>
                      )}
                      {lead.status === 'applied' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold ring-1 ring-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                        </span>
                      ) : lead.status === 'failed' ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold ring-1 ring-rose-500/20">
                           <AlertCircle className="w-3.5 h-3.5" /> Failed
                         </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 text-zinc-300 text-xs font-bold ring-1 ring-zinc-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" /> Pending
                        </span>
                      )}
                      
                      {lead.status === 'applied' && (
                        expandedLeadId === lead._id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Template View */}
                  {expandedLeadId === lead._id && lead.generatedTemplate && (
                    <div className="p-4 bg-black/40 border-t border-white/5 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono">
                      <div className="text-xs text-indigo-400 mb-2 font-bold uppercase tracking-widest border-b border-white/10 pb-2">Finalized Template Dispatched</div>
                      {lead.generatedTemplate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Custom Confirmation Modal */}
      {confirmDetails.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmDetails.action === 'delete' ? 'Delete Leads' : 'Clean & Validate Leads'}
            </h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              {confirmDetails.action === 'delete' 
                ? `Are you sure you want to permanently delete ${selectedIds.size} selected leads? This action cannot be undone.`
                : `This will verify the domains for ${selectedIds.size} selected leads and permanently delete any invalid ones. Proceed?`}
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                className="text-zinc-400 hover:text-white" 
                onClick={() => setConfirmDetails({ isOpen: false, action: null })}
              >
                Cancel
              </Button>
              <Button 
                className={`text-white px-6 font-bold tracking-wide ${
                  confirmDetails.action === 'delete' 
                    ? 'bg-rose-600 hover:bg-rose-500' 
                    : 'bg-orange-600 hover:bg-orange-500'
                }`} 
                onClick={() => {
                  if (confirmDetails.action === 'delete') {
                    executeDelete();
                  } else if (confirmDetails.action === 'clean') {
                    executeClean();
                  }
                  setConfirmDetails({ isOpen: false, action: null });
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
