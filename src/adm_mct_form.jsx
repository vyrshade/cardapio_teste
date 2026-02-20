import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Grid } from '@mui/system';
import { Outlet, useNavigate, useParams } from 'react-router';
import { fetchMerchants, fetchPayments, updateMerchant, useAdmUser } from './api';
import { useData } from './context';





const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const params = useParams();

  React.useEffect(() => {

    const unsubscribe = fetchMerchants(null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          adm: {
            ...state.adm,
            mct: [...data]
          }
        }));

        //setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);


  React.useEffect(() => {
    //PROVSORIO LIMPAR 
    //atualiza o estado
    setData((state) => ({
      ...state,
      adm: {
        ...state.adm,
        payment: []
      }
    }));

    const unsubscribe = fetchPayments({ 'payment.externalReference': params.key },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          adm: {
            ...state.adm,
            payment: [...data]
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



  if (loading) return null
  if (error) return <div>Error: {error.message}</div>;

  return null;
};







const schema = z.object({
  //name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  module: z.array(z.any()),
});




export default function MerchantForm() {

  const params = useParams();

  const navigate = useNavigate();

  const { data } = useData();

  const { user } = useAdmUser();

  const {
    setValue,
    getValues,
    watch,
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      name: '',
      module: []
    },
  });




  //submit do formulario
  const onSubmit = async (newData) => {
    if (params.key !== '0') {

      const token = await user.getIdToken();

      //const module_editing = data.adm.mct.find((o) => o.merchantId === params.key)?.module;

      //REVER para mandar apenas se valor mudou..

      for (let i = 0; i < newData.module.length; i++) {
        const module = newData.module[i];

        if (module.subscriptionId && module.monthlyAmount) {

          //chamada api
          const resposta = await fetch(`${import.meta.env.VITE_API_URL}/acc/subscriptions/${module.subscriptionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              updatePendingPayments: true,
              value: module.monthlyAmount
            }),
          });

          if (!resposta.ok) {
            const errorData = await resposta.json();

            throw Object.assign(new Error('Erro ao cancelar assinatura:'), {
              ...errorData
            });
          }

          await resposta.json();

        }

      }

      await updateMerchant(params.key, newData);

      if (!!params.moduleId) {
        navigate(-2);
      } else {
        navigate(-1);
      }
    }
  };


  //verifica edição ou novo
  React.useEffect(() => {
    if (params.key !== '0') {
      const merchant_editing = data.adm.mct.find((o) => o.merchantId === params.key);
      if (merchant_editing) {
        Object.keys(merchant_editing).forEach((key) => {
          setValue(key, merchant_editing[key]);
        });
      }
    }
  }, [params.key, data.adm.mct, setValue])


  return (
    <Grid container>
      <DataFetcher />

      <Box component='form' onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2} rowSpacing={1}>

          <Grid size={4}>
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom>
                Nome do Estabelecimento
              </Typography>
              <Box
                sx={{
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body1' color='text.secondary'>
                  {watch('name')}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={3}>
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom>
                CNPJ
              </Typography>
              <Box
                sx={{
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body1' color='text.secondary'>
                  {watch('cnpj')}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={3}>
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom>
                Cadastro
              </Typography>
              <Box
                sx={{
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body1' color='text.secondary'>
                  {new Date(watch('createdAt')?.seconds * 1000).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={10}>
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom>
                Login do Administrador
              </Typography>
              <Box
                sx={{
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body1' color='text.secondary'>
                  {watch('email')}
                </Typography>
              </Box>
            </Box>
          </Grid>


          <Grid size={12}>
            <Outlet
              context={{
                register,
                control,
                watch,
                setValue,
                getValues,
                errors,
              }}
            />
          </Grid>

          <Grid container size={12} gap={1} mt={2}>
            <Button
              type='submit'
              variant='contained'
              loading={isSubmitting}
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
      </Box >
    </Grid >
  );
}
