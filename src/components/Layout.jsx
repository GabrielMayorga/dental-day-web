// src/components/Layout.jsx
// ============================================================
// Marco principal de la app: barra lateral + cabecera.
// El <Outlet/> es el "hueco" donde React Router renderiza
// la página activa (agenda, pacientes, etc.).
// ============================================================
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { Logout, LocalHospital } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { navItems } from '../config/navigation';

const DRAWER_WIDTH = 240;

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  // Filtramos los módulos según el rol del usuario
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#EEF4FB' }}>
      {/* ── BARRA LATERAL ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            // Acento sutil de glass en la barra lateral
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, #2B7FD4, #1C64AD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LocalHospital sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#0C2A4A', lineHeight: 1.2 }}>
              Dental Day
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#42648A' }}>
              Sistema clínico
            </Typography>
          </Box>
        </Box>

        {/* Lista de módulos */}
        <List sx={{ px: 1.5 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: '12px', mb: 0.5,
                  background: active ? 'rgba(43, 127, 212, 0.12)' : 'transparent',
                  color: active ? '#1C64AD' : '#42648A',
                  '&:hover': { background: 'rgba(43, 127, 212, 0.08)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: active ? '#1C64AD' : '#7089A5' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* ── ÁREA PRINCIPAL ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Cabecera */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end' }}>
            <Typography sx={{ color: '#42648A', fontSize: 14, mr: 1.5 }}>
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
              <MenuItem disabled sx={{ fontSize: 13, color: '#42648A' }}>
                {user?.role}
              </MenuItem>
              <MenuItem onClick={logout}>
                <Logout fontSize="small" sx={{ mr: 1 }} /> Cerrar sesión
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Aquí se renderiza la página activa */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
