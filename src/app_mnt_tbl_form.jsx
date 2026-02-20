import {
  Alert,
  Box,
  Button,
  TextField,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { useData } from './context';
import { addDocument, fetchCollection, updateDocument, useMntUser } from './api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { translateError } from './utils/translateError';






const useTblFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'table',
      null,
      (data) => {
        const range = data.length ? data[0] : { numStart: 0, numEnd: 0 };

        setData((prev) => ({
          ...prev,
          mnt: {
            ...prev.mnt,
            table: range,
          },
        }));

        setFetching(false);
      },
      (err) => {
        setError(err);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  return { fetching: loading || fetching, error, claims };
};




export default function MesaForm() {

  const params = useParams();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const { data } = useData();

  const { fetching, error, claims } = useTblFetcher();

  //validacao  
  const schema = z
    .object({
      numStart: z.preprocess((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        return Number(val);
      },
        z.number({
          required_error: 'Campo obrigatório',
          invalid_type_error: 'Apenas números',
        }).min(1, 'Mínimo de 1')),

      numEnd: z.preprocess((val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        return Number(val);
      },
        z.number({
          required_error: 'Campo obrigatório',
          invalid_type_error: 'Apenas números',
        }).min(1, 'Mínimo de 1')),
    })
    .refine((data) => data.numStart <= data.numEnd, {
      message: 'Menor ou igual final',
      path: ['numStart'],
    });


  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      numStart: undefined,
      numEnd: undefined
    },
  });

  //submit do formulario
  const onSubmit = async (data) => {
    try {
      if (params.key !== '0') {
        await updateDocument(claims.merchantId, 'table', params.key, data);
      } else {
        await addDocument(claims.merchantId, 'table', data);
      }
      navigate(-1);
    } catch (error) {
      await dialogs.open(ErrorDialog, { textError: translateError(error) });
    }
  };

  //verifica edição ou novo
  useEffect(() => {
    if (params.key !== '0') {
      const table_editing = data.mnt.table;

      Object.keys(table_editing).forEach((key) => {
        setValue(key, table_editing[key]);
      });
    }
  }, [params.key, data.mnt.table, setValue])

  if (fetching) return <></>

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container p={0} spacing={2} direction={'column'}>
      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container p={0} spacing={2}>
          <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
            <TextField
              fullWidth
              type='tel'
              autoComplete='off'
              label='Mesa inicial'
              size='small'
              {...register('numStart')}
              error={!!errors.numStart}
              helperText={errors.numStart?.message}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
            <TextField
              fullWidth
              type='tel'
              autoComplete='off'
              label='Mesa final'
              size='small'
              {...register('numEnd')}
              error={!!errors.numEnd}
              helperText={errors.numEnd?.message}
            />
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
          </Grid>
        </Grid>
      </Box>
    </Grid>
  );
}
