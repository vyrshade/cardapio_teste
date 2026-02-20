import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { useData } from './context';
import { addDocument, addDocumentId, fetchCollection, getDocumentById, updateDocument, useWtrUser } from './api';
import { serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useDialogs } from '@toolpad/core';
import { HelpOkDialog } from './shared';
import { useRef } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router';






const useWtrFetcher = () => {
  const { data, setData } = useData();
  const { claims, loading, user } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const [userListenStatus, setUserListenStatus] = useState(null);




  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'table',
      null,
      (data) => {
        const range = data.length ? data[0] : { numStart: 0, numEnd: 0 };

        setData((prev) => ({
          ...prev,
          wtr: {
            ...prev.wtr,
            table: range,
          },
        }));

      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);




  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'checkIn', { status: 'OPEN' },
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

    return () => {
      unsubscribe()
      //unsCustomer?.();
    };
  }, [loading, claims, setData]);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'checkout', { status: 'OPEN' },
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
    if (loading || !claims?.merchantId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'help', { status: 'OPEN' },
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

    const unsubscribe = fetchCollection(claims.merchantId, 'order', { status: ['PLC', 'SPS', 'RTP', 'DIS'] },
      (data) => {
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            order: [...data],
          },
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [data.wtr.order_status, loading, claims, setData]);



  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubUsr = fetchCollection(claims.merchantId, 'user', { token: claims.token },
      (data) => {
        setUserListenStatus({ ...data?.[0] })
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubUsr();
    };
  }, [loading, claims, setData]);

  return { ...state, claims, user, userListenStatus };
};














export default function GarçomMesas() {

  const { data } = useData();

  const { fetching, error, claims, user } = useWtrFetcher();

  const dialogs = useDialogs();

  const navigate = useNavigate();



  //muda de mesa
  const handleChangeTable = async (oldTableId, newTableId) => {

    if (newTableId) {

      const trimmed = newTableId.trim();

      if (!/^\d+$/.test(trimmed)) {
        console.log('nao é numero')
        return;
      }

      if (Number(newTableId) < data.wtr.table.numStart || Number(newTableId) > data.wtr.table.numEnd) {
        console.log('fora do range')
        return
      }

      const consumidores_logados_na_mesa = data.wtr.checkIn.filter(c => c.tableId === oldTableId);

      for (let c = 0; c < consumidores_logados_na_mesa.length; c++) {
        const consumidor = consumidores_logados_na_mesa[c];

        await updateDocument(claims.merchantId, 'checkIn', consumidor.checkInId, {
          status: 'CLOSE',
          updatedAt: new Date(),
          claims
        })

        await addDocument(claims.merchantId, 'checkIn', { tableId: Number(newTableId), uid: consumidor.uid, status: 'OPEN', createdAt: serverTimestamp() })
      }

      const ordens_para_mudar_de_mesa = data.wtr.order.filter(o =>
        consumidores_logados_na_mesa.some(c => c.uid === o.customer.uid && c.tableId === o.table.tableId)
      )

      for (let o = 0; o < ordens_para_mudar_de_mesa.length; o++) {
        const order = ordens_para_mudar_de_mesa[o];

        await updateDocument(claims.merchantId, 'order', order.orderId, {
          'table.tableId': Number(newTableId),
          updatedAt: new Date()
        })
      }

      await dialogs.alert(`Nova mesa: ${newTableId}`, { title: 'OK' });
    }
  }



  //abre nova mesa e novo cliente
  const handleNewClientePedido = async () => {


    const result = await dialogs.open(NewTableDialog);


    if (result) {

      const trimmed = result.newTableId.trim();

      if (!/^\d+$/.test(trimmed)) {
        console.log('nao é numero')
        return;
      }

      if (Number(result.newTableId) < data.wtr.table.numStart || Number(result.newTableId) > data.wtr.table.numEnd) {
        console.log('fora do range')
        return
      }

      if (!result.newName) return

      const customer = await getDocumentById(claims.merchantId, 'customer', user.uid);

      if (customer) {
        await updateDocument(claims.merchantId, 'customer', customer.customerId, { uid: 0, name: result.newName });
      } else {
        await addDocumentId(claims.merchantId, 'customer', { uid: 0, name: result.newName }, user.uid);
      }

      navigate(`/wtr/mnu/${claims.merchantId}/${result.newTableId}`)
    }

  }





  //cria pedido para um ccliente selecionado ou informado
  const handleNewPedido = async (payload) => {

    let parseClientes = [];

    for (let c = 0; c < payload.customer.length; c++) {
      const clienteCheckIn = payload.customer[c];
      const customer = await getDocumentById(claims.merchantId, 'customer', clienteCheckIn.uid);

      if (customer) {
        parseClientes.push({ ...clienteCheckIn, name: customer ? customer.name : 'N/I' });
      } else {
        //procura clientes pedidos pelo garçom
        const name = clienteCheckIn.uid?.split('-')?.[1] ?? null;
        parseClientes.push({ ...clienteCheckIn, name: name || 'N/I' });
      }
    }

    const result = await dialogs.open(NewPedidoTableDialog, { ...payload, customer: parseClientes });

    if (!result) return

    const customer = await getDocumentById(claims.merchantId, 'customer', user.uid);

    if (customer) {
      await updateDocument(claims.merchantId, 'customer', customer.customerId, { ...result });
    } else {
      await addDocumentId(claims.merchantId, 'customer', { ...result }, user.uid);
    }

    navigate(`/wtr/mnu/${claims.merchantId}/${payload.tableId}`)

  }








  //abre dialog opcoes
  const handleDialog = async (tableId, customer) => {

    await dialogs.open(TableDialog, { tableId, customer });

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


  const grouped = data.wtr.checkIn.reduce((map, item) => {
    const key = item.tableId;

    if (!map.has(key)) {
      map.set(key, []);
    }

    const arr = map.get(key);

    if (!arr.some(i => i.uid === item.uid)) {
      arr.push(item);
    }

    return map;
  }, new Map());




  function ChangeTableDialog({ open, onClose }) {
    const [result, setResult] = React.useState('');
    return (
      <Dialog fullWidth open={open} onClose={() => onClose(null)}>
        <DialogTitle>Transferindo mesa</DialogTitle>
        <DialogContent>

          <TextField
            margin='dense'
            label='Nova Mesa'
            type='tel'
            size='small'
            fullWidth
            value={result}
            onChange={(event) => setResult(event.currentTarget.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(null)}>Cancelar</Button>
          <Button onClick={() => onClose(result)}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    );
  }





  function NewTableDialog({ open, onClose }) {

    const [newName, setNewName] = useState('');
    const [newTableId, setNewTableId] = useState('')

    const handleNewNameChange = (e) => {
      setNewName(e.target.value);
    };

    return (
      <Dialog fullWidth open={open} onClose={() => onClose(null)}>
        <DialogTitle>Novo Pedido</DialogTitle>
        <DialogContent>

          <TextField
            margin='dense'
            label='Mesa'
            type='tel'
            size='small'
            fullWidth
            value={newTableId}
            onChange={(event) => setNewTableId(event.currentTarget.value)}
          />

          <TextField
            fullWidth
            margin='dense'
            label='Cliente'
            value={newName}
            onChange={handleNewNameChange}
            size='small'
          />

        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(null)}>Cancelar</Button>
          <Button
            disabled={!newTableId || !newName}
            onClick={() => onClose({
              newTableId,
              newName
            })}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }





  function NewPedidoTableDialog({ payload, open, onClose }) {

    const [selectedIndex, setSelectedIndex] = useState(null);
    const [newName, setNewName] = useState('');

    const handleListItemClick = (index) => {
      setSelectedIndex(index);
      setNewName('');
    };

    const handleNewNameChange = (e) => {
      setNewName(e.target.value);
      setSelectedIndex(null);
    };


    const handleConfirm = () => {

      if (selectedIndex === null && newName) {
        onClose({
          uid: 0,
          name: newName
        })
      }


      if (selectedIndex !== null) {
        onClose({
          ...payload.customer[selectedIndex]
        });
      }

    };






    return (
      <Dialog fullWidth open={open} onClose={() => onClose(null)}>
        <DialogTitle>{`Novo pedido Mesa: ${payload.tableId}`}</DialogTitle>
        <DialogContent>



          <List component='nav' disablePadding>
            {payload.customer
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((row, index) => (
                <ListItemButton
                  key={index}
                  disableGutters
                  alignItems='center'
                  selected={selectedIndex === index}
                  onClick={() => handleListItemClick(index)}
                  sx={{ gap: 1 }}
                >
                  <PersonIcon />
                  <ListItemText primary={row.name} />
                </ListItemButton>
              ))}

            <ListItem sx={{ mt: 1 }}
              disableGutters disablePadding
            >
              <TextField
                fullWidth
                variant='standard'
                label='Novo cliente'
                value={newName}
                onChange={handleNewNameChange}
                onFocus={() => setSelectedIndex(null)}
                size='small'
              />
            </ListItem>
          </List>


        </DialogContent>

        <DialogActions>
          <Button onClick={() => onClose(null)}>Cancelar</Button>
          <Button
            disabled={selectedIndex === null && !newName}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }






  function TableDialog({ payload, open, onClose }) {

    return (
      <Dialog fullWidth open={open} onClose={() => onClose()}>
        <DialogTitle textAlign={'center'}>{`Mesa ${payload.tableId}`}</DialogTitle>
        <DialogContent>

          <Grid container spacing={1}>

            <Button fullWidth variant='contained'
              onClick={() => {
                onClose();
                navigate(`${payload.tableId}`)
              }}
            >
              Ver pedidos
            </Button>

            <Button fullWidth variant='contained'
              onClick={() => {
                onClose();

                handleNewPedido(payload);
              }
              }
            >
              Incluir pedido
            </Button>

            <Button fullWidth variant='contained'
              onClick={async () => {
                onClose();

                const result = await dialogs.open(ChangeTableDialog);
                handleChangeTable(payload.tableId, result)
              }}
            >
              Transferir mesa
            </Button>
          </Grid>
        </DialogContent>



        <DialogActions>
          <Button color='error' onClick={() => onClose()}>Fechar</Button>
        </DialogActions>
      </Dialog>
    );
  }





  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity='error'>
      <Box whiteSpace='pre-line'>
        {error.message}
      </Box>
    </Alert>
  );


  return (
    <Grid container bgcolor={(t) => t.palette.divider} justifyContent={'space-between'} justifyItems={'center'}>

      <Button
        fullWidth
        variant='outlined'
        color='primary'
        onClick={() => {
          handleNewClientePedido()
        }}
        sx={{ m: 1, mb: 2 }}
      >
        Lançar pedido
      </Button>






      {
        [...grouped].map(([tableId, peoples]) => {

          const size = 150;
          const personSize = 20;

          const radius = (size / 2) - personSize / 2 - 6;
          const center = size / 2;


          let tableColor = 'txt.primary';

          const inCheckout = data.wtr.checkout.filter(c => c.tableId === tableId).length;

          if (inCheckout) {
            tableColor = 'error.main'
          }

          return (
            <Grid key={tableId}>
              <Box
                sx={{
                  position: 'relative',
                  width: size,
                  height: size
                }}
              >
                {
                  peoples.map((p, i) => {
                    const angle = (360 / peoples.length) * i - 90;
                    const rad = (angle * Math.PI) / 180;
                    const x = center + radius * Math.cos(rad);
                    const y = center + radius * Math.sin(rad);


                    let peopleColor = 'inherit';



                    const temPedido = [...data.wtr.order]
                      .filter(o => o.table.tableId === tableId && o.customer.uid === p.uid)
                      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
                    [0]?.status;

                    switch (temPedido) {
                      case 'PLC':
                        peopleColor = 'warning';
                        break;
                      case 'SPS':
                        peopleColor = 'warning';
                        break;
                      case 'RTP':
                        peopleColor = 'info';
                        break;
                      case 'DIS':
                        peopleColor = 'success';
                        break;

                      default:
                        break;
                    }


                    const inHelp = data.wtr.help.filter(h => h.uid === p.uid && h.tableId === tableId).length;

                    if (inHelp) {
                      peopleColor = 'error';
                    }

                    /*   const consumoEmCheckoutCliente = consumoEmCheckout
                        .filter((c) => c.table.tableId === rowTable.table.tableId)
                        .flatMap((c) => c.customers)
                        .some((d) => d.customer.uid === row.customer.uid); */

                    return (
                      <Box key={i} sx={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        transform: 'translate(-50%, -50%)',
                        width: personSize,
                        height: personSize,
                        minWidth: personSize,
                        minHeight: personSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <IconButton size='small'
                          color={peopleColor}
                          sx={{
                            animation: inHelp && 'blinker 1s infinite',
                            '@keyframes blinker': {
                              '50%': { opacity: 0 },
                            },
                          }}
                        >
                          <PersonIcon />
                        </IconButton>
                      </Box>
                    );
                  })}

                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                  onClick={() => { handleDialog(tableId, peoples) }}
                >
                  <IconButton
                    color='text.primary'
                    sx={{
                      bgcolor: 'divider',
                      color: tableColor,
                      animation: inCheckout && 'blinker 1s infinite',
                      '@keyframes blinker': {
                        '50%': { opacity: 0 },
                      },
                    }}
                  >
                    <Box m={1}>{`Mesa ${tableId}`}</Box>
                  </IconButton>
                </Box>
              </Box>
            </Grid>
          )
        })
      }


      {
        !data.wtr.checkIn.length &&
        <Grid container size={12} justifyContent={'center'}>
          <Typography variant='button'>
            Mesas vazias..
          </Typography>
        </Grid>
      }

    </Grid >
  );

}
