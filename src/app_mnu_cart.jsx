import {
  Alert,
  Badge,
  Box,
  Button,
  Grid, IconButton,
  LinearProgress,
  List, ListItem, Paper, Stack, Typography, Zoom
} from '@mui/material';
import { useData } from './context';
import { useNavigate, useParams } from 'react-router';
import { ArrowBack, DeleteForever, ShoppingBasketTwoTone } from '@mui/icons-material';
import { addDocument, deleteByParams, deleteDocument, fetchCollection, getDocumentById, getDocumentByParams, SYS_ORDER_STATUS, updateDocument, useAuthUser } from './api';
import { useDialogs } from '@toolpad/core';
import { CustomerDialog, ErrorDialog } from './shared';
import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
//import { get, save } from './utils/indexDB';
import { useState } from 'react';
import { useEffect } from 'react';





const useMnuFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useAuthUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();

  useEffect(() => {
    if (loading || !params?.merchantId) return;



    const unsubOrder = fetchCollection(params.merchantId,
      'order', { 'status': ['CAR'], 'table.tableId': Number(params.tableId), 'customer.uid': user.uid, },
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
      unsubOrder();
    };
  }, [loading, claims, setData, params.tableId]);

  return { ...state, claims, user };
};



export default function Cart() {
  const navigate = useNavigate();

  const { data } = useData();

  const dialogs = useDialogs();

  const itensSelecionados = data.mnu.order.length;

  const params = useParams();

  const [customer, setCustomer] = useState(null);

  const { fetching, error, user } = useMnuFetcher();


  //totaliza provisorio
  const total = data.mnu.order.reduce((sum, item) => {
    const itemTotal = item.qty_order * item.price.value;

    const optionsTotal = item.options_selected ? item.options_selected.reduce((optionsSum, option) => {
      return optionsSum + option.count * option.price.value;
    }, 0) : 0;

    return sum + itemTotal + optionsTotal;
  }, 0);


  const handleSaveCustomer = async () => {
    const name = await dialogs.open(CustomerDialog);

    setCustomer({ name });
  }

  const handleDeleteItem = async (orderId) => {
    const deleteConfirmed = await dialogs.confirm(
      `Deseja realmente excluir este produto?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
    );
    if (deleteConfirmed) {
      try {

        //....
        await deleteDocument(params.merchantId, 'order', orderId);

      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro desconhecido';
        const message = `Ocorreu um erro ao tentar excluir:\n\n${err}`;
        await dialogs.open(ErrorDialog, { textError: message });
      }
    }
  }

  //confirma pedido mudando status dos itens de carrinho para plc
  const handleFazerPedido = async () => {

    const oldCheckIn = await getDocumentByParams(params.merchantId, 'checkIn', { uid: user.uid, status: 'OPEN' });

    if (!oldCheckIn) {
      await addDocument(params.merchantId, 'checkIn', { tableId: Number(params.tableId), uid: user.uid, status: 'OPEN', createdAt: serverTimestamp() })
    }

    //REVER
    await deleteByParams(params.merchantId, 'checkIn', 'uid', user.uid, 'status', 'SCANNED');


    const status_plc = SYS_ORDER_STATUS.find(s => s.id === 'PLC');
    const status_rtp = SYS_ORDER_STATUS.find(s => s.id === 'RTP');

    for (let i = 0; i < data.mnu.order.length; i++) {
      const order = data.mnu.order[i];
      const consumerName = customer?.name || user?.displayName || 'Consumidor';
      let orderUpdated = {
        status: status_plc.id,
        status_hist: arrayUnion({
          ...status_plc,
          createdAt: Timestamp.now(),
          email: user?.email || 'Consumidor'
        }),
        'customer.name': consumerName
      }


      if (!order.kds) {
        orderUpdated = {
          status: status_rtp.id,
          status_hist: arrayUnion(
            {
              ...status_rtp,
              createdAt: new Timestamp(Timestamp.now().seconds + 1, 0),
              email: 'Sistema'
            },
            {
              ...status_plc,
              createdAt: Timestamp.now(),
              email: user?.email || 'Consumidor'
            }
          ),
          'customer.name': consumerName
        }
      }

      await updateDocument(params.merchantId, 'order', order.orderId, orderUpdated)
    }


    navigate('scs');
  }


  useEffect(() => {
    if (!user) return

    (async () => {
      const data = await getDocumentById(params.merchantId, 'customer', user.uid);
      setCustomer(data);
    })();
  }, [user]);



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

      <Grid container direction={'column'} spacing={1}>

        <Paper variant='outlined'>
          <Grid container alignItems={'center'}>
            <IconButton onClick={() => navigate(`/mnu/${params.merchantId}/${params.tableId}`)}>
              <ArrowBack />
            </IconButton>
            <Typography>Voltar para o cardápio</Typography>
          </Grid>
        </Paper>


        <Paper variant='outlined'
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 1,
            pb: 1,
          }}
        >
          <Button
            sx={{
              textTransform: 'none'
            }}
            onClick={handleSaveCustomer}
          >
            <Typography color='text.secondary' mr={1} variant='body2'
              sx={{
                textDecoration: 'underline',
                color: 'primary'
              }}
            >
              {`Olá, ${customer?.name || 'Identifique-se'}`}
            </Typography>
          </Button>
        </Paper>


        <Typography color='text.primary' variant='body1' textAlign={'center'} width={'100%'}>
          CARRINHO
        </Typography>



        <Zoom in={true} timeout={200}>
          <List dense disablePadding
            sx={{
              mt: 1,
              mb: (th) => th.mixins.toolbar.minHeight * 2 / 8,
              maxHeight: '50vh',
              overflowY: 'auto'
            }}
          >
            {data.mnu.order
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((row, index) => (
                <ListItem key={index} disableGutters disablePadding sx={{ mb: 1 }}>
                  <Paper variant='outlined' sx={{ display: 'flex', flexGrow: 1, flexDirection: 'column', p: 1, gap: 1 }}>

                    <Stack>
                      <Stack direction='row' justifyContent='space-between'>
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
                            <Stack key={o.optionId} direction='row' justifyContent='space-between'>
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

                    <Typography variant='body2' color='text.primary'>
                      {row.remarks ? `* ${row.remarks}` : ''}
                    </Typography>

                    <Stack alignItems={'end'}>
                      <IconButton
                        onClick={() =>
                          handleDeleteItem(row.orderId)
                        }
                      >
                        <DeleteForever color='error' />
                      </IconButton>
                    </Stack>


                  </Paper>

                </ListItem>
              ))}
          </List>
        </Zoom>
      </Grid>





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

        <Zoom in={itensSelecionados} timeout={200} mountOnEnter unmountOnExit>
          <Button variant='contained' fullWidth disableElevation color='success'
            onClick={() => handleFazerPedido()}
          >
            <Stack flexGrow={1} direction={'row'} justifyContent={'space-between'}>
              <Stack direction={'row'} alignItems={'center'} gap={1.5}>
                <ShoppingBasketTwoTone />
                <Badge badgeContent={itensSelecionados} color='warning' />
              </Stack>

              <Typography>
                Fazer pedido
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