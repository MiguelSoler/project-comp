import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Container from "./Container.jsx";
import ScrollToTop from "./ScrollToTop.jsx";

export default function RootLayout() {
    return (
        <div className="min-h-screen flex flex-col">
            <ScrollToTop />
            <Navbar />

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="border-t border-ui-border bg-ui-surface">
                <Container className="py-4 text-xs text-ui-text-secondary">
                    © {new Date().getFullYear()} Project Comp
                </Container>
            </footer>
        </div>
    );
}