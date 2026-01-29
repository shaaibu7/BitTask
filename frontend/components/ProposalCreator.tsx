'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/Button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Settings, Info, AlertTriangle, CheckSquare, Send, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalCreator() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discussionLink: '',
        category: 'Protocol'
    });

    const handleNext = () => {
        if (step === 1 && !formData.title) {
            toast.error('Proposal requires a title');
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = () => {
        toast.success('Governance proposal submitted to the blockchain!');
        // Actual contract-call logic would go here
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => step > 1 && setStep(step - 1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Create New Proposal</h1>
                    <p className="text-muted-foreground">Draft your vision for the BitTask ecosystem.</p>
                </div>
            </div>

            <div className="flex gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500' : 'bg-white/10'}`} />
                ))}
            </div>

            {step === 1 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Info className="w-5 h-5 text-indigo-400" /> Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Proposal Title</label>
                            <Input
                                placeholder="e.g., Expansion of BTK Utility"
                                className="bg-black/50 border-white/10 h-12 text-lg focus:ring-indigo-500"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Category</label>
                            <select className="w-full h-12 bg-black/50 border-white/10 rounded-md px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option>Protocol Improvement</option>
                                <option>Treasury Allocation</option>
                                <option>Community Grant</option>
                                <option>Brand & Marketing</option>
                            </select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Continue to Details <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 2 && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-400" /> Proposal Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Full Description</label>
                            <Textarea
                                placeholder="Describe your proposal in detail..."
                                className="min-h-[200px] bg-black/50 border-white/10 focus:ring-indigo-500"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-indigo-300">External Discussion (Optional)</label>
                            <Input
                                placeholder="https://forum.bittask.org/..."
                                className="bg-black/50 border-white/10"
                                value={formData.discussionLink}
                                onChange={(e) => setFormData({ ...formData, discussionLink: e.target.value })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Preview Proposal <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
                <Card className="bg-gradient-to-br from-indigo-950/30 to-background border-indigo-500/20 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2 font-mono">
                            <CheckSquare className="w-5 h-5 text-emerald-400" /> REVIEW SUBMISSION
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-4">
                            <div>
                                <span className="text-xs font-bold text-indigo-400 uppercase">Title</span>
                                <p className="text-xl font-bold">{formData.title}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-indigo-400 uppercase">Description Preview</span>
                                <p className="text-muted-foreground italic text-sm line-clamp-3">"{formData.description}"</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-200/80">
                                Once submitted, proposals cannot be edited. A minimum of 100,000 BTK must be held to broadcast this transaction. Gas fees apply.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg">
                            <Send className="w-5 h-5 mr-2" /> Broadcast Proposal
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
