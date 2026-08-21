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
  Menu, MenuItem, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import { Logout, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ThemeContext';
import { navItems } from '../config/navigation';
import ThemeToggle from './ThemeToggle';
import DentalDayMark from './DentalDayMark';

const DRAWER_WIDTH = 92;
const DRAWER_WIDTH_MOBILE = 112; // Un poco más ancho en móvil para que las etiquetas se lean bien

const Layout = () => {
  const { user, logout } = useAuth();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  // Detecta pantallas pequeñas (menor a 'md') para alternar entre drawer permanente y temporal
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  // Colores de superficie según el modo
  const sidebarBg = isDark ? 'rgba(22,27,34,0.90)' : 'rgba(255,255,255,0.80)';
  const headerBg  = isDark ? 'rgba(22,27,34,0.75)' : 'rgba(255,255,255,0.75)';
  const borderCol = isDark ? '#30363D'             : 'rgba(0,0,0,0.06)';

  const drawerWidth = isMobile ? DRAWER_WIDTH_MOBILE : DRAWER_WIDTH;

  // En móvil, navegar cierra el drawer automáticamente
  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  // Contenido del drawer, compartido entre la versión permanente (escritorio) y la temporal (móvil)
  const drawerContent = (
    <>
      {/* Logo compacto */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 2,
        color: (theme) => theme.palette.mode === 'dark'
          ? theme.palette.common.white
          : theme.palette.primary.main,
      }}>
        <DentalDayMark size={40} />
      </Box>

      {/* Módulos: ícono arriba + etiqueta debajo */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Box
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 0.3, py: 1.2, borderRadius: '14px', cursor: 'pointer',
                background: active
                  ? (isDark ? 'rgba(37,99,235,0.20)' : 'rgba(37,99,235,0.12)')
                  : 'transparent',
                color: active ? '#2563EB' : (isDark ? '#9DA7B3' : '#5A6B85'),
                transition: 'all 0.15s',
                '&:hover': {
                  background: isDark ? 'rgba(37,99,235,0.14)' : 'rgba(37,99,235,0.08)',
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
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── BARRA LATERAL ── */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={isMobile ? { keepMounted: true } : undefined}
        sx={{
          width: isMobile ? 0 : drawerWidth, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth, boxSizing: 'border-box', border: 'none',
            background: sidebarBg,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRight: `1px solid ${borderCol}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* ── ÁREA PRINCIPAL ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky" elevation={0}
          sx={{
            background: headerBg,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${borderCol}`,
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', gap: { xs: 1, md: 1.5 } }}>
            {/* Botón hamburguesa: solo visible en móvil, abre el drawer temporal */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 'auto', color: isDark ? '#9DA7B3' : '#5A6B85' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <ThemeToggle />
            {/* El email se oculta en móvil para dejar espacio; siempre visibles ThemeToggle y Avatar */}
            <Typography
              sx={{
                color: 'text.secondary', fontSize: 14,
                display: { xs: 'none', sm: 'block' },
                maxWidth: { sm: 140, md: 'none' },
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {user?.email}
            </Typography>
            <Tooltip title="Cuenta">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#2563EB', fontSize: 14 }}>
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

        <Box sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
