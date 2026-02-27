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
  Typography,
  Divider,
  createTheme,
} from '@mui/material';
import { useState } from 'react';
import { Grid } from '@mui/system';
import { IMaskInput } from 'react-imask';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import iconPecaJa from './assets/icone.png';
import { useNavigate } from 'react-router';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { theme as sharedTheme } from './shared';




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

// Criação do tema (copiado do Login.js)
const loginTheme = createTheme({
  palette: {
    ...sharedTheme.palette,
  },
});


export default function LoginRecovery() {

  const [successMessage, setSuccessMessage] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

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

  function validarDocumento(doc) {
    const digits = doc.replace(/[^\d]+/g, '');
    return digits.length === 11 ? validarCPF(doc) : validarCNPJ(doc);
  }

  const schema = z
    .object({
      email: z
        .string()
        .min(1, { message: 'E-mail obrigatório' })
        .email('E-mail inválido'),
      cnpj: z
        .string()
        .min(1, { message: 'CNPJ / CPF obrigatório' })
        .refine((cnpj) => !cnpj || validarDocumento(cnpj), {
          message: 'CNPJ / CPF inválido',
        }),
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
      email: '',
      cnpj: '',
    },
  });



  //submit do formulario
  const onSubmit = async (data) => {

    try {
      setSuccessMessage('');
      setErrorMessage('');

      //chamada api
      const resposta = await fetch(`${import.meta.env.VITE_API_URL}/recPwd`, {
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

        throw Object.assign(new Error('Erro ao tentar recuperar senha:'), {
          ...errorData
        });
      }

      const res = await resposta.json();

      //Ver AppCheck
      const auth = getAuth();

      await sendPasswordResetEmail(auth, data.email);

      setSuccessMessage(res.message);

    } catch (error) {
      setErrorMessage(error.message);
    }
  };




  return (
    <ReactRouterAppProvider
      theme={loginTheme}
    >
      <Grid container sx={{ height: '100vh' }}>
        <Grid
          size={{ md: 8 }}
          sx={(theme) => ({
            display: { xs: 'none', md: 'flex' },
            color: 'white',
            flexDirection: 'column',
            backgroundColor: 'primary.main',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
          })}
        >
          <Box sx={{ maxWidth: 550, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
              <Box
                component="img"
                src={iconPecaJa}
                alt="Logo Peça Já Cardápio"
                sx={{
                  width: { xs: 70, sm: 80, md: 90 },
                  height: { xs: 70, sm: 80, md: 90 },
                  mr: 2,
                }}
              />
              <Typography variant="h3" component="h1" fontWeight="bold">
                Peça Já Cardápio
              </Typography>
            </Box>
            <Typography variant="h4" component="h2" fontWeight="400" sx={{ mb: 2 }}>
              Peça já, Peça agora!!
            </Typography>
          </Box>
        </Grid>
        <Grid
          component={Paper}
          elevation={6}
          square
          size={{ xs: 12, md: 4 }}
          sx={(theme) => ({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              width: '100%',
              maxWidth: 400
            }}
          >
            <Typography variant="body2" color="text.secondary">
              PROBLEMAS PARA ACESSAR?
            </Typography>
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
              RECUPERE SUA SENHA
            </Typography>


            <Typography variant='body1' color="text.secondary" sx={{ mb: 2 }}>
              Informe os dados cadastrados para enviarmos o link de recuperação.
            </Typography>

            <Controller
              name="cnpj"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="CNPJ / CPF"
                  size="small"
                  margin="dense"
                  InputProps={{
                    inputComponent: CnpjMask,
                  }}
                  error={!!errors.cnpj}
                  helperText={errors.cnpj?.message}
                />
              )}
            />
            <TextField
              fullWidth
              autoComplete='off'
              label='Email'
              size='small'
              margin='dense'
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />


            <Button
              type='submit'
              variant='contained'
              color="primary"
              fullWidth
              disabled={isSubmitting}
              sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem', mt: 2 }}
            >
              Enviar
            </Button>

            {successMessage && (
              <Alert severity='success' sx={{ width: '100%', mt: 2 }}>{successMessage}</Alert>
            )}
            {errorMessage && (
              <Alert severity='error' sx={{ width: '100%', mt: 2 }}>{errorMessage}</Alert>
            )}

            <Divider sx={{ my: 3 }}>OU</Divider>

            <Button
              variant='outlined'
              fullWidth
              onClick={() => navigate('/login')}
            >
              Voltar para o Login
            </Button>

          </Box>
        </Grid>
      </Grid>
    </ReactRouterAppProvider>
  );
}