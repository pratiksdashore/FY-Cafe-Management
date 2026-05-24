import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Info } from 'lucide-react';
import { CustomizationOption, CartItem } from '@/types/food';
import { menuCustomizationService } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Props {
    item: CartItem;
    onClose: () => void;
    onSave: (selectedOptions: CustomizationOption[]) => Promise<void>;
}

export const CustomizationModal = ({ item, onClose, onSave }: Props) => {
    const [options, setOptions] = useState<CustomizationOption[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>(item.selectedCustomizations || []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadCustomizations = async () => {
            try {
                setLoading(true);
                const data = await menuCustomizationService.getCustomizations(item.id);
                setOptions(data);
            } catch (error) {
                console.error('Error loading customizations:', error);
                toast({
                    title: "Error",
                    description: "Failed to load customization options",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadCustomizations();
    }, [item.id]);

    const handleToggleOption = (option: CustomizationOption) => {
        const isSelected = selectedOptions.some(o => o.id === option.id);
        if (isSelected) {
            setSelectedOptions(prev => prev.filter(o => o.id !== option.id));
        } else {
            setSelectedOptions(prev => [...prev, option]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(selectedOptions);
            onClose();
        } catch (error) {
            console.error('Error saving customizations:', error);
            toast({
                title: "Error",
                description: "Failed to save your selections",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-border animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
                    <div>
                        <h2 className="font-display font-bold text-xl">Add Extra Items</h2>
                        <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="font-medium">Loading choices...</p>
                        </div>
                    ) : options.length === 0 ? (
                        <div className="text-center py-20">
                            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground">No extra items available for this item.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Options</p>
                            {options.map((option) => {
                                const isSelected = selectedOptions.some(o => o.id === option.id);
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleToggleOption(option)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                                            isSelected
                                                ? "bg-primary/5 border-primary shadow-sm"
                                                : "bg-card border-border hover:border-primary/50 hover:bg-accent/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                isSelected
                                                    ? "bg-primary border-primary"
                                                    : "border-muted-foreground/30 group-hover:border-primary/50"
                                            )}>
                                                {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                                            </div>
                                            <span className="font-medium">{option.name}</span>
                                        </div>
                                        <span className={cn(
                                            "font-bold text-sm",
                                            isSelected ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            +₹{option.price}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-6 border-t bg-accent/10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Extra cost: </span>
                            <span className="font-bold text-primary">₹{selectedOptions.reduce((sum, o) => sum + o.price, 0)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {selectedOptions.length} item(s) selected
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
                        disabled={saving || loading}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Saving Selections...
                            </>
                        ) : (
                            'Confirm Selection'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
