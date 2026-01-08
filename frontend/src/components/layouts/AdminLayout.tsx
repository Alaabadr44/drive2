
import React, { useState } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutDashboard, Store, Monitor, LogOut, PhoneCall, Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";

const items = [
    {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Restaurants",
        url: "/admin/restaurants",
        icon: Store,
    },
    {
        title: "Screens",
        url: "/admin/screens",
        icon: Monitor,
    },
    {
        title: "Call History",
        url: "/admin/calls",
        icon: PhoneCall,
    },
];

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { liveCalls } = useAdmin();
    const [collapsed, setCollapsed] = useState(false);

    const activeLiveCalls = liveCalls.length;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <SidebarProvider>
            <div className="dark min-h-screen flex w-full bg-background text-foreground relative">
                <div className={`${collapsed ? 'hidden' : 'block'} flex-shrink-0 transition-all duration-300 ease-in-out`}>
                    <Sidebar className="border-r border-border/50 bg-sidebar-background/95 backdrop-blur-xl h-full">
                        <SidebarContent>
                            <SidebarGroup>
                                <div className="px-4 py-8 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                                            Super Admin
                                        </h2>
                                        <p className="text-xs text-sidebar-foreground/50 mt-1 uppercase tracking-widest font-semibold">
                                            Management Portal
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="lg:hidden text-muted-foreground">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                
                                {/* Live Call Indicator */}
                                {activeLiveCalls > 0 && (
                                    <div className="mx-4 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-red-500 font-bold text-xs uppercase tracking-wider">
                                            {activeLiveCalls} Live Call{activeLiveCalls !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                                
                                <SidebarGroupContent>
                                    <SidebarMenu className="px-2 gap-2">
                                        {items.map((item) => (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton 
                                                    asChild 
                                                    isActive={location.pathname === item.url}
                                                    className={`
                                                        rounded-xl transition-all duration-300 py-6 px-4
                                                        ${location.pathname === item.url 
                                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                                                            : 'hover:bg-sidebar-accent/50'}
                                                    `}
                                                >
                                                    <Link to={item.url} className="flex items-center gap-3">
                                                        <item.icon className={`h-5 w-5 ${location.pathname === item.url ? 'text-white' : 'text-primary'}`} />
                                                        <span className="font-medium">{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                        <div className="mt-8 pt-8 border-t border-sidebar-border/50">
                                            <SidebarMenuItem>
                                                <SidebarMenuButton 
                                                    onClick={handleLogout}
                                                    className="rounded-xl py-6 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                                                >
                                                    <LogOut className="h-5 w-5" />
                                                    <span className="font-medium">Logout</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </div>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                </div>
                
                <main className="flex-1 p-8 bg-background overflow-auto relative w-full">
                    {/* Sidebar Toggle Button */}
                    <div className="absolute top-8 left-4 z-50">
                         <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setCollapsed(!collapsed)}
                            className="bg-background/50 backdrop-blur-md border border-border/50 shadow-sm hover:bg-background"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/5 to-transparent -z-10 blur-3xl rounded-full" />
                    <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-blue-500/5 to-transparent -z-10 blur-3xl rounded-full" />
                    
                    <div className="max-w-7xl mx-auto backdrop-blur-[2px]">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
