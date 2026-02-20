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
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, resizeToThumbnail, updateDocument, uploadImage, useMntUser } from './api';
import { useData } from './context';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { NumericFormat } from 'react-number-format';
import { useState } from 'react';
import { useEffect } from 'react';



const useOptFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'option',
      null,
      (data) => {
        setData((prev) => ({
          ...prev,
          mnt: {
            ...prev.mnt,
            option: data,
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










export default function ComplementoForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { fetching, error, claims } = useOptFetcher();

  const { data } = useData();

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    optionGroup: z.object({}).optional(),
    /* price: z.object({
      value: z.number({ required_error: 'Preço é obrigatório' })
        .min(0.01, 'Preço deve ser maior que zero'),
    }), */
    price: z.object({
      value: z.number()
    }),
    imagePath: z.string().optional(),
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
      //optionGroup: {},
      optionGroup: {
        optionGroupId: 'All',
        name: 'All'
      },
      price: {
        value: 0,
      },
      imagePath: ''
    },
  });

  //submit do formulario
  const onSubmit = async (data) => {
    try {
      if (params.key !== '0') {
        await updateDocument(claims.merchantId, 'option', params.key, data);
      } else {
        await addDocument(claims.merchantId, 'option', data);
      }
      navigate(-1);
    } catch (error) {
      console.log('error', error)
      await dialogs.open(ErrorDialog, { textError: 'dados inválidos' });
    }
  };

  const handleFileChange = async (e) => {
    const image = e.target.files[0];
    if (!image) return;

    try {
      const thumbnail = await resizeToThumbnail(image, 200);

      const path = `${image.name}`;

      const imageUrl = await uploadImage(claims.merchantId, thumbnail, path, (p) => console.log(p));

      setValue('imagePath', imageUrl);
    } catch (err) {
      console.error('Erro ao gerar thumbnail:', err);
    }
  };

  //verifica edição ou novo
  React.useEffect(() => {
    if (params.key !== '0') {
      const option_editing = data.mnt.option.find((o) => o.optionId === params.key);

      if (option_editing) {
        Object.keys(option_editing).forEach((key) => {
          setValue(key, option_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.option, setValue])

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

          <Grid container size={{ xs: 12, sm: 4, md: 3, lg: 4 }}>
            <Paper variant='outlined'
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'space-around',
                border: (theme) => `1px solid ${theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.23)'
                  : 'rgba(255, 255, 255, 0.23)'}`,
                p: 1
              }}
            >
              <Button
                fullWidth
                variant='text'
                component='label'
                startIcon={<CloudUploadIcon />}
              >
                Imagem
                <input type='file' hidden onChange={handleFileChange} accept='image/*' />
              </Button>

              {
                watch('imagePath') &&
                <img
                  src={watch('imagePath')}
                  alt='foto do produto'
                  style={{
                    width: '100%',
                    maxWidth: '176px',
                    maxHeight: '176px',
                    objectFit: 'contain',
                  }}
                />
              }
            </Paper>
          </Grid>

          <Grid container size={{ xs: 12, sm: 8, md: 9, lg: 8 }} alignContent={'start'} direction={'column'}>
            <Grid size={{ xs: 12, md: 10, lg: 6 }}>
              <TextField
                fullWidth
                autoComplete='off'
                label='Nome do Complemento'
                size='small'
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>

            {/* <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
              <Autocomplete
                disablePortal
                options={data.mnt.optionGroup}
                getOptionLabel={(c) => c?.name || ''}
                value={watch('optionGroup') || null}
                onChange={(_, value) => {
                  setValue('optionGroup', value, { shouldValidate: true });
                }}
                renderInput={
                  (params) =>
                    <TextField
                      {...params}
                      fullWidth
                      autoComplete='off'
                      label='Grupo do Complemento'
                      size='small'
                      error={!!errors.optionGroup}
                      helperText={errors.optionGroup?.message}
                    />
                }
              />
            </Grid> */}

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Controller
                name='price.value'
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
                    error={!!errors?.price?.value}
                    helperText={errors?.price?.value?.message}
                    onValueChange={({ floatValue }) => {
                      field.onChange(floatValue ?? null);
                    }}
                  />
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