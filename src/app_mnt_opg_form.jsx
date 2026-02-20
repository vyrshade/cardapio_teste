import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, updateDocument } from './api';
import { useData } from './context';










const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {

    const unsubscribe = fetchCollection('optionGroup', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            optionGroup: [...data]
          }
        }));

        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);

  if (loading) return null;
  if (error) return <div>Error: {error.message}</div>;

  return null;
};






const schema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
});







export default function ComplementoGrupoForm() {

  const params = useParams();

  const navigate = useNavigate();

  const [successMessage, setSuccessMessage] = useState('');

  const { data } = useData();

  const {
    watch,
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

    if (params.key !== '0') {
      await updateDocument('optionGroup', params.key, data);
      setSuccessMessage('Grupo de complementos atualizado com sucesso!');

    } else {
      await addDocument('optionGroup', data);
      setSuccessMessage('Grupo de complementos cadastrado com sucesso!');
    }

  };



  //verifica edição ou novo
  React.useEffect(() => {
    if (params.key !== '0') {
      const optionGroup_editing = data.mnt.optionGroup.find((o) => o.optionGroupId === params.key);

      if (optionGroup_editing) {
        Object.keys(optionGroup_editing).forEach((key) => {
          setValue(key, optionGroup_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.optionGroup, setValue])





  return (
    <Grid container p={0} spacing={2} direction={'column'}>
      <DataFetcher />

      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container p={0} spacing={2}>
          <Grid size={4}>
            <TextField
              fullWidth
              autoComplete='off'
              label='Nome do Grupo de complementos'
              size='small'
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>

          <Grid container size={12} gap={1} mt={2}>
            <Button
              type='submit'
              variant='contained'
              disabled={isSubmitting}
            >
              Salvar
            </Button>

            <Button
              variant='contained'
              color='secondary'
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
          </Grid>
        </Grid>
      </Box>

      {successMessage && <Alert severity='success'>{successMessage}</Alert>}
    </Grid>
  );
}
