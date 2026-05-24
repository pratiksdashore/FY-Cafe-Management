import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Save, Settings2 } from 'lucide-react';
import { customizationService, CustomizationOption, MenuItem } from '../lib/supabase';

interface Props {
    item: MenuItem;
    onClose: () => void;
}

export const CustomizationManager = ({ item, onClose }: Props) => {
    const [options, setOptions] = useState<CustomizationOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newOption, setNewOption] = useState({ name: '', price: 0 });

    const loadOptions = async () => {
        try {
            setLoading(true);
            const data = await customizationService.getItemOptions(item.id);
            setOptions(data);
        } catch (error) {
            console.error('Error loading customizations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOptions();
    }, [item.id]);

    const handleAddOption = async () => {
        if (!newOption.name) return;
        setSaving(true);
        try {
            await customizationService.addOption(item.id, {
                name: newOption.name,
                price: newOption.price,
                isAvailable: true
            });
            setNewOption({ name: '', price: 0 });
            await loadOptions();
        } catch (error) {
            alert('Failed to add option');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm('Delete this customization?')) return;
        try {
            await customizationService.deleteOption(id);
            await loadOptions();
        } catch (error) {
            alert('Failed to delete option');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="font-bold text-lg text-gray-900">Customizations: {item.name}</h2>
                        <p className="text-xs text-gray-500">Add toppings, sauces, or extras</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New Option Form */}
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Add New Item</p>
                        <div className="flex gap-2">
                            <input
                                placeholder="Name (e.g. Cheese)"
                                value={newOption.name}
                                onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                            />
                            <div className="w-24 relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={newOption.price || ''}
                                    onChange={(e) => setNewOption({ ...newOption, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full text-sm border rounded-lg pl-6 pr-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                                />
                            </div>
                            <button
                                onClick={handleAddOption}
                                disabled={saving || !newOption.name}
                                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            Active Customizations
                        </h3>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <p className="text-xs">Loading...</p>
                            </div>
                        ) : options.length === 0 ? (
                            <p className="text-center py-8 text-sm text-gray-400 italic">No customizations added yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {options.map((opt) => (
                                    <div key={opt.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-gray-900">{opt.name}</span>
                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                                +₹{opt.price}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteOption(opt.id)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
