import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Edit2, CheckCircle2, XCircle,
    ChefHat, Star, Briefcase, Loader2, Save, X
} from 'lucide-react';
import { chefService, Chef } from './lib/supabase';
import { cn } from './lib/utils';

export default function ChefManagement() {
    const [chefs, setChefs] = useState<Chef[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        is_available: true
    });

    const fetchChefs = async () => {
        try {
            setLoading(true);
            const data = await chefService.getAll();
            setChefs(data);
        } catch (error) {
            console.error('Failed to fetch chefs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChefs();
    }, []);

    const handleSave = async () => {
        try {
            if (editingId) {
                await chefService.update(editingId, formData);
            } else {
                await chefService.create(formData);
            }
            await fetchChefs();
            resetForm();
        } catch (error) {
            console.error('Failed to save chef:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this chef?')) return;
        try {
            await chefService.delete(id);
            await fetchChefs();
        } catch (error) {
            console.error('Failed to delete chef:', error);
        }
    };

    const handleEdit = (chef: Chef) => {
        setFormData({
            name: chef.name,
            is_available: chef.is_available
        });
        setEditingId(chef.id);
        setIsAdding(true);
    };

    const resetForm = () => {
        setFormData({ name: '', is_available: true });
        setIsAdding(false);
        setEditingId(null);
    };

    const toggleAvailability = async (chef: Chef) => {
        try {
            await chefService.update(chef.id, { is_available: !chef.is_available });
            setChefs(prev => prev.map(c => c.id === chef.id ? { ...c, is_available: !c.is_available } : c));
        } catch (error) {
            console.error('Failed to toggle availability:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Chef Management</h2>
                    <p className="text-sm text-gray-500">Manage your kitchen staff and availability</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl h-11 font-semibold hover:bg-orange-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Chef
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                            <ChefHat className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold">{editingId ? 'Edit Chef' : 'New Chef'}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Chef Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                placeholder="Enter full name"
                            />
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_available}
                                        onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                                        className="sr-only"
                                    />
                                    <div className={cn(
                                        "w-12 h-6 rounded-full transition-colors",
                                        formData.is_available ? "bg-green-500" : "bg-gray-200"
                                    )} />
                                    <div className={cn(
                                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                        formData.is_available ? "translate-x-6" : "translate-x-0"
                                    )} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Currently Available</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={resetForm}
                            className="px-6 py-2.5 rounded-xl border font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!formData.name}
                            className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {editingId ? 'Update Chef' : 'Save Chef'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                    <p className="font-medium">Loading chefs...</p>
                </div>
            ) : chefs.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed rounded-3xl">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChefHat className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No chefs added yet</h3>
                    <p className="text-gray-500 mb-6">Start by adding your kitchen team members</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-orange-600 font-bold hover:underline"
                    >
                        Add your first chef
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chefs.map(chef => (
                        <div key={chef.id} className={cn(
                            "bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group",
                            !chef.is_available && "opacity-75"
                        )}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                                        chef.is_available ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-400"
                                    )}>
                                        👨‍🍳
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900 leading-tight">{chef.name}</h4>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Professional Chef</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(chef)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-orange-600 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(chef.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    <span>Currently handling <span className="font-bold text-gray-900">{chef.current_assigned_orders}</span> orders</span>
                                </div>
                            </div>

                            <div className="border-t pt-4 flex items-center justify-between">
                                <button
                                    onClick={() => toggleAvailability(chef)}
                                    className={cn(
                                        "flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                                        chef.is_available
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                    )}
                                >
                                    {chef.is_available ? (
                                        <><CheckCircle2 className="w-3 h-3" /> Available</>
                                    ) : (
                                        <><XCircle className="w-3 h-3" /> Busy / Off Duty</>
                                    )}
                                </button>
                                <span className="text-[10px] text-gray-400 font-medium">Added {new Date(chef.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
