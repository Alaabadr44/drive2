import React, { useState } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { useAdmin } from '../../contexts/AdminContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Restaurant } from '../../data/mockData';
import { getAccessibleImageUrl } from '../../utils/imageUtils';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const AdminRestaurants = () => {
    const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant, activateRestaurant, deactivateRestaurant, isLoading } = useAdmin();
    const [isOpen, setIsOpen] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<Restaurant> & { menuImages?: (File | string)[] }>({
        nameEn: '', nameAr: '', 
        phone: '', status: 'available',
        logo: '', menuImages: [],
        email: '', password: '', contactPhone: ''
    });

    const resetForm = () => {
        setFormData({
            nameEn: '', nameAr: '',
            phone: '', status: 'available',
            logo: '', menuImages: [],
            email: '', password: '', contactPhone: ''
        });
        setEditingRestaurant(null);
    };

    const handleOpen = (restaurant?: Restaurant) => {
        if (restaurant) {
            setEditingRestaurant(restaurant);
            setFormData({
                nameEn: restaurant.nameEn || '',
                nameAr: restaurant.nameAr || '',
                email: restaurant.email || '',
                password: restaurant.password || '', 
                contactPhone: restaurant.contactPhone || restaurant.phone || '',
                // Normalize status to lowercase for the select
                status: (restaurant.status?.toLowerCase() as 'available' | 'busy') || 'available',
                // Keep URLs for preview
                logo: restaurant.logoUrl || restaurant.logo || '',
                menuImages: restaurant.menus && Array.isArray(restaurant.menus) 
                    ? restaurant.menus.map(m => typeof m === 'string' ? m : (m as { imageUrl?: string; url?: string }).imageUrl || (m as { imageUrl?: string; url?: string }).url).filter(Boolean)
                    : (restaurant.menuImageUrl ? [restaurant.menuImageUrl] : []),
                phone: restaurant.phone || '',
            });
        } else {
            resetForm();
        }
        setIsOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingRestaurant) {
                await updateRestaurant(editingRestaurant.id, formData);
            } else {
                await addRestaurant(formData as Omit<Restaurant, 'id'>);
            }
            setIsOpen(false);
            resetForm();
        } catch (error) {
            // Error handled in context
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Restaurants</h1>
                        <p className="text-muted-foreground mt-2">Manage your partner restaurants and their menus</p>
                    </div>
                    <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-6 rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-95">
                        <Plus className="mr-2 h-5 w-5" /> Add Restaurant
                    </Button>
                </div>

                <div className="bg-card/80 backdrop-blur-md rounded-[2rem] border border-border shadow-2xl shadow-black/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b border-border">
                                <TableHead className="py-6 px-6 font-bold text-muted-foreground">Restaurant</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground text-center">Status</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground">Contact</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground">Status Toggle</TableHead>
                                <TableHead className="py-6 pr-6 text-right font-bold text-muted-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : restaurants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No restaurants found.</TableCell>
                                </TableRow>
                            ) : (
                                restaurants.map((restaurant) => (
                                    <TableRow key={restaurant.id} className="group hover:bg-muted/50 transition-colors border-b border-border">
                                        <TableCell className="py-6 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-border shadow-md group-hover:scale-110 transition-transform duration-300 bg-muted">
                                                    <img 
                                                        src={getAccessibleImageUrl(restaurant.logoUrl || restaurant.logo)} 
                                                        alt={restaurant.nameEn} 
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg text-foreground">{restaurant.nameEn}</div>
                                                    <div className="text-sm font-medium text-muted-foreground">{restaurant.nameAr}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6 text-center">
                                            <span className={`
                                                px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                                                ${['available', 'AVAILABLE'].includes(restaurant.status) 
                                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm' 
                                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm'}
                                            `}>
                                                {restaurant.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="text-sm font-semibold text-foreground/80">{restaurant.contactPhone || restaurant.phone}</div>
                                            <div className="text-xs text-muted-foreground lowercase">{restaurant.email}</div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <Switch 
                                                checked={restaurant.isActive ?? false} 
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        activateRestaurant(restaurant.id);
                                                    } else {
                                                        deactivateRestaurant(restaurant.id);
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="py-6 pr-6 text-right">
                                            <div className="flex justify-end gap-2 overflow-hidden">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleOpen(restaurant)}
                                                    className="w-10 h-10 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-10 h-10 rounded-xl hover:bg-destructive hover:text-white text-destructive transition-all duration-300" 
                                                    onClick={() => deleteRestaurant(restaurant.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">{editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Fill in the details for the restaurant below.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nameEn" className="text-foreground">English Name *</Label>
                                    <Input id="nameEn" required value={formData.nameEn} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} className="bg-background border-input text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nameAr" className="text-foreground">Arabic Name *</Label>
                                    <Input id="nameAr" required className="text-right bg-background border-input text-foreground" value={formData.nameAr} onChange={e => setFormData({ ...formData, nameAr: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground">Email (Login) *</Label>
                                    <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-background border-input text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-foreground">Password {editingRestaurant && '(Leave blank to keep)'}</Label>
                                    <Input id="password" type="password" required={!editingRestaurant} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="bg-background border-input text-foreground" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone" className="text-foreground">Contact Phone *</Label>
                                    <Input id="contactPhone" required value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} placeholder="+966..." className="bg-background border-input text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-foreground">Status</Label>
                                    <select
                                        id="status"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as 'available' | 'busy' })}
                                    >
                                        <option value="available">Available</option>
                                        <option value="busy">Busy</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-foreground">Images (Files)</Label>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor="logo" className="text-sm font-medium text-foreground">Logo</Label>
                                            {formData.logo && (
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setFormData({ ...formData, logo: '' })}
                                                    className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    Remove Logo
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {/* Logo Preview Area */}
                                        {formData.logo ? (
                                            <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-border bg-muted">
                                                <img 
                                                    src={formData.logo instanceof File ? URL.createObjectURL(formData.logo) : getAccessibleImageUrl(formData.logo as string)} 
                                                    alt="Logo Preview" 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                                                <span className="text-xs text-muted-foreground">No Logo</span>
                                            </div>
                                        )}

                                        <Input 
                                            id="logo" 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) setFormData({ ...formData, logo: file });
                                            }} 
                                            className="bg-background border-input text-foreground" 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-sm font-bold flex justify-between items-center text-foreground">
                                            Menu Images (Max 10)
                                            <span className="text-xs font-normal text-muted-foreground">{formData.menuImages?.length || 0}/10</span>
                                        </Label>
                                        
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Existing Previews */}
                                            {formData.menuImages?.map((img, idx) => (
                                                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                                                    <img 
                                                        src={img instanceof File ? URL.createObjectURL(img) : getAccessibleImageUrl(img as string)} 
                                                        alt={`Menu ${idx + 1}`} 
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newImages = [...(formData.menuImages || [])];
                                                            newImages.splice(idx, 1);
                                                            setFormData({ ...formData, menuImages: newImages });
                                                        }}
                                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Add Button */}
                                            {(formData.menuImages?.length || 0) < 10 && (
                                                <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                                    <span className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Add Image</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                        multiple
                                                        onChange={e => {
                                                            const files = Array.from(e.target.files || []);
                                                            const currentCount = formData.menuImages?.length || 0;
                                                            const remaining = 10 - currentCount;
                                                            const toAdd = files.slice(0, remaining);
                                                            
                                                            if (toAdd.length > 0) {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    menuImages: [...(formData.menuImages || []), ...toAdd] 
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (editingRestaurant ? 'Update' : 'Add')} Restaurant</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default AdminRestaurants;
