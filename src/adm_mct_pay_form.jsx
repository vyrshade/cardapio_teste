import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
  Autocomplete,
} from '@mui/material';
import { useState } from 'react';
import { Grid } from '@mui/system';
import { useNavigate, useParams } from 'react-router';
import { addPayment, fetchMerchants, fetchPayments, updatePayment } from './api';
import { useData } from './context';
import { NumericFormat } from 'react-number-format';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';






const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const params = useParams();

  React.useEffect(() => {
    //////////////////////////////////////////////////////////////////////filtrar
    const unsubscribe = fetchPayments(null,
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
  }, [setData, params.key]);



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
  merchantId: z.string().min(3, 'Id inválido'),
  cnpj: z.string().min(3, 'Cnpj inválido'),
  date: z.date().optional(),
  value: z.number().refine((e) => e > 0),
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
});







export default function PagamentoForm() {

  const navigate = useNavigate();

  const [successMessage, setSuccessMessage] = useState('');

  const { data } = useData();

  const params = useParams();

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
      merchantId: '',
      cnpj: '',
      date: '',
      value: 0,
      description: 'Mensalidade',
    },
  });



  //submit do formulario
  const onSubmit = async (data) => {

    if (params.key !== '0') {
      await updatePayment(params.key, data);
      setSuccessMessage('Pagamento atualizado com sucesso!');

    } else {
      await addPayment(data);
      setSuccessMessage('Pagamento informado com sucesso!');
    }

  };




  function formatarCnpj(cnpj) {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }





  //verifica edição ou novo
  React.useEffect(() => {
    if (params.key !== '0') {
      const payment_editing = data.adm.payment.find((o) => o.paymentId === params.key);
      if (payment_editing) {
        Object.keys(payment_editing).forEach((key) => {
          setValue(key, payment_editing[key]);
        });
        setValue('date', new Date(payment_editing.date.seconds * 1000));
        setValue('cnpj', payment_editing.cnpj);
      }
    }
  }, [params.key, data.adm.payment, data.adm.mct, setValue])

  return (
    <Grid container p={0} spacing={2} direction={'column'}>
      <DataFetcher />


      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container p={0} spacing={2}>


          <Grid size={3}>
            <Controller
              name="cnpj"
              control={control}
              defaultValue=""
              render={({ field }) => {
                const selectedOption = (data.adm.mct || []).find(
                  (opt) => opt.cnpj === field.value
                );
                return (
                  <Autocomplete
                    fullWidth
                    disablePortal
                    disabledItemsFocusable
                    options={data.adm.mct || []}
                    getOptionLabel={(option) => formatarCnpj(option?.cnpj || '')}
                    isOptionEqualToValue={(option, value) => option?.cnpj === value?.cnpj}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.cnpj);
                      setValue('merchantId', newValue.merchantId);
                      //setValue('name', `Mensalidade - ${newValue.email}`);
                    }}
                    value={selectedOption || null}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="CNPJ"
                        size="small"
                        fullWidth
                        error={!!errors.cnpj}
                        helperText={errors.cnpj?.message}
                      />
                    )}
                  />
                );
              }}
            />
          </Grid>

          <Grid size={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR} >
              <Controller
                name="date"
                control={control}
                defaultValue={null}
                render={({ field }) => (
                  <DatePicker
                    label="Data"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        error: !!errors.date,
                        helperText: errors.date?.message,
                      },
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>


          <Grid size={2}>
            <Controller
              name='value'
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
                  label='Valor'
                  value={field.value ?? ''}
                  error={!!errors?.value}
                  helperText={errors?.value?.message}
                  onValueChange={({ floatValue }) => {
                    field.onChange(floatValue ?? 0);
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={7}>
            <TextField
              fullWidth
              autoComplete='off'
              label='Descrição'
              size='small'
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
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


      </Box >

      {successMessage && <Alert severity='success'>{successMessage}</Alert>}
    </Grid >
  );
}
