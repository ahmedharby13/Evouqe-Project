import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { shopContext } from '../context/shopContext';
import { assets } from '../assets/assets';

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItem,
    token,
    logout,
    showSearch,
    setShowSearch,
    setCartItem,
  } = useContext(shopContext)!;

  const cartCount = Object.values(cartItem).reduce(
    (acc, sizes) => acc + Object.values(sizes).reduce((sum, qty) => sum + qty, 0),
    0
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCartItem({});
    logout();
    navigate('/login');
  };

  const isCollectionRoute = location.pathname.includes('/collection');

  const NavItem = ({ to, children }: { to: string; children: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative group flex flex-col items-center transition-colors duration-300 ${
          isActive ? 'text-black' : 'text-gray-700 hover:text-black'
        }`
      }
    >
      <span className="text-sm">{children}</span>
      <span
        className={`absolute bottom-[-4px] h-[2px] bg-black transition-all duration-300
          ${location.pathname === to || (to === '/collection' && isCollectionRoute)
            ? 'w-1/2'
            : 'w-0 group-hover:w-1/2'
          }`}
      />
    </NavLink>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <img src={assets.logo} className="w-12" alt="logo" />
            <h1 className="text-2xl sm:text-3xl logo font-bold">EVOQUE</h1>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-8">
            <NavItem to="/">HOME</NavItem>
            <NavItem to="/collection">COLLECTION</NavItem>
            <NavItem to="/about">ABOUT</NavItem>
            <NavItem to="/contact">CONTACT</NavItem>
            <a
              href= {import.meta.env.VITE_ADMIN_PANEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border px-5 text-xs py-1 rounded-full hover:bg-black hover:text-white transition-colors duration-300"
            >
              Admin Panel
            </a>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            {isCollectionRoute && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="hover:opacity-75 transition-opacity"
              >
                <img src={assets.search_icon} className="w-5" alt="search" />
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative group">
              <img
                src={assets.profile_icon}
                className="w-5 cursor-pointer hover:opacity-75 transition-opacity"
                alt="profile"
                onClick={() => (!token ? navigate('/login') : null)}
              />
              {token && (
                <div className="dropdown-menu hidden group-hover:block absolute right-0 pt-4">
                  <div className="flex flex-col gap-2 w-56 p-4 bg-white rounded-lg shadow-lg text-gray-500 ">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setMenuOpen(false);
                      }}
                      className="text-center hover:text-black transition-colors"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate('/orders');
                        setMenuOpen(false);
                      }}
                      className="text-center hover:text-black transition-colors"
                    >
                      Orders
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="text-center hover:text-black transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <NavLink to="/cart" className="relative hover:opacity-75 transition-opacity">
              <img src={assets.cart_icon} className="w-5" alt="cart" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -bottom-1.5 w-4 h-4 flex items-center justify-center bg-black text-white rounded-full text-[10px]">
                  {cartCount}
                </span>
              )}
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="sm:hidden hover:opacity-75 transition-opacity"
          >
            <img src={assets.menu_icon} alt="menu" className="w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={`fixed inset-y-0 right-0 transform ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out sm:hidden`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 text-gray-600"
            >
              <img
                src={assets.dropdown_icon}
                alt="close"
                className="h-4 rotate-180"
              />
              <span>Close Menu</span>
            </button>
          </div>
          <div className="flex flex-col py-4 bg-white">
            {[
              { to: '/', label: 'HOME' },
              { to: '/collection', label: 'COLLECTION' },
              { to: '/about', label: 'ABOUT' },
              { to: '/contact', label: 'CONTACT' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-6 py-3 text-sm ${
                    isActive
                      ? 'text-black bg-gray-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={import.meta.env.VITE_ADMIN_PANEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              Admin Panel
            </a>
            {token && (
              <>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                  className="px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 text-left"
                >
                  My Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/orders');
                    setMenuOpen(false);
                  }}
                  className="px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 text-left"
                >
                  Orders
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 text-left"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;