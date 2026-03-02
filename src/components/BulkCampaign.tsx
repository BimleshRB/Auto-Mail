"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Bot, PlayCircle, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Lead {
  _id?: string;
  hrName: string;
  hrEmail: string;
  companyName: string;
  targetRole: string;
  status: 'pending' | 'applied' | 'failed';
  generatedTemplate?: string;
}

export function BulkCampaign({ profile, showNotification }: { profile: any, showNotification: (msg: string, type: 'success'|'error') => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [globalRole, setGlobalRole] = useState(profile?.jobPreferences?.roles?.[0] || 'Software Engineer');
  
  // Single Lead Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({ hrName: '', hrEmail: '', companyName: '', targetRole: '' });
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setSelectedIds(new Set()); // Reset selection on fetch
      }
    } catch (err) {
      console.error("Failed to fetch leads");
    }
    setLoading(false);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l._id as string)));
    }
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
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} leads?`)) return;

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

  const handleAddSingleLead = async () => {
    if (!newLead.hrName || !newLead.hrEmail || !newLead.companyName) {
      showNotification("Name, Email, and Company are required.", "error");
      return;
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: [newLead] })
      });
      
      if (res.ok) {
        showNotification("Lead added successfully.", "success");
        setNewLead({ hrName: '', hrEmail: '', companyName: '', targetRole: '' });
        setShowAddForm(false);
        fetchLeads();
      } else {
        showNotification("Failed to add lead.", "error");
      }
    } catch (err) {
      showNotification("Error adding lead.", "error");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        // Map CSV headers to Lead schema 
        // User specific headers: SNo, Name, Email, Title, Company
        // The file has a leading comma making the first header empty, so row[""] exists.
        const parsedLeads = results.data.map((row: any) => ({
          hrName: (row.Name || row.hrName || row.name || "").trim(),
          hrEmail: (row.Email || row.hrEmail || row.email || "").trim(),
          companyName: (row.Company || row.companyName || row.company || "").trim(),
          targetRole: (row.Title || row.Role || row.targetRole || row.role || "").trim()
        })).filter(l => l.hrName && l.hrEmail && l.companyName);

        if (parsedLeads.length === 0) {
          console.error("Parsed Results Raw:", results.data[0]);
          showNotification("No valid leads found in CSV. Make sure you have Name, Email, and Company columns.", "error");
          return;
        }

        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: parsedLeads })
          });
          
          if (res.ok) {
            showNotification(`Successfully imported ${parsedLeads.length} leads.`, "success");
            fetchLeads(); // Refresh list
          } else {
            showNotification("Failed to save imported leads.", "error");
          }
        } catch (err) {
          showNotification("Error uploading leads to server.", "error");
        }
      },
      error: (err) => {
        showNotification("Failed to parse CSV file.", "error");
      }
    });
  };

  const autoApplySelected = async () => {
    const selectedPending = leads.filter(l => selectedIds.has(l._id as string) && l.status === 'pending');
    
    if (selectedPending.length === 0) {
      showNotification("No pending leads selected.", "error");
      return;
    }

    if (!profile.apiKeys.geminiAsString) {
      showNotification("Please configure your Gemini API Key in the System Config first.", "error");
      return;
    }

    setExecuting(true);
    let successCount = 0;
    
    for (const lead of selectedPending) {
      try {
        // 1. Generate Template
        const genRes = await fetch('/api/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hrName: lead.hrName,
            companyName: lead.companyName,
            hrEmail: lead.hrEmail,
            targetRole: globalRole
          })
        });

        const genData = await genRes.json();
        
        if (!genRes.ok || !genData.template) {
           throw new Error(genData.error || "Generation failed");
        }

        const template = genData.template;
        const subject = `Application for ${globalRole} role at ${lead.companyName}`;

        // 2. Send Email
        const sendRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hrEmail: lead.hrEmail,
            emailBody: template,
            subject: subject
          })
        });

        if (!sendRes.ok) {
          throw new Error("Dispatch failed");
        }

        // 3. Update Database to 'applied' and store template
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

        successCount++;
        // Refresh local state to show progress
        setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'applied', generatedTemplate: template } : l));

        // Wait a few seconds to respect standard APIs
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err: any) {
        console.error(`Failed executing lead ${lead.hrEmail}:`, err);
        // Mark as failed
        await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lead._id, status: 'failed' })
        });
        setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: 'failed' } : l));
      }
    }

    setExecuting(false);
    setSelectedIds(new Set()); // Clear selection after processing
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
                <Bot className="w-5 h-5 text-zinc-300" />
              </div>
              Bulk Neural Campaign
            </CardTitle>
            <CardDescription className="text-zinc-500 text-sm font-medium">Upload a CSV of leads to iteratively synthesize and dispatch emails via native integration.</CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto mt-2 xl:mt-0">
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={executing}
              className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 font-bold text-white tracking-wide transition-all gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </Button>

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
                  className="h-10 w-40 sm:w-48 bg-zinc-900/80 border-white/10 text-white placeholder-zinc-500 font-medium"
                  placeholder="e.g. Software Engineer"
                />
              </div>
            )}

            <Button 
              onClick={autoApplySelected}
              disabled={executing || leads.filter(l => selectedIds.has(l._id as string) && l.status === 'pending').length === 0}
              className="h-10 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_25px_rgba(8,145,178,0.4)] border border-cyan-400/20 font-bold text-white tracking-wide transition-all gap-2 shrink-0"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {executing ? "Applying..." : "Apply Selected"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 lg:px-8 pb-8">
        
        {/* Single Lead Manual Form */}
        {showAddForm && (
          <div className="mb-8 p-6 rounded-2xl bg-zinc-950/50 border border-indigo-500/20 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-white mb-4">Add Single Lead Manually</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-zinc-400">Name</Label>
                <Input value={newLead.hrName} onChange={e => setNewLead({...newLead, hrName: e.target.value})} className="bg-zinc-900 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Email</Label>
                <Input type="email" value={newLead.hrEmail} onChange={e => setNewLead({...newLead, hrEmail: e.target.value})} className="bg-zinc-900 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Company</Label>
                <Input value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName: e.target.value})} className="bg-zinc-900 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Role</Label>
                <Input value={newLead.targetRole} onChange={e => setNewLead({...newLead, targetRole: e.target.value})} placeholder="Software Engineer" className="bg-zinc-900 border-white/10 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" className="text-zinc-400" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleAddSingleLead}>Save Lead</Button>
            </div>
          </div>
        )}

        {/* CSV Upload Area */}
        <div className="border border-dashed border-white/20 rounded-2xl p-8 text-center bg-zinc-950/30 mb-8 relative hover:bg-zinc-950/50 transition-colors">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            disabled={executing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          />
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <UploadCloud className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="font-semibold text-white">Upload Candidates CSV</div>
            <div className="text-zinc-500 text-sm max-w-sm">Requires headers: <span className="text-zinc-300">Name</span>, <span className="text-zinc-300">Email</span>, <span className="text-zinc-300">Company</span>. Optional: <span className="text-zinc-300">Title</span> or <span className="text-zinc-300">Role</span>.</div>
          </div>
        </div>

        {/* Lead Data Table */}
        <div className="space-y-4">
          <div className="flex items-center text-sm font-bold tracking-wider text-zinc-400 uppercase pb-2 border-b border-white/10 px-2 mt-4 ml-2 mr-2">
            <div className="w-[10%] flex items-center pr-2">
              <input 
                type="checkbox" 
                checked={leads.length > 0 && selectedIds.size === leads.length}
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
          ) : leads.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">No leads in your campaign pipeline yet. Upload a CSV to begin.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar px-1">
              {leads.map((lead, i) => (
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
    </Card>
  );
}
