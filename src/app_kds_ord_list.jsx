import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { Alert, Box, Chip, Grid, LinearProgress } from '@mui/material';
import { fetchCollection, updateDocument, useKdsUser } from './api';
import { useData } from './context';
import { Timestamp } from 'firebase/firestore';
import { Restore } from '@mui/icons-material';
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { useDialogs } from '@toolpad/core';






const useKdsFetcher = () => {
  const { data, setData } = useData();
  const { claims, loading, userListenStatus } = useKdsUser();
  const [state, setState] = useState({ fetching: true, error: null });

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
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'order', { 'status': ['SPS', 'RTP', 'CAN'] },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          kds: {
            ...state.kds,
            order_hist: [...data]
          }
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [data.kds.order_status, loading, claims, setData]);



  return { ...state, claims, userListenStatus };
};




function Row(props) {
  const { row, claims, userListenStatus } = props;

  const dialogs = useDialogs();



  const handleChangeOrderStatus = async (order) => {
    if (!order?.status_hist?.length) return;

    const newHist = [...order.status_hist]
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())

    const lastIndex = newHist.length - 1;
    newHist[lastIndex] = {
      ...newHist[lastIndex],
      reverted: true,
    };

    if (newHist.length < 2) return;

    const penultimo = newHist[newHist.length - 2];

    const confirmed = await dialogs.confirm(`Deseja realmente voltar o status para: ${penultimo.label_kds}`, {
      okText: 'Sim',
      cancelText: 'Não',
      severity: 'warning',
      title:'Confirmar'
    });
    if (confirmed) {


      newHist.push({
        ...penultimo,
        createdAt: Timestamp.now(),
        email: userListenStatus.name,
      });

      await updateDocument(claims.merchantId, 'order', order.orderId, {
        status: penultimo.id,
        status_hist: newHist,
      });

    }

  };


  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton color='warning' variant='outlined'
            onClick={() => handleChangeOrderStatus(row)}
          >
            <Restore />
          </IconButton>
        </TableCell>
        <TableCell align='right'>{row.table.tableId}</TableCell>
        <TableCell>
          <Typography>
            {row.name}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={`${row.status_hist[row.status_hist.length - 1].label}`}
            color={row.status_hist[row.status_hist.length - 1].color}
            onClick={() => { }}
          />
        </TableCell>

      </TableRow>
    </React.Fragment>
  );
}







export default function KdsHist() {

  const { data } = useData();

  const { claims, error, fetching, userListenStatus } = useKdsFetcher();

  const orders = data.kds.order_hist
    .filter(k => !!k.kds)
    .filter((o) => {
      if (userListenStatus?.kds) {
        return o.kds.kdsId === userListenStatus.kds.kdsId
      } else {
        return true
      }
    })

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container flexGrow={1} p={0}>
      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Desfazer</TableCell>
              <TableCell>Mesa</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !orders.length ?
                <TableRow>
                  <TableCell align='center' colSpan={4}>Nenhum registro</TableCell>
                </TableRow>
                :
                orders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map((row) => (
                  <Row key={row.orderId} row={row} claims={claims} userListenStatus={userListenStatus} />
                ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
