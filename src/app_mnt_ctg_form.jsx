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
import { useState } from 'react';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, updateDocument, updateDocumentsBatch, useMntUser } from './api';
import { useData } from './context';
import { ErrorDialog } from './shared';
import { useEffect } from 'react';
import { useDialogs } from '@toolpad/core';





const useCtgFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubItem = undefined
    let unsubCtg = undefined

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

    //category
    unsubCtg = fetchCollection(claims.merchantId, 'category', null,
      (category) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, category }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubItem?.();
      unsubCtg?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};







export default function CategoriaForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { fetching, error, claims } = useCtgFetcher();

  const { data } = useData();

  const dialogs = useDialogs();

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    status: z.boolean()
  });

  const {
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
      sequence: 0,
      status: true,
      template: 'DEFAULT',
    },
  });

  //submit do formulario
  const onSubmit = async (dataCategory) => {
    try {
      if (params.key !== '0') {
        await updateDocument(claims.merchantId, 'category', params.key, dataCategory);

        const documentsIds = data.mnt.item.filter((i) => i.categoryId === params.key)
          .flatMap((i) => i.items)
          .map(item => item.itemId);

        //atualiza items lote
        await updateDocumentsBatch(claims.merchantId, 'item', documentsIds, { category: { ...dataCategory } });

      } else {
        await addDocument(claims.merchantId, 'category', dataCategory);
      }


      navigate(-1);
    } catch (error) {
      console.log('error', error)
      await dialogs.open(ErrorDialog, { textError: 'dados inválidos' });
    }
  };

  //verifica edição ou novo
  useEffect(() => {
    if (params.key !== '0') {
      const category_editing = data.mnt.category.find((o) => o.categoryId === params.key);
      if (category_editing) {
        Object.keys(category_editing).forEach((key) => {
          setValue(key, category_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.category, setValue])

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
      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8, md: 6, lg: 4 }}>
            <TextField
              autoFocus
              fullWidth
              autoComplete='off'
              label='Nome da Categoria'
              size='small'
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>

          <Grid size={12} pl={0.5}>
            <Controller
              name='status'
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
