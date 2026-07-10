import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2980B9',
      light: '#5DADE2',
      dark: '#1F618D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2980B9',
      light: '#5DADE2',
      dark: '#2E86C1',
      contrastText: '#FFFFFF',
    },
    accent: {
      main: '#5DADE2',
      light: '#3498DB',
      dark: '#2980B9',
      contrastText: '#FFFFFF',
    },
    erp: {
      primary: '#1F618D',
      secondary: '#3498DB',
      accent: '#2980B9', // Replaces the orange #FF6300
      dark: '#1A1A1A',
      danger: '#E74C3C',
    },
    warning: {
      main: '#F7DC6F',
      contrastText: '#5D4037',
    },
    error: {
      main: '#E74C3C',
    },
    background: {
      default: '#F4F7F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C3E50',
      secondary: '#7F8C8D',
    },
  },
  typography: {
    fontFamily: '"system-ui", "-apple-system", "sans-serif"',
    h1: { fontWeight: 700, color: '#2C3E50' },
    h2: { fontWeight: 600, color: '#2C3E50' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 500 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0',
    },
    body1: {
      color: '#34495E',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2980B9 0%, #3498DB 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3498DB 0%, #5DADE2 100%)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 10px 30px rgba(41, 128, 185, 0.05)',
          border: '1px solid rgba(133, 193, 174, 0.1)',
        },
        rounded: {
          borderRadius: 24,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(41, 128, 185, 0.15)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2980B9',
            borderWidth: '2px',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3498DB',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          color: '#2C3E50',
          borderBottom: '1px solid rgba(41, 128, 185, 0.05)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F8FBFE',
          color: '#2980B9',
        },
      },
    },
  },
});

export default theme;
