import {
  Alert,
  Badge,
  Box,
  Button,
  Grid, IconButton,
  LinearProgress,
  List, ListItem, Paper, Stack, Typography, Zoom
} from '@mui/material';
import * as React from 'react';
import { useData } from './context';
import { useNavigate, useParams } from 'react-router';
import { ArrowBack, DeleteForever, ShoppingBasketTwoTone } from '@mui/icons-material';
import { addDocument, deleteDocument, fetchCollection, getDocumentById, SYS_ORDER_STATUS, updateDocument, useWtrUser } from './api';
import { useDialogs } from '@toolpad/core';
import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ErrorDialog } from './shared';
import { useState } from 'react';







const useMnuFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();




  //busca itens pedidos escolhidos pelo cliente
  React.useEffect(() => {

    //provisorio.. limpa o estado antes.. REMOVER
    setData((state) => ({
      ...state,
      mnu: {
        ...state.mnu,
        order: [],
      }
    }));

    if (loading || !user || !params) return undefined;

    const unsubscribe = fetchCollection(params.merchantId,
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


        setState({ fetching: false, error: null })

      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();

  }, [setData, user, loading, params.tableId]);


  return { ...state, claims, user };
};




export default function GarçomCart() {
  const navigate = useNavigate();

  const { data } = useData();

  const dialogs = useDialogs();

  const params = useParams();

  const { fetching, user, error } = useMnuFetcher()





  const itensSelecionados = data.mnu.order.length;

  //totaliza provisorio
  const total = data.mnu.order.reduce((sum, item) => {
    const itemTotal = item.qty_order * item.price.value;

    const optionsTotal = item.options_selected ? item.options_selected.reduce((optionsSum, option) => {
      return optionsSum + option.count * option.price.value;
    }, 0) : 0;

    return sum + itemTotal + optionsTotal;
  }, 0);




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

    const customer = await getDocumentById(params.merchantId, 'customer', user.uid);

    if (customer.uid === 0) {
      await addDocument(params.merchantId, 'checkIn', { tableId: Number(params.tableId), uid: `${user.uid}-${customer.name}`, status: 'OPEN', createdAt: serverTimestamp() })
    }

    const status_plc = SYS_ORDER_STATUS.find(s => s.id === 'PLC');
    const status_rtp = SYS_ORDER_STATUS.find(s => s.id === 'RTP');

    for (let i = 0; i < data.mnu.order.length; i++) {
      const order = data.mnu.order[i];

      let orderUpdated = {
        status: status_plc.id,
        status_hist: arrayUnion({
          ...status_plc,
          createdAt: Timestamp.now(),
          email: customer.name
        }),
        'customer.name': customer.name
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
              email: customer.name
            }
          ),
          'customer.name': customer.name
        }
      }

      if (customer.uid === 0) {
        orderUpdated['customer.uid'] = `${user.uid}-${customer.name}`;
      } else {
        orderUpdated['customer.uid'] = `${customer.uid}`;
      }

      await updateDocument(params.merchantId, 'order', order.orderId, orderUpdated)
    }


    navigate('scs');
  }



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
            <IconButton onClick={() => navigate(`/wtr/mnu/${params.merchantId}/${params.tableId}`)}>
              <ArrowBack />
            </IconButton>
            <Typography>Voltar para o cardápio</Typography>
          </Grid>
        </Paper>


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