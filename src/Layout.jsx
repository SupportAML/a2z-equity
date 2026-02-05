import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Eye,
  Building2 } from
"lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger } from
"@/components/ui/sidebar";

const navigationItems = [
{
  title: "Dashboard",
  url: createPageUrl("Dashboard"),
  icon: LayoutDashboard
},
{
  title: "Partners",
  url: createPageUrl("Partners"),
  icon: Users
},
{
  title: "Deals",
  url: createPageUrl("Deals"),
  icon: Briefcase
},
{
  title: "Capital Calls",
  url: createPageUrl("CapitalCalls"),
  icon: Building2
},
{
  title: "Analytics",
  url: createPageUrl("Analytics"),
  icon: BarChart3
},
{
  title: "LP Portal",
  url: createPageUrl("LPPortal"),
  icon: Eye
}];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary: 220 70% 15%;
            --primary-foreground: 45 100% 85%;
            --secondary: 45 100% 85%;
            --secondary-foreground: 220 70% 15%;
            --accent: 45 100% 50%;
            --accent-foreground: 220 70% 15%;
            --background: 0 0% 98%;
            --foreground: 220 70% 15%;
            --muted: 220 20% 95%;
            --muted-foreground: 220 30% 40%;
            --card: 0 0% 100%;
            --card-foreground: 220 70% 15%;
            --border: 220 20% 90%;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }
          
          .nav-gradient {
            background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
          }
          
          .gold-accent {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          }
        `}
      </style>
      
      <div className="min-h-screen flex w-full">
        <Sidebar className="nav-gradient border-r-0">
          <SidebarHeader className="border-b border-slate-600/30 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gold-accent rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-slate-800" />
              </div>
              <div>
                <h2 className="text-slate-950 text-xl font-bold tracking-tight">A2Z Equity</h2>
                <p className="text-slate-500 text-sm">Fund Management</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) =>
                  <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                      asChild
                      className={`hover:bg-slate-600/50 text-slate-200 hover:text-white transition-all duration-300 rounded-xl mb-1 ${
                      location.pathname === item.url ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-800 shadow-lg' : ''}`
                      }>

                        <Link to={item.url} className="bg-slate-200 text-slate-900 mb-1 px-4 py-3 text-sm font-medium peer/menu-button flex w-full items-center gap-2 overflow-hidden outline-none ring-sidebar-ring focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 h-8 hover:bg-slate-600/50 hover:text-white transition-all duration-300 rounded-xl gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-600/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-slate-200 font-semibold text-sm">FM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">Fund Manager</p>
                <p className="text-xs text-slate-300 truncate">Manage your investments</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 md:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-xl transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-800">A2Z Equity</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>);

}