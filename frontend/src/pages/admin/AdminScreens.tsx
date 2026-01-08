import React, { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { Screen } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Settings, Monitor, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminScreens = () => {
    const { restaurants, screens, addScreen, updateScreen, deleteScreen, assignRestaurantToScreen, unassignRestaurantFromScreen, isLoading } = useAdmin();
    const [isOpen, setIsOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
    const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);

    const [formData, setFormData] = useState<Partial<Screen>>({
        name: '',
        email: '',
        password: '',
        isActive: true,
        showLanguage: 'both',
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            isActive: true,
            showLanguage: 'both',
        });
        setEditingScreen(null);
    };

    const handleOpen = (screen?: Screen) => {
        if (screen) {
            setEditingScreen(screen);
            setFormData({
                name: screen.name,
                email: screen.email || '',
                password: screen.password || '', // Show masked password from API
                isActive: screen.isActive ?? true,
                showLanguage: screen.showLanguage || 'both',
            });
        } else {
            resetForm();
        }
        setIsOpen(true);
    };

    const handleOpenAssign = (screen: Screen) => {
        setSelectedScreen(screen);
        setIsAssignOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingScreen) {
                await updateScreen(editingScreen.id, formData);
            } else {
                await addScreen(formData as Omit<Screen, 'id'>);
            }
            setIsOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssign = async (restaurantId: string) => {
        if (selectedScreen && restaurantId) {
            await assignRestaurantToScreen(selectedScreen.id, restaurantId);
            // After assignment, update selectedScreen in local state to show change
            // The context refresh (fetchScreens) will eventually update everything
        }
    };

    const handleUnassign = async (restaurantId: string) => {
        if (selectedScreen && restaurantId) {
            await unassignRestaurantFromScreen(selectedScreen.id, restaurantId);
        }
    };

    const handleToggleVisibility = async (restaurantId: string, currentVisible: boolean) => {
         if (selectedScreen) {
             await assignRestaurantToScreen(selectedScreen.id, restaurantId, !currentVisible);
         }
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Screens</h1>
                        <p className="text-muted-foreground mt-2">Configure and monitor your kiosk display units</p>
                    </div>
                    <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-6 rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-95">
                        <Plus className="mr-2 h-5 w-5" /> Add Screen
                    </Button>
                </div>

                <div className="bg-card/80 backdrop-blur-md rounded-[2rem] border border-border shadow-2xl shadow-black/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b border-border">
                                <TableHead className="py-6 px-6 font-bold text-muted-foreground">Screen Name</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground">Email</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground text-center">Active</TableHead>
                                <TableHead className="py-6 font-bold text-muted-foreground text-center">Restaurants</TableHead>
                                <TableHead className="py-6 pr-6 text-right font-bold text-muted-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : screens.map((screen) => (
                                <TableRow key={screen.id} className="group hover:bg-muted/50 transition-colors border-b border-border">
                                    <TableCell className="py-6 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                <Monitor className="h-5 w-5" />
                                            </div>
                                            <span className="font-bold text-lg text-foreground">{screen.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <span className="text-muted-foreground">{screen.email}</span>
                                    </TableCell>
                                    <TableCell className="py-6 text-center">
                                        <div className="flex justify-center">
                                            <Switch 
                                                checked={screen.isActive ?? true} 
                                                onCheckedChange={() => updateScreen(screen.id, { isActive: !screen.isActive })}
                                                className="data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 text-center">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleOpenAssign(screen)}
                                            className="rounded-xl border-primary/20 hover:bg-primary/10 text-primary font-bold"
                                        >
                                            Manage ({screen.restaurants?.length || 0})
                                        </Button>
                                    </TableCell>
                                    <TableCell className="py-6 pr-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleOpen(screen)}
                                                className="w-10 h-10 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="w-10 h-10 rounded-xl hover:bg-destructive hover:text-white text-destructive transition-all duration-300" 
                                                onClick={() => deleteScreen(screen.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Main Screen Modal */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">{editingScreen ? 'Edit Screen' : 'Add Screen'}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Configure the screen basic settings.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-foreground">Screen Name</Label>
                                <Input id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-background border-input text-foreground" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground">Email</Label>
                                    <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-background border-input text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-foreground">Password {editingScreen && '(Leave blank to keep)'}</Label>
                                    <Input id="password" type="password" required={!editingScreen} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="bg-background border-input text-foreground" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lang" className="text-foreground">Language</Label>
                                    <Select 
                                        value={formData.showLanguage} 
                                        onValueChange={(v: 'en' | 'ar' | 'both') => setFormData({ ...formData, showLanguage: v })}
                                    >
                                        <SelectTrigger id="lang" className="bg-background border-input text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="both">Both (En/Ar)</SelectItem>
                                            <SelectItem value="en">English Only</SelectItem>
                                            <SelectItem value="ar">Arabic Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end pb-2">
                                    <div className="flex items-center space-x-2">
                                        <Switch 
                                            id="active" 
                                            checked={formData.isActive} 
                                            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                        />
                                        <Label htmlFor="active" className="text-foreground">Active</Label>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" className="w-full rounded-xl py-6">{editingScreen ? 'Update' : 'Create'} Screen</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Assignment Management Modal */}
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogContent className="max-w-2xl bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Manage Restaurants: {selectedScreen?.name}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Assign or remove restaurants from this screen display.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-foreground">Add Restaurant</Label>
                                <div className="flex gap-2">
                                    <Select onValueChange={(v) => handleAssign(v)}>
                                        <SelectTrigger className="flex-1 bg-background border-input text-foreground">
                                            <SelectValue placeholder="Select restaurant to add..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            {restaurants
                                                .filter(r => !selectedScreen?.restaurants?.some(sr => sr.id === r.id))
                                                .map(r => (
                                                    <SelectItem key={r.id} value={r.id}>{r.nameEn} ({r.nameAr})</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="border-b border-border">
                                            <TableHead className="text-muted-foreground">Restaurant</TableHead>
                                            <TableHead className="text-center text-muted-foreground">Visible</TableHead>
                                            <TableHead className="text-right text-muted-foreground">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {screens.find(s => s.id === selectedScreen?.id)?.restaurants?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No restaurants assigned.</TableCell>
                                            </TableRow>
                                        ) : (
                                            screens.find(s => s.id === selectedScreen?.id)?.restaurants?.map((restaurant) => (
                                                <TableRow key={restaurant.id} className="border-b border-border">
                                                    <TableCell className="font-bold text-foreground">
                                                        {restaurant.nameEn}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch 
                                                            checked={restaurant.isVisibleOnScreen} 
                                                            onCheckedChange={() => handleToggleVisibility(restaurant.id, restaurant.isVisibleOnScreen)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleUnassign(restaurant.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default AdminScreens;
