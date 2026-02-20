import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, updateDocument, useMntUser } from './api';
import { useData } from './context';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { translateError } from './utils/translateError';






const useKdsFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubItem = undefined
    let unsubKds = undefined

    //items
    unsubItem = fetchCollection(claims.merchantId, 'item', null,
      (data) => {
        const grouped = Object.values(
          data.reduce((acc, item) => {
            const { categoryId, name } = item.category;

            if (!acc[categoryId]) {
              acc[categoryId] = { categoryId, name, items: [] };
            }

            acc[categoryId].items.push(item);
            return acc;
          }, {})
        );

        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            item: [...grouped]
          }
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    //kds
    unsubKds = fetchCollection(claims.merchantId, 'kds', null,
      (kds) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, kds }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubItem?.();
      unsubKds?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};








export default function DisplayForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { fetching, error, claims } = useKdsFetcher();

  const { data } = useData();

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
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
      name: '',
    },
  });

  //submit do formulario
  const onSubmit = async (data) => {
    try {
      if (params.key !== '0') {
        await updateDocument(claims.merchantId, 'kds', params.key, data);
      } else {
        await addDocument(claims.merchantId, 'kds', data);
      }
      navigate(-1);
    } catch (error) {
      await dialogs.open(ErrorDialog, { textError: translateError(error) });
    }
  };

  //verifica edição ou novo
  useEffect(() => {
    if (params.key !== '0') {
      const kds_editing = data.mnt.kds.find((o) => o.kdsId === params.key);
      if (kds_editing) {
        Object.keys(kds_editing).forEach((key) => {
          setValue(key, kds_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.kds, setValue])

  if (fetching) return <></>

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container spacing={2} direction={'column'}>
      <Box component='form' onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container p={0} spacing={2}>
          <Grid size={{ xs: 12, sm: 8, md: 6, lg: 4 }}>
            <TextField
              autoFocus
              fullWidth
              autoComplete='off'
              label='Nome do Display'
              size='small'
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
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
