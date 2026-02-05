import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import Deals from './pages/Deals';
import Analytics from './pages/Analytics';
import LPPortal from './pages/LPPortal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Partners": Partners,
    "Deals": Deals,
    "Analytics": Analytics,
    "LPPortal": LPPortal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};