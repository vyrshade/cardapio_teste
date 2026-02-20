import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
  FormGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { listenAdmConfigDoc, updateAdmConfigDoc } from './api';
import { useData } from './context';
import { NumericFormat } from 'react-number-format';
import { useState } from 'react';
import { useEffect } from 'react';





const useModFetcher = () => {
  const { setData } = useData();
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = listenAdmConfigDoc(
      data => {
        setData(state => ({
          ...state,
          adm: {
            ...state.adm,
            ...data
          }
        }));
        setFetching(false);
      },
      err => {
        setError(err);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);


  return { fetching, error };
};







export default function ModuloForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { fetching, error } = useModFetcher();

  const { data } = useData();

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
    monthlyAmount: z.preprocess(
      value => value === '' || value === null ? undefined : Number(value),
      z.number({
        required_error: 'Informe o valor'
      })/* .min(0, 'O valor deve ser 0 ou maior') */
    ),
    testDays: z.preprocess(
      value => value === '' || value === null ? undefined : Number(value),
      z.number({
        required_error: 'Informe o valor'
      })/* .min(0, 'O valor deve ser 0 ou maior') */
    ),
    enabled: z.boolean(),
  });

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      name: '',
      monthlyAmount: 0,
      testDays: 0,
      enabled: false,
    },
  });


  const onSubmit = async (item) => {

    try {
      const updated = data.adm.module.map(m =>
        m.moduleId === Number(params.key)
          ? { ...m, ...item }
          : m
      );

      await updateAdmConfigDoc({
        module: updated,
      });

      navigate(-1);

    } catch (err) {
      console.error(err);
    }
  };




  //verifica edição ou novo
  React.useEffect(() => {
    if (params.key !== '0') {
      const module_editing = data.adm.module.find((m) => m.moduleId === Number(params.key));

      if (module_editing) {
        Object.keys(module_editing).forEach((key) => {
          setValue(key, module_editing[key]);
        });
      }
    }
  }, [params.key, data.adm.module, setValue])

  if (fetching) return <></>

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  )

  return (
    <Grid container spacing={2} direction={'column'}>
      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid container size={{ xs: 12, sm: 8, md: 9, lg: 8 }}>
            <Grid size={{ xs: 12, md: 10, lg: 8 }}>
              <TextField
                autoFocus
                fullWidth
                autoComplete='off'
                label='Nome'
                size='small'
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 10, lg: 8 }}>
              <TextField
                fullWidth
                multiline
                autoComplete='off'
                label='Descrição'
                size='small'
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Grid>

            <Grid container size={{ xs: 12, md: 10, lg: 8 }}>
              <Grid size={{ xs: 12, md: 6, lg: 6 }}>
                <Controller
                  name='monthlyAmount'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <NumericFormat
                      fullWidth
                      customInput={TextField}
                      prefix='R$ '
                      thousandSeparator='.'
                      decimalSeparator=','
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      size='small'
                      type='tel'
                      autoComplete='off'
                      label='Preço'
                      value={field.value ?? ''}
                      error={!!errors?.monthlyAmount}
                      helperText={errors?.monthlyAmount?.message}
                      onValueChange={({ floatValue }) => {
                        field.onChange(floatValue ?? null);
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 6 }}>
                <TextField
                  fullWidth
                  type='tel'
                  autoComplete='off'
                  label='Teste (dias)'
                  size='small'
                  {...register('testDays')}
                  error={!!errors.testDays}
                  helperText={errors.testDays?.message}
                />
              </Grid>
            </Grid>

            <Grid size={12} pl={0.5}>
              <Controller
                name='enabled'
                control={control}
                render={({ field }) => (
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label='Ativo'
                    />
                    {errors.status && (
                      <Typography variant='caption' color='error'>
                        {errors.status.message}
                      </Typography>
                    )}
                  </FormGroup>
                )}
              />

            </Grid>
          </Grid>

          <Grid container size={12} spacing={2}>
            <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
              <Button
                fullWidth
                type='submit'
                variant='contained'
                disabled={isSubmitting}
              >
                Salvar
              </Button>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
              <Button
                fullWidth
                variant='contained'
                color='secondary'
                onClick={() => navigate(-1)}
              >
                Voltar
              </Button>
            </Grid>

            <Grid size={12}>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Grid>
  );
}