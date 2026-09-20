import Sidebar from './Sidebar';
import Slideshow from './Slideshow';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-layout">
      <Slideshow />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
