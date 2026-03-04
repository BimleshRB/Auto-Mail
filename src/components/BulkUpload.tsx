"use client";

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Bot, ChevronDown, CheckCircle2 } from "lucide-react";

export function BulkUpload({ showNotification }: { showNotification: Function }) {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<string>('Default Campaign');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({ hrName: '', hrEmail: '', companyName: '', targetRole: '' });
  
  // Custom Modal State
  const [promptDetails, setPromptDetails] = useState<{ isOpen: boolean, actionType: 'upload' | 'single', payload?: any }>({ isOpen: false, actionType: 'single' });
  const [customCampaignName, setCustomCampaignName] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/leads/campaigns');
      if (res.ok) {
        const data = await res.json();
        const apiCampaigns = data.campaigns || [];
        const uniqueCampaigns = Array.from(new Set([...apiCampaigns, 'Default Campaign'])).sort();
        setCampaigns(uniqueCampaigns as string[]);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns");
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (activeCampaign === '--new--') {
        setPromptDetails({ isOpen: true, actionType: 'upload', payload: file });
        return;
      }
      executeUpload(file, activeCampaign);
    };
    input.click();
  };

  const uploadToBackend = async (parsedLeads: any[], targetCampaign: string) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: parsedLeads,
          campaignName: targetCampaign
        })
      });
      
      if (res.ok) {
        showNotification(`Successfully imported ${parsedLeads.length} leads into "${targetCampaign}".`, "success");
        fetchCampaigns(); // refresh available campaigns in case new one was added
      } else {
        showNotification("Failed to save imported leads.", "error");
      }
    } catch (err) {
      showNotification("Error uploading leads to server.", "error");
    }
  };

  const executeUpload = async (file: File, targetCampaign: string) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          const parsedLeads = results.data.map((row: any) => ({
            hrName: (row.Name || row.hrName || row.name || "").toString().trim(),
            hrEmail: (row.Email || row.hrEmail || row.email || "").toString().trim(),
            companyName: (row.Company || row.companyName || row.company || "").toString().trim(),
            targetRole: (row.Title || row.Role || row.targetRole || row.role || "").toString().trim()
          })).filter(l => l.hrName && l.hrEmail && l.companyName);

          if (parsedLeads.length === 0) {
            showNotification("No valid leads found in CSV. Make sure you have Name, Email, and Company columns.", "error");
            return;
          }

          await uploadToBackend(parsedLeads, targetCampaign);
        },
        error: (err) => {
          showNotification("Failed to parse CSV file.", "error");
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
        
        const parsedLeads = json.map((row: any) => ({
          hrName: (row.Name || row.hrName || row.name || "").toString().trim(),
          hrEmail: (row.Email || row.hrEmail || row.email || "").toString().trim(),
          companyName: (row.Company || row.companyName || row.company || "").toString().trim(),
          targetRole: (row.Title || row.Role || row.targetRole || row.role || "").toString().trim()
        })).filter(l => l.hrName && l.hrEmail && l.companyName);

        if (parsedLeads.length === 0) {
          showNotification("No valid leads found in Excel file. Make sure you have Name, Email, and Company columns.", "error");
          return;
        }

        await uploadToBackend(parsedLeads, targetCampaign);
      } catch (err) {
        showNotification("Failed to parse Excel file.", "error");
      }
    } else {
      showNotification("Unsupported file format. Please upload .csv or .xlsx", "error");
    }
  };

  const handleAddSingleLead = async () => {
    if (!newLead.hrName || !newLead.hrEmail || !newLead.companyName) {
      showNotification("Name, Email, and Company are required.", "error");
      return;
    }

    if (activeCampaign === '--new--') {
      setPromptDetails({ isOpen: true, actionType: 'single', payload: newLead });
      return;
    }
    
    executeSingleLead(newLead, activeCampaign);
  };

  const executeSingleLead = async (leadData: any, targetCampaign: string) => {
    try {
      const payload = { ...leadData, campaignName: targetCampaign };
      
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: [payload],
          campaignName: payload.campaignName
        })
      });
      
      if (res.ok) {
        showNotification("Lead added successfully.", "success");
        setNewLead({ hrName: '', hrEmail: '', companyName: '', targetRole: '' });
        setShowAddForm(false);
        fetchCampaigns(); 
      } else {
        showNotification("Failed to add lead.", "error");
      }
    } catch (err) {
      showNotification("Error adding lead.", "error");
    }
  };

  const handlePromptSubmit = () => {
    if (!customCampaignName.trim()) {
       showNotification("A valid campaign name is required.", "error");
       return;
    }
    
    if (promptDetails.actionType === 'upload') {
       executeUpload(promptDetails.payload, customCampaignName.trim());
    } else {
       executeSingleLead(promptDetails.payload, customCampaignName.trim());
    }
    
    setPromptDetails({ isOpen: false, actionType: 'single' });
    setActiveCampaign(customCampaignName.trim());
    setCustomCampaignName('');
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
              Bulk Neural Campaign Upload
              
              <div className="ml-4 flex items-center gap-2 text-sm font-medium relative">
                <span className="text-zinc-500">List:</span>
                
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center justify-between gap-2 min-w-[170px] bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span className="truncate max-w-[140px] font-semibold tracking-wide">
                      {activeCampaign === '--new--' ? '+ Create New Campaign' : activeCampaign}
                    </span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute top-11 right-0 w-[240px] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ring-1 ring-white/5">
                        <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
                          <div 
                            onClick={() => {
                              setActiveCampaign('Default Campaign');
                              setDropdownOpen(false);
                            }}
                            className={`px-3 py-2.5 mx-1 my-0.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors ${activeCampaign === 'Default Campaign' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                          >
                            <span className="truncate">Default Campaign</span>
                            {activeCampaign === 'Default Campaign' && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                          </div>

                          {campaigns.filter(c => c !== 'Default Campaign').map(c => (
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

                          <div className="border-t border-white/10 my-1 mx-2" />
                          <div 
                            onClick={() => {
                              setActiveCampaign('--new--');
                              setDropdownOpen(false);
                            }}
                            className="px-3 py-2.5 mx-1 my-0.5 rounded-lg text-sm cursor-pointer flex items-center text-indigo-400 hover:bg-indigo-500/10 font-bold transition-colors"
                          >
                            + Create New Campaign
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-zinc-500 text-sm font-medium">Upload a CSV or Excel dataset, or manually inject targets to initiate candidate synthesis.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto mt-2 xl:mt-0">
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 font-bold text-white tracking-wide transition-all gap-2 shrink-0"
            >
              Add Single Lead
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
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleAddSingleLead}>Save Target to Database</Button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="border border-dashed border-white/20 rounded-2xl p-12 text-center bg-zinc-950/30 mb-4 relative hover:bg-zinc-950/50 transition-colors mx-auto max-w-2xl cursor-pointer" onClick={handleFileUpload}>
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <div className="p-4 bg-indigo-500/10 rounded-2xl">
              <UploadCloud className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="font-bold text-white text-lg tracking-wide">Select Dataset (.csv, .xlsx)</div>
            <div className="text-zinc-500 text-sm max-w-sm">Requires headers: <span className="text-zinc-300 font-medium">Name</span>, <span className="text-zinc-300 font-medium">Email</span>, <span className="text-zinc-300 font-medium">Company</span>. Optional: <span className="text-zinc-300 font-medium">Title</span> or <span className="text-zinc-300 font-medium">Role</span>.</div>
          </div>
        </div>
      </CardContent>

      {/* Custom Prompt Modal */}
      {promptDetails.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-white mb-2">Create New Campaign</h3>
              <p className="text-sm text-zinc-400 mb-4">Enter a fresh name for this specific dataset.</p>
              <Input 
                autoFocus
                value={customCampaignName} 
                onChange={e => setCustomCampaignName(e.target.value)} 
                placeholder="e.g. Q4 Outreach Batch"
                className="w-full bg-zinc-950/50 border-white/10 text-white mb-5 h-12 text-base"
                onKeyDown={e => {
                  if (e.key === 'Enter') handlePromptSubmit();
                }}
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => {
                   setPromptDetails({ isOpen: false, actionType: 'single' });
                   setActiveCampaign('Default Campaign');
                   setCustomCampaignName('');
                }}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 font-bold tracking-wide" onClick={handlePromptSubmit}>Confirm</Button>
              </div>
           </div>
        </div>
      )}
    </Card>
  );
}
