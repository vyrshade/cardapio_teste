import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Grid } from '@mui/system';
import { fetchCollection, updateMerchant, useMntUser } from './api';
import { useData } from './context';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useEffect } from 'react';
import { Check, HourglassTop, Search } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { translateEvent } from './utils/translateEvent';
import { useDialogs } from '@toolpad/core';
import { Timestamp } from 'firebase/firestore';





function UrlContentModal({ open, onClose, url }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
      <DialogContent sx={{ p: 0 }}>
        <iframe
          src={url}
          style={{
            width: '100%',
            height: '75vh',
            border: 'none',
          }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 1 }}>
        <Button onClick={onClose} color='primary'>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}






const useAccFetcher = () => {
  const { setData, data } = useData();
  const { loading, claims, user } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'event',
      null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            adm: {
              ...state.mnt.adm,
              payment: [...data]
            }
          }
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



  useEffect(() => {
    if (!data?.customerId || !user) return;

    //busca assinaturas
    const onGetSubscriptions = async () => {

      try {
        const token = await user.getIdToken();

        //chamada api
        const resposta = await fetch(`${import.meta.env.VITE_API_URL}/acc/subscriptions/${data.customerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!resposta.ok) {
          const errorData = await resposta.json();

          throw Object.assign(new Error('Erro ao buscar assinaturas:'), {
            ...errorData
          });
        }

        const response = await resposta.json();

        if (response?.data) {
          //atualiza o estado
          setData((state) => ({
            ...state,
            mnt: {
              ...state.mnt,
              adm: {
                ...state.mnt.adm,
                subscription: [...response.data]
              }
            }
          }));
        }


      } catch (error) {
        console.log("error", error);
      }
    };

    onGetSubscriptions();

  }, [setData, data.customerId, user, data.mnt.adm.payment.length]);

  return { fetching: loading || fetching, error, claims, user };
};





//rever nome
export default function Assinatura() {

  const { data, setData } = useData();

  const { fetching, error, claims, user } = useAccFetcher();

  const [selectedUrl, setSelectedUrl] = useState(null)

  const [open, setOpen] = useState(false)

  const [submitting, setSubmitting] = useState({});
  const [submittingCancel, setSubmittingCancel] = useState({});

  const dialogs = useDialogs();

  const abrirModal = (url) => {
    setSelectedUrl(url)
    setOpen(true)
  }

  //submit iniciar teste
  const onInitTest = async (module) => {

    try {

      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + module.testDays);

      const updatedModule = {
        ...module,
        enabled: true,
        testDueDate: Timestamp.fromDate(baseDate),
        subscriptionInactivated: false,
      };

      const newArray = data.module.map(t =>
        t.moduleId === module.moduleId ? updatedModule : t
      );

      await updateMerchant(claims.merchantId, { module: newArray })

    } catch (error) {
      console.log("error", error);

    } finally {
      //setSubmiting(false);
    }
  };

  //submit criar assinatura
  const onSubmit = async (moduleId, description) => {

    setSubmitting(prev => ({ ...prev, [moduleId]: true }));

    try {

      const token = await user.getIdToken();

      //chamada api
      const resposta = await fetch(`${import.meta.env.VITE_API_URL}/acc/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId: claims.merchantId,
          billingType: 'UNDEFINED',
          moduleId: moduleId,
          description: description
        }),
      });

      if (!resposta.ok) {
        const errorData = await resposta.json();

        throw Object.assign(new Error('Erro ao criar assinatura:'), {
          ...errorData
        });
      }

      await resposta.json();

      //delay para aguardar o webhook
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.log("error", error);

    } finally {
      setSubmitting(prev => ({ ...prev, [moduleId]: false }));
    }
  };





  //submit criar assinatura
  const cancelarAssinatura = async (moduleId, subscriptionId) => {

    const confirmed = await dialogs.confirm('Deseja realmente cancelar sua assinatura?', {
      okText: 'Sim',
      cancelText: 'Não',
      title: <Alert severity='error' variant='filled'>ATENÇÂO</Alert>,
      severity: 'info',
    });
    if (confirmed) {

      setSubmittingCancel(prev => ({ ...prev, [moduleId]: true }));

      try {

        const token = await user.getIdToken();

        //chamada api
        const resposta = await fetch(`${import.meta.env.VITE_API_URL}/acc/subscriptions/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: 'INACTIVE'
          }),
        });

        if (!resposta.ok) {
          const errorData = await resposta.json();

          throw Object.assign(new Error('Erro ao cancelar assinatura:'), {
            ...errorData
          });
        }

        const subs_inactivated = await resposta.json();

        //delay para aguardar o webhook
        //await new Promise(resolve => setTimeout(resolve, 5000));

        const newArray = data.module.map(t =>
          t.moduleId === moduleId ? { ...t, enabled: false, subscriptionInactivated: true } : t
        );

        await updateMerchant(claims.merchantId, { module: newArray })

        setData((state) => {
          const subscription = state.mnt.adm.subscription.map((item) =>
            item.id === subs_inactivated.id ? { ...subs_inactivated } : item
          );

          return {
            ...state,
            mnt: {
              ...state.mnt,
              adm: {
                ...state.mnt.adm,
                subscription
              }
            }
          };
        });


      } catch (error) {
        console.log("error", error);

      } finally {
        setSubmittingCancel(prev => ({ ...prev, [moduleId]: false }));
      }


    }

  };


  const subscriptions = data.mnt.adm.subscription;

  const events = data.mnt.adm.payment
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  )

  return (
    <Grid container spacing={2}>

      <UrlContentModal
        open={open}
        onClose={() => setOpen(false)}
        url={selectedUrl}
      />


      <Grid size={12}>
        <Stack spacing={2}>
          {
            data.module?.map((m) => {

              //foi cancelado
              if (m.subscriptionInactivated) {

                const subscription = subscriptions.find(s => s.id === m.subscriptionId);

                if (!subscription) return <LinearProgress key={m.moduleId} />

                return (
                  <Card key={m.moduleId} variant='outlined' sx={{ width: '100%' }}>
                    <CardContent>
                      <Grid container justifyContent={'space-between'}>
                        <Stack>
                          <Typography fontSize='1rem' color='textPrimary'>
                            <b>{m.name}</b>
                          </Typography>
                          <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
                            Status
                          </Typography>
                          <Typography variant="h5" component="div">
                            {translateEvent(subscription.status)}
                          </Typography>
                        </Stack>
                      </Grid>
                    </CardContent>
                  </Card>
                )
              }



              //é cobrado
              if (m.monthlyAmount > 0 && m.enabled) {


                //tem assinatura
                if (m.subscriptionId) {

                  const subscription = subscriptions.find(s => s.id === m.subscriptionId);

                  const payments = events.filter(p => p.payment.subscription === m.subscriptionId);

                  const lastPayment = payments.length ? payments[0] : null

                  const invoiceUrl = lastPayment ? lastPayment.payment.invoiceUrl : null;

                  if (!subscription) return <LinearProgress key={m.moduleId} />

                  return (
                    <Card key={m.moduleId} variant='outlined' sx={{ width: '100%' }}>
                      <CardContent>
                        <Grid container justifyContent={'space-between'}>
                          <Stack>
                            <Typography fontSize='1rem' color='textPrimary'>
                              <b>{m.name}</b>
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 2 }}>
                              Status
                            </Typography>
                            <Typography variant="h5" component="div">
                              {m.enabled ? 'ATIVO' : translateEvent(subscription.status)}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                              {format(new Date(parseISO(subscription.dateCreated)), 'dd/MM/yyyy')}
                            </Typography>
                              {subscription.billingType !== 'UNDEFINED' && (
                                <Typography variant="body2" sx={{ mb: 0.5, mt: 1.5}}>
                                  Assinatura mensal recorrente
                                </Typography>
                              )}
                            <Typography variant="body2">
                              Próxima Cobrança:
                              <br />
                              {format(new Date(parseISO(subscription.nextDueDate)), 'dd/MM/yyyy')}
                            </Typography>
                          </Stack>

                          <Stack>
                            <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
                            {`Forma de pagamento atual: ${subscription.billingType === 'UNDEFINED' ? 'Boleto / Pix' : translateEvent(subscription.billingType)}`}
                            </Typography>
                            {
                              subscription.billingType === 'UNDEFINED' && invoiceUrl &&
                              <Button
                                variant='contained'
                                onClick={() => {
                                  window.open(invoiceUrl, '_blank')
                                }}
                              >
                                Alterar forma de pagamento
                              </Button>
                            }
                          </Stack>
                        </Grid>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() => cancelarAssinatura(m.moduleId, subscription.id)}
                          loading={submittingCancel[m.moduleId]}
                        >
                          Cancelar
                        </Button>
                      </CardActions>
                    </Card>
                  )
                }


                //esta em teste
                return (
                  <Card key={m.moduleId} variant='outlined' sx={{ width: '100%' }}>
                    <CardContent>
                      <Grid container direction={'column'} spacing={1}>
                        <Typography fontSize='1rem' color='textPrimary'>
                          <b>{m.name}</b>
                        </Typography>
                        <Typography fontSize='1rem' color='textPrimary'>
                          {`Teste habilitado sem custos até o dia `}
                          <b>{format(new Date(m.testDueDate.seconds * 1000), 'dd/MM/yyyy')}</b>
                        </Typography>

                        <Typography variant='body2' fontSize='1rem' color='textPrimary'>
                          {`Ao iniciar a assinatura será gerada uma cobrança de `}
                          <b>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(m.monthlyAmount)}
                          </b>{' '}
                          {`com vencimento para `}
                          <b>
                            {format(
                              new Date(m.testDueDate.seconds * 1000),
                              'dd/MM/yyyy'
                            )}
                          </b>
                        </Typography>
                      </Grid>
                    </CardContent>

                    <CardActions>
                      <Button
                        variant='contained'
                        onClick={() => onSubmit(m.moduleId, `Peça já # ${m.name}`)}
                        loading={submitting[m.moduleId]}
                      >
                        Iniciar assinatura
                      </Button>
                    </CardActions>
                  </Card>
                )
              }

              //NAO é cobrado
              if (m.monthlyAmount === 0 && m.enabled) {

                return (
                  <Card key={m.moduleId} variant='outlined' sx={{ width: '100%' }}>
                    <CardContent>
                      <Grid container direction={'column'} spacing={1}>
                        <Typography fontSize='1rem' color='textPrimary'>
                          <b>{m.name}</b>
                        </Typography>
                        <Typography fontSize='1rem' color='textPrimary'>
                          {`Uso gratuito`}
                        </Typography>
                      </Grid>
                    </CardContent>
                  </Card>
                )
              }

              //É cobrado e esta desabilitado (pode iniciar teste)
              if (m.monthlyAmount > 0 && !m.enabled) {
                return (
                  <Card key={m.moduleId} variant='outlined' sx={{ width: '100%' }}>
                    <CardContent>
                      <Grid container direction={'column'} spacing={1}>
                        <Typography fontSize='1rem' color='textPrimary'>
                          <b>{m.name}</b>
                        </Typography>
                        <Typography fontSize='1rem' color='textPrimary'>
                          {m.description}
                        </Typography>
                      </Grid>
                    </CardContent>


                    <CardActions>
                      <Button
                        //variant='contained'
                        onClick={() => onInitTest(m)}
                      //loading={submiting}
                      >
                        Iniciar teste
                      </Button>
                    </CardActions>
                  </Card>
                )
              }

            })
          }
        </Stack>
      </Grid>



      <Grid container size={12} mt={2}>
        {!!data.mnt.adm.payment.length &&
          <TableContainer component={Paper} elevation={0}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Pagamento</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Cobrança</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.mnt.adm.payment
                  .filter(e => e.event !== 'SUBSCRIPTION_CREATED' && e.event !== 'SUBSCRIPTION_INACTIVATED')
                  .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
                  .filter((item, index, self) => index === self.findIndex(i => i.payment.id === item.payment.id))
                  .map((row) => {

                    const value = row.payment.value;
                    const dueDate = format(new Date(parseISO(row.payment.originalDueDate)), 'dd/MM/yyyy');
                    const status = row.payment.status;
                    let url = row.payment.bankSlipUrl;
                    let billingType = row.payment.billingType;


                    //STATUS PAYMENT_OVERDUE VIRA DA INTEGRAÇÃO, DECIDIR SE BLOQUEIA
                    const vencido = new Date() > new Date(parseISO(row?.payment.originalDueDate)) && status === 'PENDING';


                    return (
                      <TableRow key={row.eventId}
                        sx={{ '& > *': { borderBottom: 'unset' } }}
                      >
                        <TableCell>
                          {
                            status === 'RECEIVED' || status === 'CONFIRMED' ?
                              <Check color='success' />
                              :
                              billingType === 'CREDIT_CARD' ?
                                <HourglassTop color='primary' />
                                :
                                <Typography
                                  onClick={() => abrirModal(url)}
                                  sx={{
                                    color: '#104fd8',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontSize: '0.90rem'
                                  }}
                                >
                                  Pagar
                                </Typography>
                          }
                        </TableCell>
                        <TableCell>
                          {translateEvent(row.event)}
                        </TableCell>
                        <TableCell>
                          {dueDate}
                        </TableCell>
                        <TableCell>
                          <Typography color={vencido ? 'error' : 'textPrimary'}>
                            {translateEvent(status)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        }

      </Grid>
    </Grid>
  );
}
