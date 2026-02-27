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
  Typography
} from '@mui/material';
import { useState } from 'react';
import { Grid } from '@mui/system';
import { addDocument, login, SYS_ORDER_STATUS } from './api';
import { IMaskInput } from 'react-imask';



const schema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  password: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  cnpj: z.string().optional(),
  isMerchantAdmin: z.boolean(),
  type: z.string(),
});




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



export default function LoginChange() {

  const [successMessage, setSuccessMessage] = useState('');

  const [sent, setSent] = useState(false);

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
      cnpj: '',
      isMerchantAdmin: true,
      type: 'adm'
    },
  });



  //submit do formulario
  const onSubmit = async (data) => {
    try {

      const auth = getAuth();

      await sendPasswordResetEmail(auth, data.email);

      setSuccessMessage('Enviamos em seu e-mail o link de recuperação de acesso!');

      setSent(true);

    } catch (erro) {
      console.error('Erro ao tentar recuperar acesso:', erro);
    }
  };



  return (
    <Grid container
      sx={{
        height: '100vh',
        width: '100vw',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Grid container size={{ xs: 12, md: 6 }}>


          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: 1,
              p: 4,
              width: '100%'
            }}
          >

            <Grid container size={12} p={2} spacing={2} mt={4}>
              <Grid size={12}>
                <Typography variant='h6' mb={2}>{sent ? 'Dados recebidos' : 'Para recuperar o acesso informe dados básicos'}</Typography>
              </Grid>

              <Grid size={6}>
                <Controller
                  name="cnpj"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="CNPJ / CPF"
                      size="small"
                      InputProps={{
                        inputComponent: CnpjMask,
                      }}
                      error={!!errors.cnpj}
                      helperText={errors.cnpj?.message}
                      disabled={sent}
                    />
                  )}
                />
              </Grid>


              <Grid size={6}>
                <TextField
                  fullWidth
                  autoComplete='off'
                  label='Email'
                  size='small'
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={sent}
                  required
                />
              </Grid>
              {/* 
              <Grid size={6}>
                <TextField
                  fullWidth
                  autoComplete='off'
                  label='Senha'
                  size='small'
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={sent}
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
              </Grid>

              <Grid size={6}>
                <TextField
                  fullWidth
                  autoComplete='off'
                  label='Confirmar senha'
                  size='small'
                  type={showPassword ? 'text' : 'password'}
                  //onChange={(e) => setPassword(e.target.value)}
                  disabled={sent}
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
              </Grid>
 */}
              <Grid container size={12} gap={1} mt={2}>
                <Button
                  fullWidth
                  variant='contained'
                  color='info'
                  disabled={isSubmitting || sent}
                  onClick={handleSubmit(onSubmit)}
                >
                  Enviar
                </Button>
              </Grid>

              {successMessage && <Alert severity='success' sx={{ width: '100%' }}>{successMessage}</Alert>}
            </Grid>
          </Paper>

        </Grid>
      </Box>
    </Grid>
  );
}











