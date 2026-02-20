import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useData } from './context';
import { fetchCollection, updateDocument, useKdsUser } from './api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { arrayUnion, Timestamp } from 'firebase/firestore';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useParams } from 'react-router';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';






const useKdsFetcher = () => {
  const { data, setData } = useData();
  const { claims, loading } = useKdsUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const [userListenStatus, setUserListenStatus] = useState(null);

  const param = useParams();

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'order_status', null,
      (statusData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          kds: {
            ...state.kds,
            order_status: [...statusData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);





  useEffect(() => {
    if (loading || !claims?.merchantId || !data.kds.order_status.length) return;

    const ftr = { status: ['PLC', 'SPS', 'RTP'] }

    const unsubscribe = fetchCollection(claims.merchantId, 'order', { 'kds.kdsId': param.key, ...ftr },
      (data) => {

        const grouped = Object.values(
          data
            .sort((a, b) => a.createdAt - b.createdAt)
            .reduce((acc, item) => {
              const key = item.table.tableId;

              if (!acc[key]) {
                acc[key] = { tableId: key, item: [] };
              }

              acc[key].item.push(item);
              return acc;
            }, {})
        );

        setData((state) => ({
          ...state,
          kds: {
            ...state.kds,
            order: [...grouped],
          },
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [data.kds.order_status, loading, claims, setData]);




  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    //kds
    const unsubKds = fetchCollection(claims.merchantId, 'kds', null,
      (kds) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, kds }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    const unsubUsr = fetchCollection(claims.merchantId, 'user', { token: claims.token },
      (data) => {
        setUserListenStatus({ ...data?.[0] })
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );


    return () => {
      unsubKds?.();
      unsubUsr();
    };
  }, [loading, claims, setData]);

  return { ...state, claims, userListenStatus };
};










const OrderData = ({ row, claims, userListenStatus }) => {


  const [elapsedTime, setElapsedTime] = useState('');

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [dialog, setOpenToCancel] = useState({ open: false });

  const [remarksCancel, setRemarksCancel] = useState('');

  const timeoutRef = useRef();

  const { data } = useData();

  const formatElapsedTime = (timestamp) => {
    const orderTime = timestamp.toDate();
    return formatDistanceToNow(orderTime,
      { locale: ptBR },
      { includeSeconds: true, addSuffix: true });
  };


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
        //email: claims?.email || 'n/d'
        email: userListenStatus.name,
        createdAt: Timestamp.now(),
      })
    }

    //const orderId =
    await updateDocument(claims.merchantId, 'order', orderId, order);

  }



  const statusList = [...data.kds.order_status];
  const hasCFM = statusList.some((s) => s.id === 'CFM');
  const hasSPE = statusList.some((s) => s.id === 'SPE');

  const filtered = statusList.filter((f) => {
    if (f.id === 'DIS' || f.id === 'CON') return false;
    if (hasCFM && f.id === 'PLC') return false;
    if (hasSPE && f.id === 'RTP') return false;
    return true;
  });



  var color = 'success.light';

  if (elapsedSeconds > 60) {
    color = 'warning.light';
  }

  if (elapsedSeconds > 120) {
    color = 'error.light'
  }



  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(row.createdAt));

      setElapsedSeconds(Date.now() / 1000 - row.createdAt.seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [row.createdAt]);


  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);


  return (
    <Box display={'flex'} flexDirection={'column'} width={'100%'} justifyItems={'center'}>

      <React.Fragment>
        <Dialog
          open={dialog.open}
          onClose={() => setOpenToCancel(false)}
        >
          <DialogTitle>Informe o motivo do cancelamento</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
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


      <Paper variant='outlined' elevation={0} sx={{ p: 1 }}>
        <Stack flexGrow={1}>
          <Stack direction='row' flexGrow={1} justifyContent='space-between'>
            <Typography variant='button' color='text.primary'>
              {`${row.name}`}
            </Typography>
            <Typography variant='button' color='text.primary'>
              {`${row.qty_order} un`}
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
                    {`${o.count} un`}
                  </Typography>
                </Stack>
              ))}
            </Grid>
          }

          <Typography variant='body2' color='text.primary'>
            {row.remarks ? `* ${row.remarks}` : ''}
          </Typography>

          {elapsedSeconds > 60 &&
            <Stack direction='row' flexGrow={1} justifyContent='start' pt={1}>
              <Typography variant='body2' color={color}>
                {`${elapsedTime}`}
              </Typography>
            </Stack>
          }

        </Stack>

        <Grid container justifyContent={'space-between'} mt={0.5} gap={1}>
          {
            filtered
              .sort((a, b) => a.sequence - b.sequence)
              .map((s, index) => {
                if (s.id === 'CAR') return null
                if (row.status === 'RTP' && s.id === 'CAN') return null

                const showColor = row.status_hist.some(h => h.id === s.id && !h.reverted);

                const isClickable = !showColor && (s.id === 'SPS' || s.id === 'RTP' || s.id === 'CAN');


                return (
                  <Chip
                    key={s.id}
                    label={s.id === 'CAN' && row.status === 'CAN' ? 'Cancelado' : s.label_kds}
                    clickable={isClickable}
                    sx={{
                      cursor: isClickable ? 'pointer' : 'default',
                      fontStyle: !isClickable && showColor ? 'italic' : 'normal',
                      textDecoration: !isClickable && showColor ? 'line-through' : 'none'
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
  )
}



export default function DisplayCozinha() {

  const { data } = useData();

  const { fetching, error, claims, userListenStatus } = useKdsFetcher();

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container>
      <Grid container direction={'row'} size={12} spacing={2} alignItems={'start'}>

        {data.kds.order
          .map(row => (
            <Grid key={row.tableId} size={{ xs: 12, sm: 6 }}>
              <Paper variant='outlined'>
                <Typography mb={1} mt={1} textAlign={'center'} variant='h6'>
                  {`Mesa: ${row.tableId}`}
                </Typography>

                <List>
                  {row.item
                    .map((row, index) => (
                      <ListItem key={row.orderId} sx={{ mb: 1 }}>
                        <OrderData row={row} claims={claims} userListenStatus={userListenStatus} />
                      </ListItem>
                    ))}
                </List>
              </Paper>
            </Grid>
          ))
        }
      </Grid>

      {!data.kds.order.length &&
        <Grid container>
          <Typography variant='button'>
            Aguardando pedidos..
          </Typography>
        </Grid>
      }


    </Grid >
  );
}

