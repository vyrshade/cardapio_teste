import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useData } from './context';
import { fetchCollection, SYS_ORDER_STATUS, updateDocument, updateDocumentsBatch, useWtrUser } from './api';
import { arrayUnion, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useDialogs } from '@toolpad/core';
import { HelpOkDialog } from './shared';
import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router';






const useWtrFetcher = () => {
  const { data, setData } = useData();
  const { claims, loading, userListenStatus } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();

  useEffect(() => {
    if (loading || !claims?.merchantId || !params?.tableId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'checkIn', { status: 'OPEN', tableId: Number(params.tableId) },
      (checkInData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            checkIn: [...checkInData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  useEffect(() => {
    if (loading || !claims?.merchantId || !params?.tableId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'checkout', { status: 'OPEN', tableId: Number(params.tableId) },
      (checkoutData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            checkout: [...checkoutData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  useEffect(() => {
    if (loading || !claims?.merchantId || !params?.tableId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'help', { status: 'OPEN', tableId: Number(params.tableId) },
      (helpData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            help: [...helpData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'order_status', null,
      (statusData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            order_status: [...statusData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);



  useEffect(() => {


    //provisorio.. limpa o estado antes.. REMOVER
    setData((state) => ({
      ...state,
      wtr: {
        ...state.wtr,
        order: [],
      }
    }));


    if (loading || !claims?.merchantId || !data.wtr.order_status.length) return;


    const ftr = { status: ['PLC', 'DIS', 'SPS', 'RTP'] }

    const unsubscribe = fetchCollection(claims.merchantId, 'order', { ...ftr, 'table.tableId': Number(params.tableId) },
      (data) => {
        const grouped = Object.values(
          data.reduce((acc, item) => {
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


        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            order: [...grouped],
          },
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [data.wtr.order_status, loading, claims, setData]);




  return { ...state, claims, userListenStatus };
};









export default function GarçomMesaDetalhe() {

  const { data } = useData();

  const { fetching, error, claims, userListenStatus } = useWtrFetcher();

  const dialogs = useDialogs();

  //passar para use acima
  const [dialog, setOpenToCancel] = useState({ open: false });

  const [remarksCancel, setRemarksCancel] = useState('');

  const params = useParams();

  const navigate = useNavigate();

  const statusList = [...data.wtr.order_status];

  const filtered = statusList.filter((f) => {
    if (f.id === 'CAR' || f.id === 'CON') return false;
    return true;
  });






  //modifica status
  const handleChangeOrderStatus = async (orderId, status) => {

    if (status.id === 'CAN') {
      setOpenToCancel({
        open: true,
        status: status,
        orderId: orderId
      });
      return
    }

    const order = {
      status: status.id,
      status_hist: arrayUnion({
        ...status,
        createdAt: Timestamp.now(),
        //email: claims?.email || 'n/d'
        email: userListenStatus.name
      })
    }
    await updateDocument(claims.merchantId, 'order', orderId, order);
  }



  //cancela com obs
  const handleCancelaPedido = async () => {

    if (!dialog) return;

    const order = {
      status: dialog.status.id,
      status_hist: arrayUnion({
        ...dialog.status,
        remarksCancel: remarksCancel,
        email: userListenStatus.name,
        createdAt: Timestamp.now(),
      })
    }

    //const orderId =
    await updateDocument(claims.merchantId, 'order', dialog.orderId, order);

    setOpenToCancel(false);
  }






  //ARRUMAR ISSO
  //REVER (tudo em um lote)
  const handleFecharConta = async (checkoutId, consumo, tableId, row) => {


    const confirmed = await dialogs.confirm('Deseja realmente fechar a conta?', {
      title: 'Confirmar',
      okText: 'Sim',
      cancelText: 'Não',
    });

    if (!confirmed) return

    //garçom fechando pedido lançado por ele msm

    if (!checkoutId) {

      const checkIn = data.wtr.checkIn.find((c) => c.uid === row.customer.uid && c.tableId == tableId)
      if (checkIn) {
        await updateDocument(claims?.merchantId, 'checkIn', checkIn.checkInId, {
          status: 'CLOSE',
          updatedAt: new Date(),
          claims
        })
      }



      const status = SYS_ORDER_STATUS.find(s => s.id === 'CON');

      const order = {
        status: status.id,
        status_hist: arrayUnion({
          ...status,
          createdAt: Timestamp.now(),
          email: userListenStatus.name
        }),
        checkout: {
          ...claims
        }
      }

      const ordersToUpdate = row.items;

      const documentsIds = ordersToUpdate
        .map(item => item.orderId);

      await updateDocumentsBatch(claims.merchantId, 'order', documentsIds, order);

      return
    }



    //continua fechamento "normal"


    for (let x = 0; x < consumo.length; x++) {
      const element = consumo[x];
      const checkIn = data.wtr.checkIn.find((c) => c.uid === element.customer.uid && c.tableId == tableId)

      if (checkIn) {
        await updateDocument(claims?.merchantId, 'checkIn', checkIn.checkInId, {
          status: 'CLOSE',
          updatedAt: new Date(),
          claims
        })
      }
    }

    await updateDocument(claims?.merchantId, 'checkout', checkoutId, {
      status: 'CLOSE',
      updatedAt: new Date(),
      claims
    })

    const status = SYS_ORDER_STATUS.find(s => s.id === 'CON');

    const order = {
      status: status.id,
      status_hist: arrayUnion({
        ...status,
        createdAt: Timestamp.now(),
        email: userListenStatus.name
      }),
      checkout: {
        ...claims
      }
    }

    const ordersToUpdate = consumo.flatMap(i => i.items);

    const documentsIds = ordersToUpdate
      .map(item => item.orderId);

    await updateDocumentsBatch(claims.merchantId, 'order', documentsIds, order);

  }









  /////////////////////////////////////////////
  const [currentHelp, setCurrentHelp] = useState(null);
  const shownIdsRef = useRef(new Set());

  useEffect(() => {
    if (!Array.isArray(data?.wtr?.help)) return;

    const openHelps = data.wtr.help
      .filter(h => h?.status === 'OPEN')
      .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

    const next = openHelps.find(h => !shownIdsRef.current.has(h.helpId));

    if (next && !currentHelp) {
      shownIdsRef.current.add(next.helpId);
      setCurrentHelp(next);
    }

    if (currentHelp && !openHelps.some(h => h.helpId === currentHelp.helpId)) {
      setCurrentHelp(null);
    }
  }, [data?.wtr?.help, currentHelp]);

  useEffect(() => {
    if (currentHelp) {
      dialogs.open(HelpOkDialog, {
        ...currentHelp,
        callback: () => setCurrentHelp(null),
      });
    }
  }, [currentHelp]);





  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity='error'>
      <Box whiteSpace='pre-line'>
        {error.message}
      </Box>
    </Alert>
  );



  return (
    <Grid container>
      <Grid container direction={'row'} size={12} spacing={2} alignItems={'start'}>
        <React.Fragment>
          <Dialog
            open={dialog.open}
            onClose={() => setOpenToCancel(false)}
          >
            <DialogTitle>Informe o motivo do cancelamento</DialogTitle>
            <DialogContent>
              <TextField
                required
                margin="dense"
                id="remarks"
                name="remarks"
                label="Motivo"
                type="text"
                fullWidth
                variant="standard"
                autoComplete='off'
                onChange={(e) => {
                  setRemarksCancel(e.target.value)
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenToCancel(false)}>Voltar</Button>
              <Button
                disabled={!remarksCancel}
                onClick={handleCancelaPedido}
              >
                Confirmar
              </Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>


        {data.wtr.order
          .map(rowTable => {

            const consumoEmCheckout = data.wtr.checkout.flatMap((c) => c.consumo);


            let total_mesa = 0;


            return (
              <Grid key={rowTable.table.tableId} size={{ xs: 12, sm: 6 }}>
                <Paper variant='outlined'>
                  <Typography mb={1} mt={1} textAlign={'center'} variant='h6'
                    color={consumoEmCheckout.some((c) => c.table.tableId === rowTable.table.tableId) ? 'warning' : 'textPrimary'}
                  >
                    {`Mesa: ${rowTable.table.tableId}`}
                  </Typography>

                  {rowTable.customers
                    .map(row => {

                      const consumoEmCheckoutCliente = consumoEmCheckout
                        .filter((c) => c.table.tableId === rowTable.table.tableId)
                        .flatMap((c) => c.customers)
                        .some((d) => d.customer.uid === row.customer.uid);

                      //REVER
                      const checkout = data.wtr.checkout.filter(parent =>
                        parent.consumo?.some(child =>
                          child.customers?.some(item => item.customer.uid === row.customer.uid)
                        )
                      );

                      const checkoutId = checkout.length ? checkout[0].checkoutId : null;
                      const consumo = consumoEmCheckout
                        .filter((c) => c.table.tableId === rowTable.table.tableId)
                        .flatMap((c) => c.customers)
                        .filter((c) => c.customer.uid === row.customer.uid);


                      // totaliza provisório
                      const total = row.items
                        .reduce((sum, item) => {
                          const itemTotal = item.qty_order * item.price.value;

                          const optionsTotal = item.options_selected
                            ? item.options_selected.reduce((optionsSum, option) => {
                              return optionsSum + option.count * option.price.value;
                            }, 0)
                            : 0;

                          return sum + itemTotal + optionsTotal;
                        }, 0);

                      total_mesa += total;

                      const allItemsReadyOrDelivered = row.items.length > 0 && row.items.every(
                        (item) => item.status === 'RTP' || item.status === 'DIS'
                      );


                      return (
                        <Paper key={row.customer.uid} variant='outlined' sx={{ m: 0.5, p: 0.5 }}>
                          <Paper variant='outlined'
                            sx={{
                              m: 0.5,
                              p: 0.5,
                              bgcolor: (t) => consumoEmCheckoutCliente ? t.palette.divider : ''
                            }}
                          >
                            <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'}>
                              <Typography variant='button' ml={1}>
                                {`${row.customer.name}`}
                              </Typography>
                              
                              <Button 
                                disabled={!allItemsReadyOrDelivered}
                                color={consumoEmCheckoutCliente ? 'error' : 'warning'}
                                sx={{
                                  animation: consumoEmCheckoutCliente && 'blinker 1s infinite',
                                  '@keyframes blinker': {
                                    '50%': { opacity: 0 },
                                  },
                                }}
                                onClick={() => handleFecharConta(checkoutId, consumo, rowTable.table.tableId, row)}>
                                Fechar conta
                              </Button>
                            </Stack>

                            <List>
                              {row.items
                                .filter((o) => {
                                  //ver o que ta na cozina
                                  if (data.wtr.order_kds_show) {
                                    //ativo entao mostra tudo
                                    return true
                                  } else {

                                    const index_sps = data.wtr.order_status.findIndex((s) => s.id === 'SPS');

                                    //esta trabalhando sem SPS RTP entao retorna todos
                                    if (index_sps === -1) {
                                      return true
                                    }

                                    return o.status === 'RTP' || o.status === 'DIS'
                                  }
                                })
                                .filter((i) => {
                                  if (data.wtr.order_my_action_show) return i.status === 'RTP';

                                  return true
                                })
                                .map((row) => (
                                  <ListItem key={row.orderId} disableGutters sx={{ mb: 1 }}>
                                    <Box display={'flex'} flexDirection={'column'} width={'100%'} justifyItems={'center'}>

                                      <Paper variant='outlined' elevation={0} sx={{ p: 1 }}>
                                        <Stack flexGrow={1}>
                                          <Stack direction='row' flexGrow={1} justifyContent='space-between'>
                                            <Typography variant='button' color='text.primary'>
                                              {`${row.name}`}
                                            </Typography>
                                            <Typography variant='button' color='text.primary'>
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

                                          <Typography variant='body2' color='text.primary'>
                                            {row.remarks ? `* ${row.remarks}` : ''}
                                          </Typography>

                                        </Stack>

                                        <Grid container justifyContent={'space-between'} mt={0.5} gap={1}>
                                          {
                                            data.wtr.order_kds_show && (row.status === 'PLC' || row.status === 'SPS')
                                              ?
                                              <Typography variant='caption' color={data.wtr.order_status.find(s => s.id === row.status)?.color}>{`Cozinha status: ${data.wtr.order_status.find(s => s.id === row.status)?.label}`}</Typography>
                                              :
                                              filtered
                                                .sort((a, b) => a.sequence - b.sequence)
                                                .map((s, index) => {

                                                  if (row.status === 'DIS' && s.id === 'CAN') return null

                                                  ///////////////////
                                                  if (s.id !== 'DIS' && s.id !== 'CAN') return null
                                                  ///////////////////

                                                  const showColor = row.status_hist.some(h => h.id === s.id && !h.reverted);

                                                  const isClickable = !showColor && (s.id === 'DIS' || s.id === 'CAN');

                                                  return (
                                                    <Chip
                                                      key={index}
                                                      label={s.id === 'CAN' && row.status === 'CAN' ? 'Cancelado' : s.label_wtr}
                                                      sx={{
                                                        cursor: isClickable ? 'pointer' : 'default',
                                                        fontStyle: showColor ? 'italic' : 'normal',
                                                        textDecoration: showColor ? 'line-through' : 'none'
                                                      }}
                                                      onClick={() => {
                                                        if (isClickable) {
                                                          handleChangeOrderStatus(row.orderId, s)
                                                        }
                                                      }}
                                                      color={s.id === 'CAN' ? 'error' : showColor ? s.color : 'default'}
                                                    />
                                                  )
                                                })
                                          }
                                        </Grid>
                                      </Paper>
                                    </Box>
                                  </ListItem>
                                ))}


                              <Stack direction='row' flexGrow={1} justifyContent='space-between'>
                                <Typography variant='button' color='text.primary' ml={1}>
                                  {`Subtotal`}
                                </Typography>
                                <Typography variant='button' color='text.primary' mr={1}>
                                  {`${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`}
                                </Typography>
                              </Stack>
                            </List>
                          </Paper>
                        </Paper>
                      )
                    })}



                  <Stack direction='row' flexGrow={1} justifyContent='space-between' mt={2}>
                    <Typography variant='button' color='text.primary' ml={1}>
                      {`Total mesa`}
                    </Typography>
                    <Typography variant='button' color='text.primary' mr={3}>
                      {`${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total_mesa)}`}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            )
          })
        }
      </Grid>

      {
        !data.wtr.order.length &&
        <Grid container size={12} alignContent={'center'} direction={'column'}>
          <Typography variant='button' textAlign={'center'}>
            {params?.tableId && `Mesa ${params.tableId}`}
          </Typography>
          <Typography variant='button'>
            Aguardando pedidos ou preparo..
          </Typography>

          <Button
            sx={{ mt: 2 }}
            onClick={() => navigate(`/wtr/tbl`)}
          >
            Voltar
          </Button>
        </Grid>
      }
    </Grid >
  );
}