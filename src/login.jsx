import React, { useState } from 'react';
import { TextField, Button, InputAdornment, IconButton, Box, Alert, Typography, Grid, Paper, Divider, createTheme, Stack, GlobalStyles } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { login, logout } from './api';
import { useNavigate } from 'react-router';
import iconPecaJa from './assets/logoSF_branco.svg';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { translateError } from './utils/translateError';
import { theme as sharedTheme } from './shared';
//fontes da marca
const fonts = import.meta.glob('./assets/fonts/*.ttf', { eager: true });

export default function Login() {
  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const user = await login(email, password);

      console.log(import.meta.env.MODE)

      if (import.meta.env.PROD) {
        if (!user.emailVerified) {
          await logout();

          throw Object.assign(new Error('Usuário não verificado'), {
            code: 'api/user-not-verified',
          });
        }
      }

      if (user) {
        navigate('/');
      }
    } catch (error) {
      setErrorMessage(translateError(error));
    }
  };

  const loginTheme = createTheme({
    palette: {
      ...sharedTheme.palette,
    },

  });

  let css = '';

  for (const path in fonts) {
    const url = fonts[path].default;
    const nome = path.split('/').pop().replace('.ttf', '');

    css += `
    @font-face {
      font-family: '${nome}';
      src: url(${url}) format('truetype');
      font-display: swap;
    }
  `;
  }

  return (
    <ReactRouterAppProvider
      theme={loginTheme}
    >

      <GlobalStyles styles={css} />

      <Grid container sx={{ height: '100vh' }}>
        <Grid
          size={{ md: 8 }}
          sx={(theme) => ({
            // width: { md: '66.67%' },
            display: { xs: 'none', md: 'flex' },
            color: 'white',
            flexDirection: 'column',
            backgroundColor: 'primary.main',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
          })}
        >
          <Box sx={{ maxWidth: 550, textAlign: 'center', caretColor: 'transparent' }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
              <Box
                component='img'
                src={iconPecaJa}
                alt='Logo Peça Já Cardápio'
                sx={{ width: 100, height: 150 }}
                mr={1}
              />
              <Stack>
                <Stack direction={'row'} spacing={1}>
                  <Typography fontFamily='Axiforma-bold' fontSize={'2.7rem'} lineHeight='1' color='#ffffff'>
                    peça
                  </Typography>
                  <Typography fontFamily='Axiforma-black' fontSize={'2.7rem'} color='#ffffff' lineHeight='1'>
                    já
                  </Typography>
                </Stack>
                <Typography fontFamily='Axiforma-regular' fontSize={'1.5rem'} color='#ffffff' lineHeight='2' letterSpacing='0.25em'>
                  CARDÁPIO
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Grid>

        <Grid
          component={Paper}
          elevation={6}
          square
          size={{ xs: 12, md: 4 }}
          sx={(theme) => ({
            // width: { xs: '100%', md: '33.33%' },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >
          <Box
            component='form'
            onSubmit={handleLogin}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              width: '100%',
              maxWidth: 400
            }}
          >
            <Typography variant='body2' color='text.secondary'>
              JÁ É DE CASA?
            </Typography>
            <Typography variant='h5' component='h1' fontWeight='bold' sx={{ mb: 2 }}>
              FAÇA SEU LOGIN
            </Typography>

            <TextField
              size='small'
              margin='dense'
              label='Email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required

            />
            <TextField
              size='small'
              margin='dense'
              label='Senha'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge='end'>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              textAlign={'right'}
              variant='body2'
              sx={(theme) => ({
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
                mt: 1,
                mb: 2,
              })}
              onClick={() => navigate('/login/rcy')}
            >
              Recuperar senha
            </Typography>

            <Button
              type='submit'
              variant='contained'
              color='primary'
              fullWidth
              sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
            >
              Entrar
            </Button>

            {errorMessage && <Alert severity='error' sx={{ mt: 2 }}>{errorMessage}</Alert>}

            <Divider sx={{ my: 3 }}>OU</Divider>

            <Typography textAlign={'center'} variant='body2' sx={{ mb: 1 }}>
              Não tem uma conta?
            </Typography>

            <Button
              variant='outlined'
              fullWidth
              onClick={() => navigate('/merchant/new')}
            >
              Teste Grátis
            </Button>
          </Box>
        </Grid>
      </Grid>
    </ReactRouterAppProvider>
  );
}