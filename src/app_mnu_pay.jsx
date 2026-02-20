import {
  Alert,
  Box, Button, Grid, IconButton,
  LinearProgress,
  List, ListItem, Paper, Stack, Typography, Zoom
} from '@mui/material';
import * as React from 'react';
import { useData } from './context';
import { useNavigate, useParams } from 'react-router';
import { ArrowBack, Person, TableRestaurant } from '@mui/icons-material';
import { addDocument, fetchCollection, useAuthUser } from './api';
import { useState } from 'react';
import { useEffect } from 'react';
import { useDialogs } from '@toolpad/core';




const useMnuFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useAuthUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();

  useEffect(() => {
    if (loading || !params?.merchantId) return;

    const unsCheckout = fetchCollection(params.merchantId, 'checkout', { status: 'OPEN', 'tableId': Number(params.tableId) },
      (checkoutData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            checkout: [...checkoutData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    const unsubOrder = fetchCollection(params.merchantId,
      'order', { 'status': ['PLC', 'CFM', 'SPS', 'SPE', 'RTP', 'DIS'], 'table.tableId': Number(params.tableId) },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            order: [...data],
          }
        }));

        setState({ fetching: false, error: null });

      },
      (error) => {
        setError(error);
      }
    );

    return () => {
      unsCheckout();
      unsubOrder();
    };
  }, [loading, claims, setData, params.tableId]);

  return { ...state, claims, user };
};



export default function Conta() {
  const navigate = useNavigate();

  const { data } = useData();

  const itensSelecionados = data.mnu.order.length;

  const params = useParams();

  const [consumo, setConsumo] = useState([]);

  const [mostrarIndividual, setMostrarIndividual] = useState(true);

  const { fetching, error, user } = useMnuFetcher();

  const dialogs = useDialogs();



  // totaliza provisório
  const total = consumo
    .flatMap(t => t.customers.flatMap(c => c.items))
    .reduce((sum, item) => {
      const itemTotal = item.qty_order * item.price.value;

      const optionsTotal = item.options_selected
        ? item.options_selected.reduce((optionsSum, option) => {
          return optionsSum + option.count * option.price.value;
        }, 0)
        : 0;

      return sum + itemTotal + optionsTotal;
    }, 0);




  const disable_in_checkout = data.mnu.checkout
    .filter(f => f.status === 'OPEN' && f.tableId === Number(params.tableId))
    .flatMap(c => c.consumo)
    .flatMap(c => c.customers)
    .some(c => c.customer.uid === user?.uid)


  //fechar conta chamando o garçom
  const handleFecharConta = async () => {


    const [{ table }] = consumo;

    const qt_checkout = consumo.flatMap(c => c.customers);

    for (let c = 0; c < qt_checkout.length; c++) {
      const element = qt_checkout[c];

      await addDocument(params.merchantId, 'checkout', {
        tableId: Number(params.tableId),
        status: 'OPEN',
        createddAt: new Date(),
        consumo: [{ table, customers: [{ ...element }] }]
      })

    }

    await dialogs.alert('Obrigado!', { title: 'Garçom solicitado' });

  }




  useEffect(() => {

    const grouped = Object.values(
      data.mnu.order.reduce((acc, item) => {
        const tableId = item.table.tableId;
        const customerId = item.customer.uid;

        if (!acc[tableId]) {
          acc[tableId] = { table: item.table, customers: {} };
        }

        if (!acc[tableId].customers[customerId]) {
          acc[tableId].customers[customerId] = { customer: item.customer, items: [] };
        }

        acc[tableId].customers[customerId].items.push(item);

        return acc;
      }, {})
    ).map(tableGroup => ({
      table: tableGroup.table,
      customers: Object.values(tableGroup.customers)
    }));


    if (mostrarIndividual) {
      const consumoIndividual = grouped
        .map(g => ({
          ...g,
          customers: g.customers?.filter(c => c.customer?.uid === user?.uid) ?? []
        }))
        .filter(g => g.customers.length > 0);

      setConsumo(consumoIndividual)
    } else {

      setConsumo(grouped)
    }

  }, [data.mnu.order, mostrarIndividual, user])




  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container
      sx={{
        p: 1,
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'space-between'
      }}
    >

      <Grid container direction={'column'} spacing={2}>

        <Paper variant='outlined'>
          <Grid container alignItems={'center'}>
            <IconButton onClick={() => navigate(`/mnu/${params.merchantId}/${params.tableId}`)}>
              <ArrowBack />
            </IconButton>
            <Typography>Voltar para o cardápio</Typography>
          </Grid>
        </Paper>


        <React.Fragment>
          <Paper variant='outlined'>
            <Typography color='text.primary' variant='body1' textAlign={'center'} width={'100%'}>
              Consumo
            </Typography>

            <Stack direction={'row'} justifyContent={'space-around'}>
              <Button
                size='small'
                startIcon={<Person />}
                color={mostrarIndividual ? 'warning' : 'inherit'}
                onClick={() => setMostrarIndividual(true)}
              >
                Individual
              </Button>
              <Button
                size='small'
                startIcon={<TableRestaurant />}
                color={!mostrarIndividual ? 'warning' : 'inherit'}
                onClick={() => setMostrarIndividual(false)}
              >
                Mesa
              </Button>
            </Stack>
          </Paper>

          <Zoom in={true} timeout={200}>

            <Grid container
              sx={{
                mb: (th) => th.mixins.toolbar.minHeight * 2 / 8,
                maxHeight: '60vh',
                overflowY: 'auto'
              }}
            >
              {consumo
                .map(row => (
                  <Grid key={row.table.tableId} size={{ xs: 12 }}>
                    {row.customers
                      .map(row => (
                        <Paper key={row.customer.uid} variant='outlined'
                          sx={{
                            pl: 0.5, pr: 0.5,
                            mb: 1
                          }}
                        >
                          <Typography variant='button' color='text.primary'>
                            {`${row.customer.name}`}
                          </Typography>

                          <List>
                            {row.items
                              .map((row) => (
                                <ListItem key={row.orderId} disablePadding sx={{ mb: 0.5 }}>
                                  <Box display={'flex'} flexDirection={'column'} width={'100%'} justifyItems={'center'}>

                                    <Paper variant='outlined' elevation={0} sx={{ p: 1 }}>
                                      <Stack flexGrow={1}>
                                        <Stack direction='row' flexGrow={1} justifyContent='space-between'>
                                          <Typography variant='body1' color='text.primary'>
                                            {`${row.name}`}
                                          </Typography>
                                          <Typography variant='body1' color='text.primary'>
                                            {`${row.qty_order} un x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}`}
                                          </Typography>
                                        </Stack>

                                        {!!row.options_selected?.length &&
                                          <Grid mt={1}>
                                            {row.options_selected.map((o) => (
                                              <Stack key={o.optionId} direction='row' flexGrow={1} justifyContent='space-between'>
                                                <Typography variant='body2' maxWidth={'60%'}>
                                                  {`+ ${o.name}`}
                                                </Typography>
                                                <Typography variant='body2'>
                                                  {`${o.count} un x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.price.value)}`}
                                                </Typography>
                                              </Stack>
                                            ))}
                                          </Grid>
                                        }
                                      </Stack>
                                    </Paper>


                                  </Box>
                                </ListItem>
                              ))}
                          </List>
                        </Paper>


                      ))}
                  </Grid>
                ))
              }
            </Grid >
          </Zoom>
        </React.Fragment>


      </Grid >






      <Paper
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          p: 1,
          position: "fixed",
          bottom: (t) => t.mixins.toolbar.minHeight,
          left: 0,
          right: 0,
          zIndex: 99999
        }}
        //variant='elevation'
        elevation={0}
      >

        <Zoom in={itensSelecionados && !disable_in_checkout}
          timeout={500} mountOnEnter unmountOnExit
        >
          <Button variant='contained' fullWidth disableElevation color='error'
            disabled={disable_in_checkout || !total}
            onClick={() => handleFecharConta()}
          >
            <Stack flexGrow={1} direction={'row'} justifyContent={'space-between'}>
              <Typography>
                FECHAR A CONTA
              </Typography>

              <Typography>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </Typography>
            </Stack>
          </Button>
        </Zoom>


      </Paper>




    </Grid >
  );
}