import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Grid,
  FormGroup,
  Switch,
  Autocomplete,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, updateDocument, useMntUser } from './api';
import { useData } from './context';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'








const useUsrFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  let unsubKds = undefined

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

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


    const unsubscribe = fetchCollection(claims.merchantId, 'user', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            user: [...data]
          }
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubKds?.();
      unsubscribe();
    }
  }, [loading, claims, setData]);

  return { ...state, claims };
};









export default function UsuarioForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { data } = useData();

  const dialogs = useDialogs();

  const { fetching, error, claims } = useUsrFetcher();

  const kdsList = [{ name: 'Todas', id: '__all__' }, ...data.mnt.kds];

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    type: z.string().min(1, 'Tipo de acesso é obrigatório'),
    status: z.boolean(),
    kds: z.union([z.boolean(), z.object({
      kdsId: z.string(),
      name: z.string()
    })])

  });

  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      name: '',
      type: '',
      status: true,
      kds: false
    },
  });

  //submit do formulario
  const onSubmit = async (data) => {

    try {
      const merchantId = claims?.merchantId;

      if (!merchantId) throw new Error('id do estabelecimento não encontrado');

      if (params.key !== '0') {
        await updateDocument(merchantId, 'user', params.key, { ...data });

      } else {

        const newToken = uuidv4();

        await addDocument(merchantId, 'user', { ...data, token: newToken });
      }

      navigate(-1);
    } catch (error) {
      console.error('Erro ao criar Colaborador:', error.message);

      const err = error instanceof Error ? error.message : 'Erro desconhecido';
      const message = `Ocorreu um erro ao tentar cadastrar/atualizar o colaborador:\n\n${err}`;
      await dialogs.open(ErrorDialog, { textError: message });
    }

  };






  //verifica edição ou novo
  useEffect(() => {
    if (params.key !== '0') {
      const user_editing = data.mnt.user.find((o) => o.userId === params.key);

      if (user_editing) {
        Object.keys(user_editing).forEach((key) => {
          setValue(key, user_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.user, setValue])

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
              label='Nome'
              size='small'
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>

          <Grid size={12} pl={0.5}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl error={!!errors.type} disabled={params.key !== '0'}>
                  <FormLabel id="nivel-acesso-label">Nível de acesso</FormLabel>
                  <RadioGroup
                    aria-labelledby="nivel-acesso-label"
                    value={field.value}
                    onChange={field.onChange}
                  //row
                  >
                    {[
                      { id: 'adm', label: 'Acesso de Administrador' },
                      { id: 'kds', label: 'Acesso da Cozinha' },
                      { id: 'wtr', label: 'Acesso do Garçom' }
                    ].map((type) => (
                      <FormControlLabel
                        key={type.id}
                        value={type.id}
                        control={<Radio disabled={type.id === 'adm'} />}
                        label={type.label}
                      />
                    ))}
                  </RadioGroup>
                  {errors.type && (
                    <Typography variant="caption" color="error">
                      {errors.type.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {watch('type') === 'kds' &&
            <Grid size={{ xs: 12, sm: 8, md: 6, lg: 4 }}>
              <Controller
                name='kds'
                control={control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    //disabled={watch('type') !== 'kds'}
                    disablePortal
                    options={kdsList}
                    getOptionLabel={(c) => c?.name || ''}
                    value={field.value || kdsList[0]}
                    onChange={(_, value) => {
                      if (!value || value.id === '__all__') {
                        field.onChange(false);
                      } else {
                        field.onChange(value);
                      }
                    }}

                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label='Cozinha'
                        size='small'
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>
          }
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
        </Grid >
      </Box >
    </Grid >
  );
}
