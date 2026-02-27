import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
  Typography,
  Divider,
  createTheme,
  GlobalStyles,
  Stack
} from '@mui/material';
import { useState } from 'react';
import { Grid } from '@mui/system';
import { addDocument, login, logout, SYS_ORDER_STATUS } from './api';
import { IMaskInput } from 'react-imask';
import { sendEmailVerification } from 'firebase/auth';
import { Check, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import iconPecaJa from './assets/logoSF.svg';
//import iconPecaJa from './assets/icone.png';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { theme as sharedTheme } from './shared';
import { translateError } from './utils/translateError';
//fontes da marca
const fonts = import.meta.glob('./assets/fonts/*.ttf', { eager: true });



const CnpjMask = React.forwardRef(function CnpjMask(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask={[
        { mask: '000.000.000-00' },
        { mask: '00.000.000/0000-00' },
      ]}
      dispatch={(appended, dynamicMasked) => {
        const digits = (dynamicMasked.value + appended).replace(/\D/g, '');
        return digits.length > 11
          ? dynamicMasked.compiledMasks[1]
          : dynamicMasked.compiledMasks[0];
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

const PhoneMask = React.forwardRef(function CnpjMask(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask='(00) 00000-0000'
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});



export default function MerchantFormMkt() {

  const [successMessage, setSuccessMessage] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (!cnpj || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho += 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  }

  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');

    if (!cpf || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.charAt(10));
  }

  function validarDocumento(doc) {
    const digits = doc.replace(/[^\d]+/g, '');
    return digits.length === 11 ? validarCPF(doc) : validarCNPJ(doc);
  }

  const schema = z
    .object({
      name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
      email: z
        .string()
        .min(1, { message: 'E-mail obrigatório' })
        .email('E-mail inválido'),
      password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
      confirmPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
      cnpj: z
        .string()
        .min(1, { message: 'CNPJ / CPF obrigatório' })
        .refine((doc) => !doc || validarDocumento(doc), {
          message: 'CNPJ / CPF inválido',
        }),
      phone: z.string().min(15, 'Celular inválido'),
      isMerchantAdmin: z.boolean(),
      type: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'As senhas não coincidem',
      path: ['confirmPassword'],
    });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      cnpj: '',
      phone: '',
      isMerchantAdmin: true,
      type: 'adm'
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


  //submit do formulario
  const onSubmit = async (data) => {
    try {
      setSuccessMessage('');
      setErrorMessage('');

      //chamada api
      const resposta = await fetch(`${import.meta.env.VITE_API_URL}/newUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data
        }),
      });

      if (!resposta.ok) {
        const errorData = await resposta.json();

        throw Object.assign(new Error('Erro ao criar usuário / estabelecimento:'), {
          ...errorData
        });
      }

      const res = await resposta.json();

      if (res.uid) {
        //setup 
        //mudar para fazer apos verificacao

        const user = await login(data.email, data.password);

        await user.getIdToken(true);

        const promises = SYS_ORDER_STATUS.map(status =>
          addDocument(res.uid, 'order_status', status)
        );

        await Promise.all(promises);

        //- em teste
        /* 
                const merchantId = res.uid;
                const today = new Date();
                //const date = new Date(today.setDate(today.getDate() + 30));
                const voucher_teste = {
                  merchantId: merchantId,
                  cnpj: data.cnpj,
                  phone: data.phone,
                  date: today,
                  value: 0,
                  description: 'Periodo de teste',
                }
        
                await addPayment(voucher_teste);
         */
        //- em teste fim

        await sendEmailVerification(user);

        await logout();

        setSuccessMessage('Enviamos em seu e-mail o link de validação!');

        setTimeout(() => {
          navigate('/login');
        }, 5000);

      }
    } catch (error) {
      const message = error.code ? translateError(error) : error.message
      setErrorMessage(message);
    }
  };

  const loginTheme = createTheme({
    palette: {
      ...sharedTheme.palette,
    },
  });


  return (
    <ReactRouterAppProvider
      theme={loginTheme}
    >
      <GlobalStyles styles={css} />

      <Grid
        container
        sx={{
          minHeight: '100vh', // para telas longas
          py: 4, //espaço entre tela
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: {
            xs: 'none',
            md: 'primary.main'
          }
        }}
      >
        <Paper
          elevation={0}
          sx={{
            pl: 4,
            pr: 4,
            pb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            width: '100%',
            maxWidth: { xs: '100%', md: 450 },
            minHeight: { xs: '100vh', md: 'auto' },
            borderRadius: { xs: 0, md: 3 }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', mb: 2, caretColor: 'transparent' }}>
            <Box
              component='img'
              src={iconPecaJa}
              alt='Logo Peça Já Cardápio'
              sx={{ width: 50, height: 100 }}
              mr={1}
            />
            <Stack>
              <Stack direction={'row'} spacing={1}>
                <Typography fontFamily='Axiforma-bold' fontSize={'1.8rem'} lineHeight='1'>
                  peça
                </Typography>
                <Typography fontFamily='Axiforma-black' fontSize={'1.8rem'} color='primary' lineHeight='1'>
                  já
                </Typography>
              </Stack>
              <Typography fontFamily='Axiforma-regular' fontSize={'1rem'} color='primary' lineHeight='1.7' letterSpacing='0.25em'>
                CARDÁPIO
              </Typography>
            </Stack>
          </Box>



          <Stack direction={'row'} width={'100%'} alignItems={'center'} alignContent={'center'} justifyItems={'center'} spacing={1}>
            <Check color='success' />
            <Typography variant='body2' fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>Teste grátis por 7 dias — sem cartão e sem cobrança.</Typography>
          </Stack>

          <Stack direction={'row'} width={'100%'} alignItems={'center'} alignContent={'center'} justifyItems={'center'} spacing={1}>
            <Check color='success' />
            <Typography variant='body2' fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>Seu cardápio digital pronto em minutos.</Typography>
          </Stack>

          <Stack direction={'row'} width={'100%'} alignItems={'center'} alignContent={'center'} justifyItems={'center'} spacing={1} mb={2}>
            <Check color='success' />
            <Typography variant='body2' fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>Simples para o cliente e para sua equipe.</Typography>
          </Stack>



          <Box
            component='form'
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              width: '100%'
            }}
          >
            <TextField
              fullWidth
              margin='dense'
              autoComplete='off'
              label='Nome do Estabelecimento'
              size='small'
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isSubmitting}
            />

            <Controller
              name='cnpj'
              control={control}
              defaultValue=''
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  margin='dense'
                  label='CNPJ / CPF'
                  size='small'
                  InputProps={{
                    inputComponent: CnpjMask
                  }}
                  error={!!errors.cnpj}
                  helperText={errors.cnpj?.message}
                  disabled={isSubmitting}
                />
              )}
            />

            <Controller
              name='phone'
              control={control}
              defaultValue=''
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  margin='dense'
                  label='Celular'
                  size='small'
                  InputProps={{
                    inputComponent: PhoneMask
                  }}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  disabled={isSubmitting}
                />
              )}
            />

            <TextField
              name='email'
              fullWidth
              margin='dense'
              autoComplete='off'
              label='Email'
              size='small'
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isSubmitting}
            />

            <TextField
              name='password'
              fullWidth
              margin='dense'
              autoComplete='off'
              label='Senha'
              size='small'
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isSubmitting}
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

            <TextField
              name='confirmPassword'
              fullWidth
              margin='dense'
              autoComplete='off'
              label='Confirmar senha'
              size='small'
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              disabled={isSubmitting}
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

            <Button
              fullWidth
              type='submit'
              variant='contained'
              disabled={isSubmitting}
              size='small'
              sx={{ py: 1.5, textTransform: 'none', fontSize: { md: '1rem' }, mt: 2 }} // Estilo do Login
            >
              INICIAR
            </Button>

            {successMessage && (
              <Alert severity='success' sx={{ width: '100%', mt: 2 }}>{successMessage}</Alert>
            )}
            {errorMessage && (
              <Alert severity='error' sx={{ width: '100%', mt: 2 }}>{errorMessage}</Alert>
            )}
          </Box>

          <Divider sx={{ my: 1, width: '100%' }}></Divider>

          <Typography textAlign={'center'} variant='body2' sx={{ mb: 1 }}>
            Já tem uma conta?
          </Typography>

          <Button
            variant='outlined'
            fullWidth
            onClick={() => navigate('/login')} // Alterado de '/merchant/new' para '/login'
          >
            Fazer Login
          </Button>

        </Paper>
      </Grid>

    </ReactRouterAppProvider >
  );
}