// src/components/Layout.jsx
// ============================================================
// Marco principal: barra lateral ESTRECHA (estilo Plandok) +
// cabecera. Ícono arriba, etiqueta pequeña debajo. Se adapta
// a modo claro/oscuro.
// ============================================================
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, Avatar,
  Menu, MenuItem, Tooltip,
} from '@mui/material';
import { Logout, LocalHospital } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ThemeContext';
import { navItems } from '../config/navigation';
import ThemeToggle from './ThemeToggle';

const DRAWER_WIDTH = 92;

const Layout = () => {
  const { user, logout } = useAuth();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  // Colores de superficie según el modo
  const sidebarBg = isDark ? 'rgba(14, 22, 38, 0.85)' : 'rgba(255, 255, 255, 0.8)';
  const headerBg  = isDark ? 'rgba(14, 22, 38, 0.7)'  : 'rgba(255, 255, 255, 0.7)';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── BARRA LATERAL ESTRECHA ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none',
            background: sidebarBg,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRight: `1px solid ${borderCol}`,
          },
        }}
      >
        {/* Logo compacto */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px',
            background: 'linear-gradient(135deg, #2B7FD4, #1C64AD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LocalHospital sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
        </Box>

        {/* Módulos: ícono arriba + etiqueta debajo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 0.3, py: 1.2, borderRadius: '14px', cursor: 'pointer',
                  background: active
                    ? (isDark ? 'rgba(43,127,212,0.22)' : 'rgba(43,127,212,0.12)')
                    : 'transparent',
                  color: active ? '#5BA3E8' : (isDark ? '#9DB2CC' : '#7089A5'),
                  transition: 'all 0.15s',
                  '&:hover': {
                    background: isDark ? 'rgba(43,127,212,0.14)' : 'rgba(43,127,212,0.08)',
                  },
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
                <Typography sx={{ fontSize: 10.5, fontWeight: active ? 600 : 500, lineHeight: 1.1 }}>
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Drawer>

      {/* ── ÁREA PRINCIPAL ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky" elevation={0}
          sx={{
            background: headerBg,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${borderCol}`,
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
            <ThemeToggle />
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              {user?.email}
            </Typography>
            <Tooltip title="Cuenta">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#1C64AD', fontSize: 14 }}>
                  {user?.email?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled sx={{ fontSize: 13 }}>{user?.role}</MenuItem>
              <MenuItem onClick={logout}>
                <Logout fontSize="small" sx={{ mr: 1 }} /> Cerrar sesión
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
