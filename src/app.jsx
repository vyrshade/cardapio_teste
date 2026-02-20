import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router';
import { router } from './router.jsx';
import { DataProvider } from './context.jsx';
import Snackbar from '@mui/material/Snackbar'
import Button from '@mui/material/Button'
import { useState } from 'react';
import { register } from './register.js';
import { theme } from './shared.jsx';


function SwUpdate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    register({
      onUpdate: (registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        setOpen(true);
      },
    });
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <Snackbar
      open={open}
      message='Nova versão disponível'
      anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
      action={
        <Button color='primary' size='small' onClick={handleUpdate}>
          Atualizar
        </Button>
      }
    />
  );
}



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CssBaseline />
    <GlobalStyles
      styles={{
        '*': {
          caretColor: 'transparent',
        },
        'input, textarea, [contenteditable="true"]': {
          caretColor: 'auto',
        },
      }}
    />
    <SwUpdate />
    <DataProvider>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </DataProvider>
  </StrictMode>
)